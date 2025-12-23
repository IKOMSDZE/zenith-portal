
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Icons } from '../constants';
import { User, VacationRecord, VacationStatus, View } from '../types';
import { Database, SystemSettings, DEFAULT_ROLE_PERMISSIONS } from '../services/database';
import { orderBy, where, QueryConstraint } from 'firebase/firestore';

interface VacationManagementProps {
  user: User;
  settings: SystemSettings;
}

const VACATION_TYPES = [
  { label: 'კუთვნილი შვებულება', subtracts: true },
  { label: 'ბიულეტინი', subtracts: false },
  { label: 'ბონუს დღე', subtracts: false },
  { label: 'დეკრეტული შვებულება', subtracts: false },
  { label: 'უხელფასო შვებულება', subtracts: false }
];

const VacationManagement: React.FC<VacationManagementProps> = ({ 
  user, settings
}) => {
  const [vacations, setVacations] = useState<VacationRecord[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'requests'>('my');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filtering states
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(user.id);
  const searchRef = useRef<HTMLDivElement>(null);

  const [vacationForm, setVacationForm] = useState({ 
    startDate: '', 
    endDate: '', 
    workingDays: 0, 
    calendarDays: 0, 
    reason: 'კუთვნილი შვებულება', 
    replacementPerson: '',
    managerNote: '' 
  });

  const hasPermission = (view: View) => {
    if (user.role === 'Admin') return true;
    const rolePerms = settings.rolePermissions?.[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    return rolePerms.includes(view);
  };

  const showRequestsTab = hasPermission(View.VACATION_REQUESTS);
  const showForm = hasPermission(View.VACATION_FORM);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const empRes = await Database.getEmployees(200);
      setEmployees(empRes.data);

      const constraints: QueryConstraint[] = [];
      if (user.role !== 'Admin' && user.role !== 'Manager' && user.role !== 'HR') {
        constraints.push(where('employeeId', '==', user.id));
      }
      constraints.push(orderBy('startDate', 'desc'));
      
      const vacRes = await Database.getVacations(constraints);
      setVacations(vacRes);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedEmployee = useMemo(() => 
    employees.find(e => e.id === selectedEmpId) || user, 
    [employees, selectedEmpId, user]
  );

  const filteredEmployees = useMemo(() => 
    employees.filter(e => 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.id.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [employees, searchTerm]
  );

  const isReplacementEnabled = useMemo(() => {
    return (settings.replacementEnabledDepartments || []).includes(selectedEmployee.department);
  }, [settings.replacementEnabledDepartments, selectedEmployee.department]);

  const userBalance = selectedEmployee.vacationDaysTotal - selectedEmployee.vacationDaysUsed;
  
  const isInsufficient = useMemo(() => {
    const type = VACATION_TYPES.find(r => r.label === vacationForm.reason);
    if (!type?.subtracts) return false;
    return vacationForm.workingDays > userBalance;
  }, [vacationForm.reason, vacationForm.workingDays, userBalance]);

  const handleVacationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInsufficient || !user.uid) return;

    setIsSyncing(true);
    const newRec: VacationRecord = {
      id: `VAC-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      employeeId: selectedEmployee.id,
      uid: selectedEmployee.uid || '', 
      employeeName: selectedEmployee.name,
      startDate: vacationForm.startDate,
      endDate: vacationForm.endDate,
      workingDays: Number(vacationForm.workingDays),
      calendarDays: Number(vacationForm.calendarDays),
      reason: vacationForm.reason,
      replacementPerson: vacationForm.replacementPerson,
      changer: user.name,
      manager: '',
      status: 'Pending'
    };

    try {
      await Database.saveVacation(newRec);
      setVacationForm({ 
        startDate: '', 
        endDate: '', 
        workingDays: 0, 
        calendarDays: 0, 
        reason: 'კუთვნილი შვებულება', 
        replacementPerson: '',
        managerNote: '' 
      });
      await fetchData(); 
      alert("მოთხოვნა წარმატებით გაიგზავნა.");
    } catch (err) {
      console.error(err);
      alert("შეცდომა გაგზავნისას.");
    } finally {
      setIsSyncing(false);
    }
  };

  const updateStatus = async (id: string, stat: VacationStatus) => {
    const v = vacations.find(x => x.id === id);
    if (!v) return;

    setIsSyncing(true);
    try {
      const type = VACATION_TYPES.find(r => r.label === v.reason);
      const emp = employees.find(e => e.id === v.employeeId);

      if (stat === 'Approved' && v.status !== 'Approved' && emp && type?.subtracts) {
        const updatedEmp = { ...emp, vacationDaysUsed: (emp.vacationDaysUsed || 0) + v.workingDays };
        await Database.setEmployees([updatedEmp]);
      } else if (stat !== 'Approved' && v.status === 'Approved' && emp && type?.subtracts) {
        const updatedEmp = { ...emp, vacationDaysUsed: Math.max(0, (emp.vacationDaysUsed || 0) - v.workingDays) };
        await Database.setEmployees([updatedEmp]);
      }
      
      const updatedRec = { ...v, status: stat, changer: user.name };
      await Database.saveVacation(updatedRec);
      await fetchData(); 
    } catch (err) {
      console.error(err);
      alert("შეცდომა სტატუსის განახლებისას");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    const v = vacations.find(x => x.id === id);
    if (!v) return;

    if (window.confirm("ნამდვილად გსურთ ამ ჩანაწერის წაშლა?")) {
      setIsSyncing(true);
      try {
        if (v.status === 'Approved') {
          const type = VACATION_TYPES.find(r => r.label === v.reason);
          const emp = employees.find(e => e.id === v.employeeId);
          if (emp && type?.subtracts) {
            const updatedEmp = { ...emp, vacationDaysUsed: Math.max(0, (emp.vacationDaysUsed || 0) - v.workingDays) };
            await Database.setEmployees([updatedEmp]);
          }
        }
        await Database.deleteVacation(id);
        await fetchData();
      } catch (err) {
        console.error(err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const printDocument = (v: VacationRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>შვებულების განაცხადი - ${v.employeeName}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; margin-bottom: 50px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .field { border-bottom: 1px solid #f1f5f9; padding: 12px 5px; margin-bottom: 10px; display: flex; justify-content: space-between; }
            .label { font-weight: 800; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
            .value { font-weight: 700; font-size: 14px; }
            .footer { margin-top: 100px; display: flex; justify-content: space-between; padding-top: 40px; border-top: 1px dashed #cbd5e1; }
            .sign-box { text-align: center; width: 200px; }
            .sign-line { border-top: 1px solid #000; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
             <h2 style="margin:0; text-transform:uppercase; font-weight:900;">შვებულების განაცხადი</h2>
             <p style="margin:0; color:#94a3b8; font-weight:700;">ID: ${v.id}</p>
          </div>
          <div class="field"><span class="label">თანამშრომელი:</span> <span class="value">${v.employeeName}</span></div>
          <div class="field"><span class="label">პერიოდი:</span> <span class="value">${v.startDate} — ${v.endDate}</span></div>
          <div class="field"><span class="label">ტიპი:</span> <span class="value">${v.reason}</span></div>
          <div class="field"><span class="label">დღეები:</span> <span class="value">სამუშაო: ${v.workingDays} / კალენდარული: ${v.calendarDays}</span></div>
          <div class="field"><span class="label">შემცვლელი:</span> <span class="value">${v.replacementPerson || '—'}</span></div>
          <div class="field"><span class="label">დამდასტურებელი:</span> <span class="value">${v.changer}</span></div>
          
          <div class="footer">
             <div class="sign-box">
                <div class="sign-line"></div>
                <span class="label">თანამშრომლის ხელმოწერა</span>
             </div>
             <div class="sign-box">
                <div class="sign-line"></div>
                <span class="label">ადმინისტრაციის ხელმოწერა</span>
             </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const pendingCount = vacations.filter(v => v.status === 'Pending').length;
  
  const filteredVacations = useMemo(() => {
    let base = activeTab === 'my' 
      ? vacations.filter(v => v.employeeId === user.id)
      : vacations;

    if (filterStartDate) {
      base = base.filter(v => v.startDate >= filterStartDate);
    }
    if (filterEndDate) {
      base = base.filter(v => v.startDate <= filterEndDate);
    }

    return base;
  }, [vacations, activeTab, user.id, filterStartDate, filterEndDate]);

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">მონაცემები იტვირთება...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
             <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">შვებულების მართვა</h2>
             {isSyncing && <div className="w-4 h-4 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>}
          </div>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">ადმინისტრირება და დოკუმენტაცია</p>
        </div>
        
        {showRequestsTab && (
          <div className="flex bg-slate-100 p-1 rounded-[5px] border border-slate-200">
            <button onClick={() => { setActiveTab('my'); clearFilters(); }} className={`px-4 py-1.5 rounded-[3px] text-[10px] font-black uppercase transition-all ${activeTab === 'my' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ჩემი შვებულება</button>
            <button onClick={() => { setActiveTab('requests'); clearFilters(); }} className={`px-4 py-1.5 rounded-[3px] text-[10px] font-black uppercase transition-all relative ${activeTab === 'requests' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              მოთხოვნები
              {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] rounded-full flex items-center justify-center font-black animate-pulse">{pendingCount}</span>}
            </button>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 ${showForm && activeTab === 'my' ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6`}>
        {activeTab === 'my' && (
          <div className={`${showForm ? 'lg:col-span-4' : 'w-full'} space-y-6`}>
            <div className="bg-indigo-600 rounded-[5px] p-6 text-white shadow-xl relative overflow-hidden group">
               <div className="relative z-10">
                  <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">ხელმისაწვდომი დღეები</p>
                  <h4 className="text-4xl font-black">{userBalance} <span className="text-sm font-medium opacity-60">დღე</span></h4>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                     <div className="text-center"><p className="text-[8px] font-black uppercase opacity-60">ლიმიტი</p><p className="text-sm font-black">{selectedEmployee.vacationDaysTotal}</p></div>
                     <div className="text-center"><p className="text-[8px] font-black uppercase opacity-60">გამოყენებული</p><p className="text-sm font-black">{selectedEmployee.vacationDaysUsed}</p></div>
                  </div>
               </div>
               <div className="absolute -right-4 -bottom-4 opacity-10 scale-[2] group-hover:rotate-12 transition-transform duration-500"><Icons.Calendar /></div>
            </div>

            {showForm && (
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase text-slate-800 tracking-widest">ბოლო სტატუსი</h3>
                  <Icons.Clock />
                </div>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {vacations.filter(v => v.employeeId === user.id).slice(0, 5).map(v => (
                    <div key={v.id} className="p-5 hover:bg-slate-50 transition-colors group">
                       <div className="flex justify-between items-start mb-2">
                          <div>
                             <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{v.reason}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{v.startDate} — {v.endDate}</p>
                          </div>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-[3px] uppercase ${v.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : v.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                             {v.status === 'Approved' ? 'OK' : v.status === 'Rejected' ? 'NO' : '...'}
                          </span>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showForm && activeTab === 'my' && (
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-slate-900">შვებულების მოთხოვნა</h3>
                <Icons.Edit />
              </div>
              <form onSubmit={handleVacationSubmit} className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2">თანამშრომლის არჩევა</h5>
                    <div className="space-y-3">
                      <div className="relative" ref={searchRef}>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">თანამშრომელი *</label>
                          <div 
                            onClick={() => setIsSearchOpen(true)}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-[5px] text-xs font-black text-slate-900 flex items-center justify-between cursor-pointer focus:border-indigo-600 hover:bg-slate-50 transition-colors"
                          >
                            <span className="truncate">{selectedEmployee.name} ({selectedEmployee.id})</span>
                            <Icons.Search />
                          </div>
                          {isSearchOpen && (
                            <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-[5px] shadow-2xl mt-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                              <div className="p-2 border-b border-slate-50">
                                  <input autoFocus type="text" placeholder="ჩაწერეთ სახელი ან ID..." className="w-full p-2.5 text-xs font-bold bg-slate-50 border-none outline-none rounded" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                              </div>
                              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                  {filteredEmployees.map(e => (
                                    <div key={e.id} onClick={() => { setSelectedEmpId(e.id); setIsSearchOpen(false); setSearchTerm(''); }} className="p-3 text-[11px] font-bold hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center" >
                                      <span className="uppercase">{e.name}</span>
                                      <span className="text-[9px] text-slate-400 font-black">ID: {e.id}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                      </div>
                      {isReplacementEnabled && (
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">შემცვლელი პირი</label>
                          <input type="text" value={vacationForm.replacementPerson} onChange={e => setVacationForm({...vacationForm, replacementPerson: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600" placeholder="სახელი, გვარი" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2">შვებულების დეტალები</h5>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest block mb-1">დან</label>
                            <input type="date" required value={vacationForm.startDate} onChange={e => setVacationForm({...vacationForm, startDate: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600" />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest block mb-1">მდე</label>
                            <input type="date" required value={vacationForm.endDate} onChange={e => setVacationForm({...vacationForm, endDate: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600" />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-[9px] font-black text-slate-900 uppercase tracking-widest block mb-1">კალენდარული</label><input type="number" required value={vacationForm.calendarDays || ''} onChange={e => setVacationForm({...vacationForm, calendarDays: Number(e.target.value)})} className="w-full border border-slate-200 p-2.5 rounded-[5px] text-xs font-black outline-none" placeholder="0" /></div>
                          <div><label className="text-[9px] font-black text-slate-900 uppercase tracking-widest block mb-1">სამუშაო</label><input type="number" required value={vacationForm.workingDays || ''} onChange={e => setVacationForm({...vacationForm, workingDays: Number(e.target.value)})} className={`w-full border p-2.5 rounded-[5px] text-xs font-black outline-none ${isInsufficient ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 focus:border-indigo-600'}`} placeholder="0" /></div>
                      </div>
                      <div>
                          <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest block mb-1">ტიპი</label>
                          <select value={vacationForm.reason} onChange={e => setVacationForm({...vacationForm, reason: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-[5px] text-xs font-black outline-none bg-white">
                            {VACATION_TYPES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                          </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex items-center justify-between gap-6">
                  <div className="text-slate-400 text-[10px] font-medium max-w-sm italic leading-tight uppercase">
                      {isInsufficient ? <span className="text-rose-500 font-black flex items-center gap-1"><Icons.Alert /> არასაკმარისი ბალანსი!</span> : "შეამოწმეთ მონაცემები შენახვამდე"}
                  </div>
                  <button type="submit" disabled={isInsufficient || isSyncing || !vacationForm.startDate || !vacationForm.endDate || !vacationForm.workingDays} className="px-12 py-4 bg-slate-900 text-white rounded-[5px] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50">
                    {isSyncing ? 'ინახება...' : 'გაგზავნა'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {(activeTab === 'requests' || (!showForm && activeTab === 'my')) && (
          <div className="space-y-4">
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ფილტრი:</span>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-1.5 text-[10px] font-black outline-none focus:border-indigo-600" />
                <span className="text-slate-300">—</span>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-1.5 text-[10px] font-black outline-none focus:border-indigo-600" />
              </div>
              {(filterStartDate || filterEndDate) && (
                <button onClick={clearFilters} className="text-[9px] font-black text-rose-500 uppercase hover:underline">გასუფთავება</button>
              )}
            </div>

            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest">{activeTab === 'my' ? 'ისტორია' : 'მოთხოვნები'}</h3>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ნაჩვენებია {filteredVacations.length} ჩანაწერი</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100">
                    <tr><th className="px-6 py-4">თანამშრომელი</th><th className="px-6 py-4">პერიოდი</th><th className="px-6 py-4">დღეები</th><th className="px-6 py-4">ტიპი</th><th className="px-6 py-4 text-center">სტატუსი</th><th className="px-6 py-4 text-right">ქმედება</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVacations.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50/50 group">
                        <td className="px-6 py-4"><p className="text-[11px] font-black text-slate-900 uppercase">{v.employeeName}</p><p className="text-[9px] text-slate-400 font-bold uppercase mt-1">ID: {v.employeeId}</p></td>
                        <td className="px-6 py-4"><p className="text-[11px] font-black text-slate-700">{v.startDate} — {v.endDate}</p></td>
                        <td className="px-6 py-4"><p className="text-[10px] font-black text-slate-900 uppercase">სამ: {v.workingDays} / კალ: {v.calendarDays}</p></td>
                        <td className="px-6 py-4"><span className="text-[9px] font-black text-indigo-500 uppercase">{v.reason}</span></td>
                        <td className="px-6 py-4 text-center">
                           <span className={`inline-block text-[8px] font-black px-3 py-1 rounded-[4px] uppercase border shadow-sm ${v.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : v.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                             {v.status === 'Approved' ? 'დადასტურდა' : v.status === 'Rejected' ? 'უარყოფილა' : 'მოლოდინში'}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {activeTab === 'requests' && v.status === 'Pending' && (
                              <>
                                <button onClick={() => updateStatus(v.id, 'Approved')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded transition-all shadow-sm"><Icons.Check /></button>
                                <button onClick={() => updateStatus(v.id, 'Rejected')} className="p-2 text-rose-600 hover:bg-rose-50 rounded transition-all shadow-sm"><Icons.X /></button>
                              </>
                            )}
                            {v.status === 'Approved' && <button onClick={() => printDocument(v)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-all shadow-sm"><Icons.Newspaper /></button>}
                            {(v.employeeId !== user.id || user.role === 'Admin') && (
                              <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-300 hover:text-rose-600 rounded transition-all"><Icons.Trash /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredVacations.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-300 font-black text-[10px] uppercase tracking-widest italic">ჩანაწერები არ მოიძებნა</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VacationManagement;
