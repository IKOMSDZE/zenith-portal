
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Icons } from '../constants';
import { User, VacationRecord, VacationStatus, View } from '../types';
import { Database, SystemSettings, DEFAULT_ROLE_PERMISSIONS } from '../services/database';

interface VacationManagementProps {
  user: User;
  employees: User[];
  onUpdateEmployees: (newEmployees: User[]) => Promise<void>;
  vacations: VacationRecord[];
  onSaveVacation: (vacation: VacationRecord) => Promise<void>;
  onDeleteVacation: (id: string) => Promise<void>;
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
  user, employees, onUpdateEmployees, vacations, onSaveVacation, onDeleteVacation, settings
}) => {
  const hasPermission = (view: View) => {
    if (user.role === 'Admin') return true;
    const rolePerms = settings.rolePermissions?.[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    return rolePerms.includes(view);
  };

  const showRequestsTab = hasPermission(View.VACATION_REQUESTS);
  const showForm = hasPermission(View.VACATION_FORM);
  
  const [activeTab, setActiveTab] = useState<'my' | 'requests'>('my');
  const [isSyncing, setIsSyncing] = useState(false);
  
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
    employees.find(e => (e.uid || e.id) === selectedEmpId) || user, 
    [employees, selectedEmpId, user]
  );

  const filteredEmployees = useMemo(() => 
    employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.id.toLowerCase().includes(searchTerm.toLowerCase())),
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
    if (isInsufficient) return;

    setIsSyncing(true);
    const newRec: VacationRecord = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      startDate: vacationForm.startDate,
      endDate: vacationForm.endDate,
      workingDays: Number(vacationForm.workingDays),
      calendarDays: Number(vacationForm.calendarDays),
      reason: vacationForm.reason,
      ...(isReplacementEnabled && vacationForm.replacementPerson && {
        replacementPerson: vacationForm.replacementPerson
      }),
      changer: user.name,
      manager: vacationForm.managerNote,
      status: 'Pending'
    };

    try {
      await onSaveVacation(newRec);
      setVacationForm({ 
        startDate: '', 
        endDate: '', 
        workingDays: 0, 
        calendarDays: 0, 
        reason: 'კუთვნილი შვებულება', 
        replacementPerson: '',
        managerNote: '' 
      });
      alert("მოთხოვნა წარმატებით გაიგზავნა და სინქრონიზებულია.");
    } catch (err) {
      console.error(err);
      alert("შეცდომა სინქრონიზაციისას.");
    } finally {
      setIsSyncing(false);
    }
  };

  const updateStatus = async (id: string, stat: VacationStatus) => {
    const v = vacations.find(x => x.id === id);
    if (!v) return;

    setIsSyncing(true);
    try {
      if (stat === 'Approved' && v.status !== 'Approved') {
        const type = VACATION_TYPES.find(r => r.label === v.reason);
        if (type?.subtracts) {
          await onUpdateEmployees(employees.map(e => e.id === v.employeeId ? { ...e, vacationDaysUsed: (e.vacationDaysUsed || 0) + v.workingDays } : e));
        }
      } else if (stat !== 'Approved' && v.status === 'Approved') {
        // Restore balance if changing from Approved to something else
        const type = VACATION_TYPES.find(r => r.label === v.reason);
        if (type?.subtracts) {
          await onUpdateEmployees(employees.map(e => e.id === v.employeeId ? { ...e, vacationDaysUsed: Math.max(0, (e.vacationDaysUsed || 0) - v.workingDays) } : e));
        }
      }
      
      const updatedRec = { ...v, status: stat, changer: user.name };
      await onSaveVacation(updatedRec);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    const v = vacations.find(x => x.id === id);
    if (!v) return;

    // RULE: Users cannot delete their own vacation unless they are Admin
    if (v.employeeId === user.id && user.role !== 'Admin') {
      alert("საკუთარი შვებულების ჩანაწერის წაშლა შეზღუდულია. გთხოვთ მიმართოთ ადმინისტრაციას.");
      return;
    }

    if (window.confirm("ნამდვილად გსურთ ამ ჩანაწერის წაშლა?")) {
      setIsSyncing(true);
      try {
        // Restore days if deleted record was already approved
        if (v.status === 'Approved') {
          const type = VACATION_TYPES.find(r => r.label === v.reason);
          if (type?.subtracts) {
            await onUpdateEmployees(employees.map(e => e.id === v.employeeId ? { ...e, vacationDaysUsed: Math.max(0, (e.vacationDaysUsed || 0) - v.workingDays) } : e));
          }
        }
        await onDeleteVacation(id);
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

    const isEarned = v.reason === 'კუთვნილი შვებულება' ? '✔' : '';
    const isMaternity = v.reason === 'დეკრეტული შვებულება' ? '✔' : '';
    const isSick = v.reason === 'ბიულეტინი' ? '✔' : '';
    const isUnpaid = v.reason === 'უხელფასო შვებულება' ? '✔' : '';
    const isBonus = v.reason === 'ბონუს დღე' ? '✔' : '';

    const fontStyles = `
      ${settings.headerFont ? `@font-face { font-family: 'HeaderFont'; src: url('${settings.headerFont.data}') format('${settings.headerFont.format}'); font-weight: bold; }` : ''}
      ${settings.bodyFont ? `@font-face { font-family: 'BodyFont'; src: url('${settings.bodyFont.data}') format('${settings.bodyFont.format}'); font-weight: normal; }` : ''}
      
      body { 
        font-family: ${settings.bodyFont ? "'BodyFont'" : "'Inter'"}, sans-serif; 
        padding: 60px; color: #000; line-height: 1.2; background: #fff;
      }
      .label-text { 
        font-family: ${settings.headerFont ? "'HeaderFont'" : "'Inter'"}, sans-serif; 
        font-size: 14px; 
        font-weight: bold; 
        text-transform: uppercase;
      }
      .value-text {
        font-family: ${settings.bodyFont ? "'BodyFont'" : "'Inter'"}, sans-serif;
        font-size: 15px;
        font-weight: 600;
      }
    `;

    const html = `
      <html>
        <head>
          <title>შვებულების განაცხადი - ${v.employeeName}</title>
          <style>
            ${fontStyles}
            * { box-sizing: border-box; }
            .container { width: 100%; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 80px; }
            .logo { height: 70px; }
            .header-info { text-align: right; }
            .co-name { font-weight: bold; font-size: 16px; margin-bottom: 4px; }
            .form-title { font-size: 14px; color: #555; font-weight: bold; text-transform: uppercase; }
            .field-row { display: flex; align-items: flex-end; margin-bottom: 35px; }
            .field-label { min-width: 290px; font-size: 14px; font-weight: bold; text-transform: uppercase; }
            .field-underline { flex: 1; border-bottom: 1.5px solid #000; padding: 0 10px 4px 10px; min-height: 25px; }
            .date-block { display: flex; align-items: flex-end; margin-bottom: 35px; }
            .date-box { border-bottom: 1.5px solid #000; width: 130px; text-align: center; font-weight: bold; padding-bottom: 4px; font-size: 14px; }
            .date-sep { margin: 0 20px; font-weight: bold; text-transform: uppercase; font-size: 14px; }
            .days-info { display: flex; align-items: flex-end; margin-bottom: 40px; }
            .day-label { font-size: 13px; font-weight: bold; margin-right: 15px; text-transform: uppercase; }
            .day-box { border-bottom: 1.5px solid #000; width: 50px; text-align: center; font-weight: bold; padding-bottom: 4px; margin-right: 30px; font-size: 15px; }
            .types-section { display: flex; margin-bottom: 40px; }
            .types-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex: 1; }
            .type-item { display: flex; align-items: center; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .check-box { width: 18px; height: 18px; border: 1.5px solid #000; margin-right: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; }
            .signature-area { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
            .sig-col { width: 45%; }
            .sig-label { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
            .sig-line { border-bottom: 1.5px solid #000; height: 40px; display: flex; align-items: flex-end; padding-bottom: 4px; font-weight: bold; justify-content: center; }
            .manager-approval { margin-top: 100px; }
            .manager-title { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px; line-height: 1.4; }
            .manager-grid { display: flex; gap: 50px; }
            .manager-line { border-bottom: 1.5px solid #000; width: 280px; height: 35px; display: flex; align-items: flex-end; padding: 0 10px 4px 10px; font-weight: bold; font-size: 14px; }
            .manager-caption { font-size: 10px; color: #888; font-style: italic; margin-top: 6px; }
            @media print { body { padding: 40px; } @page { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${settings.logoUrl || ''}" class="logo" />
              <div class="header-info">
                <div class="co-name">შპ.ს ბიუთი ჰაბი</div>
                <div class="form-title">შვებულების განაცხადის ფორმა</div>
              </div>
            </div>
            <div class="field-row">
              <div class="field-label">თანამშრომლის სახელი და გვარი</div>
              <div class="field-underline value-text">${v.employeeName}</div>
            </div>
            <div class="field-row">
              <div class="field-label">თანამდებობა</div>
              <div class="field-underline value-text">${employees.find(e => e.id === v.employeeId)?.position || '—'}</div>
            </div>
            <div class="date-block">
              <div class="field-label">შვებულების თარიღი</div>
              <div class="date-box value-text">${v.startDate.split('-').reverse().join('/')}</div>
              <div class="date-sep">დან</div>
              <div class="date-box value-text">${v.endDate.split('-').reverse().join('/')}</div>
              <div class="date-sep">ჩათვლით</div>
            </div>
            <div class="days-info">
              <div class="field-label">გამოყენებული დღეების რაოდ.</div>
              <div class="day-label">სამუშაო დღე</div>
              <div class="day-box value-text">${v.workingDays}</div>
              <div class="day-label">კალენდარული დღე</div>
              <div class="day-box value-text">${v.calendarDays}</div>
            </div>
            <div class="types-section">
              <div class="field-label">შვებულების ტიპი</div>
              <div class="types-grid">
                <div class="type-item"><div class="check-box">${isEarned}</div> კუთვნილი შვებულება</div>
                <div class="type-item"><div class="check-box">${isMaternity}</div> დეკრეტული შვებულება</div>
                <div class="type-item"><div class="check-box">${isSick}</div> ბიულეტინი</div>
                <div class="type-item"><div class="check-box">${isUnpaid}</div> უხელფასო შვებულება</div>
                <div class="type-item"><div class="check-box">${isBonus}</div> ბონუს დღე</div>
              </div>
            </div>
            <div class="field-row" style="margin-bottom: 50px;">
              <div class="field-label">შემცვლელი პირი</div>
              <div class="field-underline value-text">${v.replacementPerson || '—'}</div>
            </div>
            <div class="signature-area">
              <div class="sig-col" style="width: 55%;">
                <div class="sig-label">თანამშრომლის ხელმოწერა</div>
                <div class="sig-line"></div>
              </div>
              <div class="sig-col" style="width: 35%;">
                <div class="sig-label">თარიღი</div>
                <div class="sig-line value-text">${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}</div>
              </div>
            </div>
            <div class="manager-approval">
              <div class="manager-title">დამტიცებულია უშუალო<br/>ხელმძღვანელის მიერ</div>
              <div class="manager-grid">
                <div class="manager-line value-text">${v.changer}</div>
                <div class="manager-line"></div>
              </div>
              <div style="display: flex; gap: 50px;">
                <div class="manager-caption" style="width: 280px;">სახელი, გვარი/ხელმოწერა</div>
              </div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const pendingCount = vacations.filter(v => v.status === 'Pending').length;
  const userVacations = useMemo(() => 
    vacations.filter(v => v.employeeId === user.id).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [vacations, user.id]
  );

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
            <button onClick={() => setActiveTab('my')} className={`px-4 py-1.5 rounded-[3px] text-[10px] font-black uppercase transition-all ${activeTab === 'my' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ჩემი შვებულება</button>
            <button onClick={() => setActiveTab('requests')} className={`px-4 py-1.5 rounded-[3px] text-[10px] font-black uppercase transition-all relative ${activeTab === 'requests' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              მოთხოვნები
              {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] rounded-full flex items-center justify-center font-black animate-pulse">{pendingCount}</span>}
            </button>
          </div>
        )}
      </div>

      {activeTab === 'my' || !showRequestsTab ? (
        <div className={`grid grid-cols-1 ${showForm ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6`}>
          <div className={`${showForm ? 'lg:col-span-4' : 'w-full'} space-y-6`}>
            <div className={`bg-indigo-600 rounded-[5px] p-6 text-white shadow-xl relative overflow-hidden group ${!showForm ? 'md:flex md:items-center md:justify-between' : ''}`}>
               <div className="relative z-10">
                  <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">ხელმისაწვდომი დღეები</p>
                  <h4 className="text-4xl font-black">{userBalance} <span className="text-sm font-medium opacity-60">დღე</span></h4>
                  <div className={`mt-4 pt-4 border-t border-white/10 flex justify-between ${!showForm ? 'md:border-t-0 md:mt-0 md:pt-0 md:ml-10 md:gap-10' : ''}`}>
                     <div className="text-center"><p className="text-[8px] font-black uppercase opacity-60">ლიმიტი</p><p className="text-sm font-black">{selectedEmployee.vacationDaysTotal}</p></div>
                     <div className="text-center"><p className="text-[8px] font-black uppercase opacity-60">გამოყენებული</p><p className="text-sm font-black">{selectedEmployee.vacationDaysUsed}</p></div>
                  </div>
               </div>
               <div className="absolute -right-4 -bottom-4 opacity-10 scale-[2] group-hover:rotate-12 transition-transform duration-500"><Icons.Calendar /></div>
            </div>

            {!showForm && (
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
                    <Icons.Newspaper /> შვებულების სრული ისტორია
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[8px] font-black uppercase border-b border-slate-100 tracking-widest">
                        <th className="px-6 py-4">თარიღი / პერიოდი</th>
                        <th className="px-6 py-4">ტიპი</th>
                        <th className="px-6 py-4">დღეები</th>
                        <th className="px-6 py-4">შემცვლელი</th>
                        <th className="px-6 py-4">სტატუსი</th>
                        <th className="px-6 py-4 text-right">ქმედება</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {userVacations.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-5">
                            <p className="text-[11px] font-black text-slate-900 leading-none">{v.startDate} — {v.endDate}</p>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase">{v.reason}</span>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-[10px] font-black text-slate-700 uppercase">სამუშაო: {v.workingDays}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">კალენდ: {v.calendarDays}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-[10px] font-bold text-slate-600 uppercase">{v.replacementPerson || '—'}</p>
                          </td>
                          <td className="px-6 py-5">
                             <span className={`text-[8px] font-black px-2 py-1 rounded-[3px] uppercase ${v.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : v.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                               {v.status === 'Approved' ? 'დადასტურდა' : v.status === 'Rejected' ? 'უარყოფილა' : 'მოლოდინში'}
                             </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                             <div className="flex justify-end gap-3">
                               {v.status === 'Approved' && <button onClick={() => printDocument(v)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="ბეჭდვა"><Icons.Newspaper /></button>}
                               { (v.employeeId !== user.id || user.role === 'Admin') && (
                                 <button onClick={() => handleDelete(v.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors" title="წაშლა"><Icons.Trash /></button>
                               )}
                             </div>
                          </td>
                        </tr>
                      ))}
                      {userVacations.length === 0 && (
                        <tr><td colSpan={6} className="p-16 text-center text-slate-300 font-black text-[10px] uppercase tracking-widest italic">ისტორია ცარიელია</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {showForm && (
              <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase text-slate-800 tracking-widest">ბოლო მოთხოვნები</h3>
                    <Icons.Clock />
                 </div>
                 <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {userVacations.map(v => (
                      <div key={v.id} className="p-5 hover:bg-slate-50 transition-colors group">
                         <div className="flex justify-between items-start mb-2">
                            <div>
                               <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{v.reason}</p>
                               <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{v.startDate} — {v.endDate}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-[3px] uppercase ${v.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : v.status === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                 {v.status === 'Approved' ? 'OK' : v.status === 'Rejected' ? 'NO' : '...'}
                              </span>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {v.status === 'Approved' && <button onClick={() => printDocument(v)} className="text-slate-400 hover:text-indigo-600 transition-colors"><Icons.Newspaper /></button>}
                                { (v.employeeId !== user.id || user.role === 'Admin') && (
                                  <button onClick={() => handleDelete(v.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Icons.Trash /></button>
                                )}
                              </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-50">
                            <span>დღე: {v.workingDays}</span>
                            {v.replacementPerson && <span>• შემცვლელი: {v.replacementPerson}</span>}
                         </div>
                      </div>
                    ))}
                    {userVacations.length === 0 && <div className="p-10 text-center text-slate-300 text-[10px] font-black uppercase italic">ცარიელია</div>}
                 </div>
              </div>
            )}
          </div>

          {showForm && (
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
                                      <div key={e.id} onClick={() => { setSelectedEmpId(e.uid || e.id); setIsSearchOpen(false); setSearchTerm(''); }} className="p-3 text-[11px] font-bold hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center" >
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
                              <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest block mb-1">თარიღი დან</label>
                              <input type="date" required value={vacationForm.startDate} onChange={e => setVacationForm({...vacationForm, startDate: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600" />
                            </div>
                            <div>
                              <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest block mb-1">თარიღი მდე</label>
                              <input type="date" required value={vacationForm.endDate} onChange={e => setVacationForm({...vacationForm, endDate: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[9px] font-black text-slate-900 uppercase tracking-widest block mb-1">კალენდარული</label><input type="number" required value={vacationForm.calendarDays || ''} onChange={e => setVacationForm({...vacationForm, calendarDays: Number(e.target.value)})} className="w-full border border-slate-200 p-2.5 rounded-[5px] text-xs font-black outline-none" placeholder="0" /></div>
                            <div><label className="text-[9px] font-black text-slate-900 uppercase tracking-widest block mb-1">სამუშაო</label><input type="number" required value={vacationForm.workingDays || ''} onChange={e => setVacationForm({...vacationForm, workingDays: Number(e.target.value)})} className={`w-full border p-2.5 rounded-[5px] text-xs font-black outline-none ${isInsufficient ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 focus:border-indigo-600'}`} placeholder="0" /></div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-900 uppercase tracking-widest block mb-1">შვებულების ტიპი</label>
                            <select value={vacationForm.reason} onChange={e => setVacationForm({...vacationForm, reason: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-[5px] text-xs font-black outline-none bg-white">
                              {VACATION_TYPES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                            </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-slate-400 text-[10px] font-medium max-w-sm italic leading-tight uppercase">
                        {isInsufficient ? <span className="text-rose-500 font-black flex items-center gap-1"><Icons.Alert /> არასაკმარისი ბალანსი!</span> : "დარწმუნდით მონაცემების სისწორეში"}
                    </div>
                    <button type="submit" disabled={isInsufficient || isSyncing || !vacationForm.startDate || !vacationForm.endDate || !vacationForm.workingDays} className="px-12 py-4 bg-slate-900 text-white rounded-[5px] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50">
                      {isSyncing ? 'სინქრონიზაცია...' : 'მოთხოვნის გაგზავნა'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-500">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest">განსახილველი მოთხოვნები</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100">
                <tr><th className="px-6 py-4">თანამშრომელი</th><th className="px-6 py-4">პერიოდი</th><th className="px-6 py-4">დღე (სამ/კალ)</th><th className="px-6 py-4">შემცვლელი</th><th className="px-6 py-4">ტიპი</th><th className="px-6 py-4 text-right">ქმედება</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vacations.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4"><p className="text-[11px] font-black text-slate-900 uppercase leading-none">{v.employeeName}</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-1">ID: {v.employeeId}</p></td>
                    <td className="px-6 py-4"><p className="text-[11px] font-black text-slate-700 leading-none">{v.startDate} — {v.endDate}</p></td>
                    <td className="px-6 py-4"><p className="text-[11px] font-black text-slate-900 uppercase">{v.workingDays} / {v.calendarDays}</p></td>
                    <td className="px-6 py-4"><p className="text-[10px] font-bold text-slate-500 uppercase">{v.replacementPerson || '—'}</p></td>
                    <td className="px-6 py-4"><span className="text-[9px] font-black text-indigo-500 uppercase">{v.reason}</span></td>
                    <td className="px-6 py-4 text-right">
                      {v.status === 'Pending' ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => updateStatus(v.id, 'Approved')} disabled={isSyncing} className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-[5px] hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"><Icons.Check /></button>
                          <button onClick={() => updateStatus(v.id, 'Rejected')} disabled={isSyncing} className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-600 rounded-[5px] hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"><Icons.X /></button>
                          { (v.employeeId !== user.id || user.role === 'Admin') && (
                            <button onClick={() => handleDelete(v.id)} disabled={isSyncing} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-[5px] hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"><Icons.Trash /></button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-2">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-[3px] uppercase ${v.status === 'Approved' ? 'text-emerald-500' : 'text-rose-500'}`}>{v.status === 'Approved' ? 'დადასტურდა' : 'უარყოფილა'}</span>
                            { (v.employeeId !== user.id || user.role === 'Admin') && (
                              <button onClick={() => handleDelete(v.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Icons.Trash /></button>
                            )}
                          </div>
                          {v.status === 'Approved' && <button onClick={() => printDocument(v)} className="text-[9px] font-black text-indigo-600 flex items-center gap-1 hover:underline"><Icons.Newspaper /> ბეჭდვა</button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {vacations.length === 0 && (
                  <tr><td colSpan={6} className="p-20 text-center text-slate-300 font-black text-[10px] uppercase tracking-widest italic">განსახილველი მოთხოვნები არ არის</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacationManagement;
