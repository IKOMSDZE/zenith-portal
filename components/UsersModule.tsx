
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, UserRole, PositionMapping } from '../types';
import { Icons } from '../constants';
import { Database } from '../services/database';

interface UsersModuleProps {
  employees: User[];
  onUpdateEmployees: (newEmployees: User[]) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  positions: PositionMapping[];
}

const ROLES: UserRole[] = ['Admin', 'Manager', 'Editor', 'Accountant', 'Employee', 'HR'];

const UsersModule: React.FC<UsersModuleProps> = ({ employees, onUpdateEmployees, onDeleteUser, positions }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Database.getCurrentUser().then(setCurrentUser);
  }, []);

  const isAdmin = currentUser?.role === 'Admin';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<User> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [filters, setFilters] = useState({
    role: '',
    department: '',
    position: ''
  });

  const importRef = useRef<HTMLInputElement>(null);

  const generateEmpId = () => {
    let newId;
    let isUnique = false;
    while (!isUnique) {
      newId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
      isUnique = !employees.some(e => e.id === newId);
    }
    return newId;
  };

  const handleAddClick = () => {
    const newId = generateEmpId();
    setEditingEmployee({
      id: newId,
      name: '',
      role: 'Employee',
      department: positions[0]?.department || '',
      position: positions[0]?.title || '',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
      vacationDaysTotal: 24,
      vacationDaysUsed: 0,
      checkedIn: false,
      jobStartDate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingEmployee) {
      setIsProcessingAvatar(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setEditingEmployee({ ...editingEmployee, avatar: compressed });
        setIsProcessingAvatar(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = searchTerm === '' || 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.personalId?.includes(searchTerm) ||
        emp.phoneNumber?.includes(searchTerm);
      
      const matchRole = filters.role === '' || emp.role === filters.role;
      const matchDept = filters.department === '' || emp.department === filters.department;
      const matchPos = filters.position === '' || emp.position === filters.position;

      return matchSearch && matchRole && matchDept && matchPos;
    });
  }, [employees, searchTerm, filters]);

  const departments = useMemo(() => Array.from(new Set(positions.map(p => p.department))), [positions]);

  const handlePositionChange = (posTitle: string) => {
    const pos = positions.find(p => p.title === posTitle);
    if (pos && editingEmployee) {
      setEditingEmployee({ 
        ...editingEmployee, 
        position: posTitle, 
        department: pos.department 
      });
    }
  };

  const handleSave = async () => {
    if (!editingEmployee?.name || !editingEmployee?.id) {
      alert("გთხოვთ შეავსოთ სავალდებულო ველები (სახელი, ID)");
      return;
    }

    const newUser = editingEmployee as User;
    let updatedList;
    if (employees.some(e => e.id === newUser.id)) {
      updatedList = employees.map(e => e.id === newUser.id ? newUser : e);
    } else {
      updatedList = [...employees, newUser];
    }

    await onUpdateEmployees(updatedList);
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleDelete = async (id: string, role: string) => {
    if (role === 'Admin' && id === currentUser?.id) {
      alert("საკუთარი თავის წაშლა აკრძალულია!");
      return;
    }
    if (window.confirm("ნამდვილად გსურთ მომხმარებლის წაშლა?")) {
      await onDeleteUser(id);
    }
  };

  const handleExport = () => {
    const headers = ["ID", "სახელი", "როლი", "დეპარტამენტი", "პოზიცია", "პირადი ნომერი", "ტელეფონი", "ელფოსტა", "მისამართი", "დაბადების თარიღი", "მუშაობის დაწყება", "შვებულება სულ", "შვებულება გამოყენებული"];
    const csvRows = filteredEmployees.map(e => [
      e.id,
      e.name,
      e.role,
      e.department,
      e.position,
      e.personalId || "",
      e.phoneNumber || "",
      e.email || "",
      e.address || "",
      e.birthday || "",
      e.jobStartDate || "",
      e.vacationDaysTotal,
      e.vacationDaysUsed
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `თანამშრომლები_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split("\n").slice(1);
      const newEmployees: User[] = rows.filter(row => row.trim()).map(row => {
        const cols = row.split(",");
        return {
          id: cols[0] || generateEmpId(),
          name: cols[1] || "Unknown",
          role: (cols[2] as UserRole) || "Employee",
          department: cols[3] || "N/A",
          position: cols[4] || "N/A",
          personalId: cols[5],
          phoneNumber: cols[6],
          email: cols[7],
          address: cols[8],
          birthday: cols[9],
          jobStartDate: cols[10],
          vacationDaysTotal: parseInt(cols[11]) || 24,
          vacationDaysUsed: parseInt(cols[12]) || 0,
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          checkedIn: false
        };
      });

      if (newEmployees.length > 0) {
        await onUpdateEmployees([...employees, ...newEmployees]);
        alert(`${newEmployees.length} თანამშრომელი იმპორტირებულია.`);
      }
    };
    reader.readAsText(file);
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
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">პერსონალის სრული ბაზა და მართვა</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => importRef.current?.click()}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Icons.Admin /> იმპორტი
          </button>
          <input type="file" ref={importRef} className="hidden" accept=".csv" onChange={handleImport} />
          <button 
            onClick={handleExport}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Icons.Newspaper /> ექსპორტი
          </button>
          <button 
            onClick={handleAddClick}
            className="px-8 py-2.5 bg-slate-900 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md"
          >
            დამატება
          </button>
        </div>
      </div>

      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">ძებნა</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"><Icons.Search /></span>
            <input 
              type="text" 
              placeholder="სახელი, ID, ტელეფონი..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">როლი</label>
          <select 
            value={filters.role}
            onChange={e => setFilters(f => ({...f, role: e.target.value}))}
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-4 py-2.5 text-[11px] font-bold outline-none"
          >
            <option value="">ყველა როლი</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">დეპარტამენტი</label>
          <select 
            value={filters.department}
            onChange={e => setFilters(f => ({...f, department: e.target.value}))}
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-4 py-2.5 text-[11px] font-bold outline-none"
          >
            <option value="">ყველა დეპარტამენტი</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">პოზიცია</label>
          <select 
            value={filters.position}
            onChange={e => setFilters(f => ({...f, position: e.target.value}))}
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-4 py-2.5 text-[11px] font-bold outline-none"
          >
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
                <th className="px-8 py-6">თანამშრომელი</th>
                <th className="px-6 py-6">პირადი ნომერი</th>
                <th className="px-6 py-6">კონტაქტი</th>
                <th className="px-6 py-6">დეპარტამენტი / პოზიცია</th>
                <th className="px-6 py-6">შვებულება (დარჩ/სულ)</th>
                <th className="px-6 py-6">როლი</th>
                <th className="px-6 py-6 text-right">ქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <img src={emp.avatar} className="w-12 h-12 rounded-[5px] object-cover border border-slate-100" />
                      <div>
                        <p className="text-[12px] font-black text-slate-900 uppercase leading-none">{emp.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">ID: {emp.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-[11px] font-bold text-slate-600">{emp.personalId || "—"}</p>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-[11px] font-black text-slate-700">{emp.phoneNumber || "—"}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{emp.email || "—"}</p>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-[11px] font-black text-indigo-600 uppercase tracking-tight">{emp.department}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{emp.position}</p>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-black text-slate-900">{(emp.vacationDaysTotal || 0) - (emp.vacationDaysUsed || 0)}</span>
                      <span className="text-[10px] text-slate-400">/</span>
                      <span className="text-[11px] font-bold text-slate-400">{emp.vacationDaysTotal || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className="text-[8px] font-black px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-[3px] uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => { setEditingEmployee(emp); setIsModalOpen(true); }}
                        className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                        title="რედაქტირება"
                      >
                        <Icons.Edit />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(emp.uid || emp.id, emp.role)}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          title="წაშლა"
                        >
                          <Icons.Trash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[5px] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
               <h4 className="text-sm font-black uppercase text-slate-900">{employees.some(e => e.id === editingEmployee?.id) ? 'რედაქტირება' : 'ახალი თანამშრომელი'}</h4>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Icons.X /></button>
            </div>
            
            <div className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-5">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">პირადი ინფორმაცია</h5>
                  <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                       <div className="relative group">
                          <div className="w-24 h-24 rounded-[5px] overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                             {isProcessingAvatar ? (
                               <div className="w-6 h-6 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                             ) : (
                               <img src={editingEmployee?.avatar} className="w-full h-full object-cover" />
                             )}
                          </div>
                          <button 
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-600 text-white rounded-[5px] flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all"
                          >
                            <Icons.Edit />
                          </button>
                          <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                       </div>
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">პროფილის სინქრონიზაცია</p>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">სრული სახელი *</label>
                      <input 
                        type="text" 
                        value={editingEmployee?.name || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, name: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">ID (ავტო-გენერირებული)</label>
                      <input 
                        type="text" 
                        readOnly
                        value={editingEmployee?.id || ''} 
                        className="w-full bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-black text-slate-400 cursor-not-allowed" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">პირადი ნომერი</label>
                      <input 
                        type="text" 
                        value={editingEmployee?.personalId || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, personalId: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">დაბადების თარიღი</label>
                      <input 
                        type="date" 
                        value={editingEmployee?.birthday || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, birthday: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">კონტაქტი</h5>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">ტელეფონი</label>
                      <input 
                        type="tel" 
                        value={editingEmployee?.phoneNumber || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, phoneNumber: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">ელფოსტა</label>
                      <input 
                        type="email" 
                        value={editingEmployee?.email || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, email: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">მისამართი</label>
                      <textarea 
                        rows={3}
                        value={editingEmployee?.address || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, address: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500 resize-none" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">სამსახურებრივი</h5>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">პოზიცია *</label>
                      <select 
                        value={editingEmployee?.position || ''} 
                        onChange={e => handlePositionChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none"
                      >
                        <option value="">აირჩიეთ პოზიცია</option>
                        {positions.map(p => <option key={p.title} value={p.title}>{p.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">როლი *</label>
                      <select 
                        value={editingEmployee?.role || 'Employee'} 
                        onChange={e => setEditingEmployee(p => ({...p!, role: e.target.value as UserRole}))}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">სამსახურის დაწყება</label>
                      <input 
                        type="date" 
                        value={editingEmployee?.jobStartDate || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, jobStartDate: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">შვებულება სულ</label>
                          <input 
                            type="number" 
                            value={editingEmployee?.vacationDaysTotal || 0} 
                            onChange={e => setEditingEmployee(p => ({...p!, vacationDaysTotal: parseInt(e.target.value) || 0}))}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                          />
                       </div>
                       <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">გამოყენებული</label>
                          <input 
                            type="number" 
                            value={editingEmployee?.vacationDaysUsed || 0} 
                            onChange={e => setEditingEmployee(p => ({...p!, vacationDaysUsed: parseInt(e.target.value) || 0}))}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                          />
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 flex gap-4 flex-shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 py-4 bg-white border border-slate-200 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
              >
                გაუქმება
              </button>
              <button 
                onClick={handleSave} 
                disabled={isProcessingAvatar}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                შენახვა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersModule;
