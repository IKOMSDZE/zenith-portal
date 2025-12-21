
import React, { useState, useMemo, useRef } from 'react';
import { User, UserRole, PositionMapping } from '../types';
import { Icons } from '../constants';
import { Database } from '../services/database';

interface UsersModuleProps {
  employees: User[];
  onUpdateEmployees: (newEmployees: User[]) => void;
  positions: PositionMapping[];
}

const ROLES: UserRole[] = ['Admin', 'Manager', 'Editor', 'Accountant', 'Employee', 'HR'];

const UsersModule: React.FC<UsersModuleProps> = ({ employees, onUpdateEmployees, positions }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<User> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    department: '',
    position: ''
  });

  const importRef = useRef<HTMLInputElement>(null);

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
    } else if (pos) {
      setEditingEmployee({ 
        id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        role: 'Employee',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        vacationDaysTotal: 24,
        vacationDaysUsed: 0,
        position: posTitle,
        department: pos.department 
      });
    }
  };

  const handleSave = () => {
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

    onUpdateEmployees(updatedList);
    setIsModalOpen(false);
    setEditingEmployee(null);
  };

  const handleDelete = (id: string, role: string) => {
    if (role === 'Admin') {
      alert("ადმინის წაშლა აკრძალულია!");
      return;
    }
    if (window.confirm("ნამდვილად გსურთ მომხმარებლის წაშლა?")) {
      const updatedList = employees.filter(e => e.id !== id);
      onUpdateEmployees(updatedList);
    }
  };

  const handleExport = () => {
    const headers = ["ID", "სახელი", "როლი", "დეპარტამენტი", "პოზიცია", "პირადი ნომერი", "ტელეფონი", "ელფოსტა", "მისამართი", "დაბადების თარიღი", "მუშაობის დაწყება"];
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
      e.jobStartDate || ""
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `თანამშრომლები_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split("\n").slice(1); // skip headers
      const newEmployees: User[] = rows.filter(row => row.trim()).map(row => {
        const cols = row.split(",");
        return {
          id: cols[0] || `EMP-${Math.random().toString(36).substr(2, 4)}`,
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
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          checkedIn: false,
          vacationDaysTotal: 24,
          vacationDaysUsed: 0
        };
      });

      if (newEmployees.length > 0) {
        onUpdateEmployees([...employees, ...newEmployees]);
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
        <div className="flex gap-2">
          <button 
            onClick={() => importRef.current?.click()}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Icons.Admin /> იმპორტი
          </button>
          <input type="file" ref={importRef} className="hidden" accept=".csv" onChange={handleImport} />
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Icons.Newspaper /> ექსპორტი
          </button>
          <button 
            onClick={() => { setEditingEmployee(null); setIsModalOpen(true); }}
            className="px-6 py-2 bg-slate-900 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md"
          >
            დამატება
          </button>
        </div>
      </div>

      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">ძებნა</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"><Icons.Search /></span>
            <input 
              type="text" 
              placeholder="სახელი, ID, ტელეფონი..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">როლი</label>
          <select 
            value={filters.role}
            onChange={e => setFilters(f => ({...f, role: e.target.value}))}
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none"
          >
            <option value="">ყველა როლი</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">დეპარტამენტი</label>
          <select 
            value={filters.department}
            onChange={e => setFilters(f => ({...f, department: e.target.value}))}
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none"
          >
            <option value="">ყველა დეპარტამენტი</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">პოზიცია</label>
          <select 
            value={filters.position}
            onChange={e => setFilters(f => ({...f, position: e.target.value}))}
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none"
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
                <th className="px-6 py-4">თანამშრომელი</th>
                <th className="px-4 py-4">პირადი ნომერი</th>
                <th className="px-4 py-4">კონტაქტი</th>
                <th className="px-4 py-4">დეპარტამენტი / პოზიცია</th>
                <th className="px-4 py-4">როლი</th>
                <th className="px-4 py-4 text-right">ქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={emp.avatar} className="w-10 h-10 rounded-[5px] object-cover border border-slate-100" />
                      <div>
                        <p className="text-[11px] font-black text-slate-900 uppercase leading-none">{emp.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">ID: {emp.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-[10px] font-bold text-slate-600">{emp.personalId || "—"}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-[10px] font-black text-slate-700">{emp.phoneNumber || "—"}</p>
                    <p className="text-[9px] text-slate-400">{emp.email || "—"}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{emp.department}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">{emp.position}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-[8px] font-black px-2 py-1 bg-slate-100 text-slate-600 rounded-[3px] uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => { setEditingEmployee(emp); setIsModalOpen(true); }}
                        className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                        title="რედაქტირება"
                      >
                        <Icons.Edit />
                      </button>
                      {emp.role !== 'Admin' && (
                        <button 
                          onClick={() => handleDelete(emp.id, emp.role)}
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
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
               <h4 className="text-sm font-black uppercase text-slate-900">{editingEmployee?.id ? 'რედაქტირება' : 'ახალი თანამშრომელი'}</h4>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Icons.X /></button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">პირადი ინფორმაცია</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">სრული სახელი *</label>
                      <input 
                        type="text" 
                        value={editingEmployee?.name || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, name: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">პირადი ნომერი</label>
                      <input 
                        type="text" 
                        value={editingEmployee?.personalId || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, personalId: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">დაბადების თარიღი</label>
                      <input 
                        type="date" 
                        value={editingEmployee?.birthday || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, birthday: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                      />
                    </div>
                  </div>
                </div>

                {/* Contact & Address */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">კონტაქტი</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">ტელეფონი</label>
                      <input 
                        type="tel" 
                        value={editingEmployee?.phoneNumber || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, phoneNumber: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">ელფოსტა</label>
                      <input 
                        type="email" 
                        value={editingEmployee?.email || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, email: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">მისამართი</label>
                      <textarea 
                        rows={2}
                        value={editingEmployee?.address || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, address: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500 resize-none" 
                      />
                    </div>
                  </div>
                </div>

                {/* Job Info */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">სამსახურებრივი</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">პოზიცია *</label>
                      <select 
                        value={editingEmployee?.position || ''} 
                        onChange={e => handlePositionChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold outline-none"
                      >
                        <option value="">აირჩიეთ პოზიცია</option>
                        {positions.map(p => <option key={p.title} value={p.title}>{p.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">დეპარტამენტი (ავტომატური)</label>
                      <input 
                        type="text" 
                        readOnly
                        value={editingEmployee?.department || ''} 
                        className="w-full bg-slate-100 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold text-slate-400" 
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">როლი *</label>
                      <select 
                        value={editingEmployee?.role || 'Employee'} 
                        onChange={e => setEditingEmployee(p => ({...p!, role: e.target.value as UserRole}))}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold outline-none"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">მუშაობის დაწყება</label>
                      <input 
                        type="date" 
                        value={editingEmployee?.jobStartDate || ''} 
                        onChange={e => setEditingEmployee(p => ({...p!, jobStartDate: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-2 flex-shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 py-3 bg-white border border-slate-200 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
              >
                გაუქმება
              </button>
              <button 
                onClick={handleSave} 
                className="flex-1 py-3 bg-indigo-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
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
