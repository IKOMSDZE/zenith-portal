
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { User, UserRole, PositionMapping } from '../types';
import { Icons } from '../constants';
import { Database } from '../services/database';
import { QueryDocumentSnapshot, QueryConstraint, where } from 'firebase/firestore';

interface UsersModuleProps {
  onUpdateEmployees: (newEmployees: User[]) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  positions: PositionMapping[];
}

const ROLES: UserRole[] = ['Admin', 'Manager', 'Editor', 'Accountant', 'Employee', 'HR'];
const PAGE_SIZE = 50;

const UsersModule: React.FC<UsersModuleProps> = ({ onUpdateEmployees, onDeleteUser, positions }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<User> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filters, setFilters] = useState({
    role: '',
    department: '',
    position: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Database.getCurrentUser().then(setCurrentUser);
  }, []);

  const fetchEmployees = useCallback(async (isNextPage: boolean = false) => {
    setIsLoading(true);
    const constraints: QueryConstraint[] = [];
    
    if (filters.role) constraints.push(where('role', '==', filters.role));
    if (filters.department) constraints.push(where('department', '==', filters.department));
    if (filters.position) constraints.push(where('position', '==', filters.position));

    try {
      const result = await Database.getEmployees(
        PAGE_SIZE, 
        isNextPage ? (lastDoc || undefined) : undefined,
        constraints
      );
      
      let finalData = result.data;
      if (searchTerm) {
        finalData = finalData.filter(e => 
          e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          e.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (isNextPage) {
        setEmployees(prev => [...prev, ...finalData]);
      } else {
        setEmployees(finalData);
        setTotalCount(result.totalCount);
      }
      
      setLastDoc(result.lastVisible);
      setHasMore(result.data.length === PAGE_SIZE);
    } catch (error) {
      console.error("Employee Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lastDoc, searchTerm]);

  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    fetchEmployees(false);
  }, [filters.role, filters.department, filters.position]);

  const isAdmin = currentUser?.role === 'Admin';
  const departments = useMemo(() => Array.from(new Set(positions.map(p => p.department))), [positions]);

  const handleDelete = async (id: string, role: string) => {
    if (role === 'Admin' && id === currentUser?.id) return;
    if (window.confirm("ნამდვილად გსურთ მომხმარებლის წაშლა?")) {
      await onDeleteUser(id);
      fetchEmployees(false);
    }
  };

  const handlePositionChange = (title: string) => {
    const pos = positions.find(p => p.title === title);
    setEditingEmployee(prev => ({
        ...prev,
        position: title,
        department: pos ? pos.department : prev?.department
    }));
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployee || !editingEmployee.id) return;
    setIsLoading(true);
    try {
      const newUser: User = {
        ...editingEmployee,
        avatar: editingEmployee.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        checkedIn: editingEmployee.checkedIn || false,
        vacationDaysTotal: editingEmployee.vacationDaysTotal || 24,
        vacationDaysUsed: editingEmployee.vacationDaysUsed || 0,
        department: editingEmployee.department || 'რითეილი',
        role: editingEmployee.role || 'Employee'
      } as User;
      
      await onUpdateEmployees([newUser]);
      setIsModalOpen(false);
      setEditingEmployee(null);
      fetchEmployees(false);
    } catch (e) {
      alert("შეცდომა შენახვისას.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (employees.length === 0) return;
    const headers = ["ID", "Name", "Role", "Department", "Position", "Email", "Phone", "PersonalID"];
    const rows = employees.map(e => [e.id, e.name, e.role, e.department, e.position || "", e.email || "", e.phoneNumber || "", e.personalId || ""]);
    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length <= 1) return;
      
      const newUsers: User[] = lines.slice(1).map(line => {
        const parts = line.split(",").map(p => p.trim());
        return {
          id: parts[0] || `EMP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          name: parts[1] || "Unnamed",
          role: (parts[2] as UserRole) || "Employee",
          department: parts[3] || "რითეილი",
          position: parts[4] || "",
          email: parts[5] || "",
          phoneNumber: parts[6] || "",
          personalId: parts[7] || "",
          password: parts[8] || '123456', // Default password for imports if not provided
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          checkedIn: false,
          vacationDaysTotal: 24,
          vacationDaysUsed: 0
        } as User;
      });

      if (window.confirm(`${newUsers.length} მომხმარებელი მზადაა იმპორტისთვის. გავაგრძელოთ?`)) {
        setIsLoading(true);
        await onUpdateEmployees(newUsers);
        fetchEmployees(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-[5px] flex items-center justify-center text-white shadow-lg">
            <Icons.Users />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">მომხმარებლები</h2>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">
               <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-[3px] mr-3">ჯამი: {totalCount}</span>
               პერსონალის მართვა
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
            <Icons.Newspaper /> ექსპორტი
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
            <Icons.Dashboard /> იმპორტი
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
          <button onClick={() => { setEditingEmployee({ id: `EMP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`, password: '123456' }); setIsModalOpen(true); }} className="px-8 py-2.5 bg-slate-900 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">დამატება</button>
        </div>
      </div>

      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">ძებნა</label>
          <input type="text" placeholder="სახელი, ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">როლი</label>
          <select value={filters.role} onChange={e => setFilters(f => ({...f, role: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none">
            <option value="">ყველა როლი</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">დეპარტამენტი</label>
          <select value={filters.department} onChange={e => setFilters(f => ({...f, department: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none">
            <option value="">ყველა დეპარტამენტი</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">პოზიცია</label>
          <select value={filters.position} onChange={e => setFilters(f => ({...f, position: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none">
            <option value="">ყველა პოზიცია</option>
            {positions.map(p => <option key={p.title} value={p.title}>{p.title}</option>)}
          </select>
        </div>
      </section>

      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">თანამშრომელი</th>
                <th className="px-6 py-5">კონტაქტი</th>
                <th className="px-6 py-5">პოზიცია</th>
                <th className="px-6 py-5 text-right">ქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group text-[10px]">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <img src={emp.avatar} className="w-8 h-8 rounded-[5px] object-cover border border-slate-100" />
                      <div>
                        <p className="font-black text-slate-900 uppercase leading-none">{emp.name}</p>
                        <p className="font-bold text-slate-400 uppercase mt-1">ID: {emp.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-bold text-slate-600">{emp.email || "—"}</td>
                  <td className="px-6 py-5">
                    <p className="font-black text-indigo-600 uppercase">{emp.department}</p>
                    <p className="font-bold text-slate-400 uppercase mt-0.5">{emp.position}</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => { setEditingEmployee(emp); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Icons.Edit /></button>
                       {isAdmin && <button onClick={() => handleDelete(emp.uid || emp.id, emp.role)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Icons.Trash /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {hasMore && (
          <div className="p-6 text-center border-t border-slate-100 bg-slate-50/30">
            <button onClick={() => fetchEmployees(true)} disabled={isLoading} className="px-10 py-2.5 bg-white border border-slate-200 rounded-[5px] text-[9px] font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3 mx-auto">
              {isLoading ? 'იტვირთება...' : 'მეტის ნახვა'}
            </button>
          </div>
        )}
      </section>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-[5px] shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">პროფილის სრული მართვა</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Icons.X /></button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">სახელი და გვარი</label>
                   <input type="text" value={editingEmployee?.name || ''} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">თანამშრომლის ID</label>
                   <input type="text" value={editingEmployee?.id || ''} onChange={e => setEditingEmployee({...editingEmployee, id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">პირადი ნომერი</label>
                   <input type="text" value={editingEmployee?.personalId || ''} onChange={e => setEditingEmployee({...editingEmployee, personalId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">როლი</label>
                   <select value={editingEmployee?.role || 'Employee'} onChange={e => setEditingEmployee({...editingEmployee, role: e.target.value as UserRole})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none">
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">პოზიცია</label>
                   <select value={editingEmployee?.position || ''} onChange={e => handlePositionChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none">
                      <option value="">აირჩიეთ პოზიცია</option>
                      {positions.map(p => <option key={p.title} value={p.title}>{p.title}</option>)}
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">დეპარტამენტი</label>
                   <select value={editingEmployee?.department || ''} onChange={e => setEditingEmployee({...editingEmployee, department: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none">
                      <option value="">აირჩიეთ დეპარტამენტი</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">ელ-ფოსტა</label>
                   <input type="email" value={editingEmployee?.email || ''} onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">ტელეფონის ნომერი</label>
                   <input type="tel" value={editingEmployee?.phoneNumber || ''} onChange={e => setEditingEmployee({...editingEmployee, phoneNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">პაროლი (ავტორიზაციისთვის)</label>
                   <input type="password" value={editingEmployee?.password || ''} onChange={e => setEditingEmployee({...editingEmployee, password: e.target.value})} className="w-full bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-[5px] text-[11px] font-black outline-none focus:bg-white transition-all" placeholder="••••••••" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">სამსახურის დაწყების თარიღი</label>
                   <input type="date" value={editingEmployee?.jobStartDate || ''} onChange={e => setEditingEmployee({...editingEmployee, jobStartDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">დაბადების თარიღი</label>
                   <input type="date" value={editingEmployee?.birthday || ''} onChange={e => setEditingEmployee({...editingEmployee, birthday: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">შვებულების დღეები (ლიმიტი)</label>
                   <input type="number" value={editingEmployee?.vacationDaysTotal || 24} onChange={e => setEditingEmployee({...editingEmployee, vacationDaysTotal: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none" />
                 </div>
                 <div className="md:col-span-3 space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">მისამართი</label>
                   <textarea rows={3} value={editingEmployee?.address || ''} onChange={e => setEditingEmployee({...editingEmployee, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none resize-none" />
                 </div>
               </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
               <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">გაუქმება</button>
               <button onClick={handleSaveEmployee} disabled={isLoading} className="flex-1 py-3 bg-slate-900 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg">ცვლილებების შენახვა</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersModule;
