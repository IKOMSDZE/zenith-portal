
import React, { useState, useRef } from 'react';
import { Icons } from '../constants';
import { User, UserRole, View } from '../types';
import { Database, SystemSettings, CustomFont } from '../services/database';

interface AdminPanelProps {
  user: User;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  employees: User[];
  onUpdateEmployees: (newEmployees: User[]) => void;
}

const VIEW_LABELS: Record<View, string> = {
  [View.DASHBOARD]: 'მთავარი გვერდი',
  [View.ATTENDANCE]: 'დასწრების აღრიცხვა',
  [View.PROFILE]: 'პროფილი',
  [View.ADMIN]: 'ადმინ პანელი',
  [View.VACATIONS]: 'შვებულება',
  [View.CASHIER]: 'სალარო',
  [View.COMPANY_STRUCTURE]: 'კომპანიის სტრუქტურა',
  [View.ATTENDANCE_REPORT]: 'დასწრების რეპორტები',
  [View.ACCOUNTANT]: 'ბუღალტერია',
  // Added USERS view label to satisfy Record<View, string> type requirement
  [View.USERS]: 'მომხმარებლები'
};

// Added 'HR' to the ROLES array to allow role assignment in the user management section
const ROLES: UserRole[] = ['Admin', 'Manager', 'Editor', 'Accountant', 'Employee', 'HR'];

const AdminPanel: React.FC<AdminPanelProps> = ({ user, settings, onUpdateSettings, employees, onUpdateEmployees }) => {
  const [activeTab, setActiveTab] = useState<'branding' | 'permissions' | 'users'>('branding');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const headerFontRef = useRef<HTMLInputElement>(null);
  const bodyFontRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'header' | 'body') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        if (type === 'logo') onUpdateSettings({ ...settings, logoUrl: data });
        else {
          const font: CustomFont = { name: file.name, data, format: file.name.split('.').pop() || 'woff2' };
          if (type === 'header') onUpdateSettings({ ...settings, headerFont: font });
          else onUpdateSettings({ ...settings, bodyFont: font });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePermission = (role: UserRole, view: View) => {
    const currentPerms = settings.rolePermissions[role] || [];
    const updatedPerms = currentPerms.includes(view)
      ? currentPerms.filter(v => v !== view)
      : [...currentPerms, view];
    
    onUpdateSettings({
      ...settings,
      rolePermissions: {
        ...settings.rolePermissions,
        [role]: updatedPerms
      }
    });
  };

  const changeUserRole = (employeeId: string, newRole: UserRole) => {
    const updated = employees.map(emp => emp.id === employeeId ? { ...emp, role: newRole } : emp);
    onUpdateEmployees(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">ადმინისტრირება</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">პლატფორმის მართვა და წვდომის კონტროლი</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-[5px] border border-slate-200 shadow-inner">
          <button 
            onClick={() => setActiveTab('branding')} 
            className={`px-4 py-1.5 rounded-[3px] text-[10px] font-black uppercase transition-all ${activeTab === 'branding' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            ბრენდინგი
          </button>
          <button 
            onClick={() => setActiveTab('permissions')} 
            className={`px-4 py-1.5 rounded-[3px] text-[10px] font-black uppercase transition-all ${activeTab === 'permissions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            წვდომები
          </button>
          <button 
            onClick={() => setActiveTab('users')} 
            className={`px-4 py-1.5 rounded-[3px] text-[10px] font-black uppercase transition-all ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            თანამშრომლები
          </button>
        </div>
      </div>

      {activeTab === 'branding' && (
        <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Icons.Dashboard /> იდენტობა და დიზაინი
            </h3>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Logo Upload */}
            <div className="space-y-3">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">პლატფორმის ლოგო</label>
              <div 
                onClick={() => logoInputRef.current?.click()} 
                className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[5px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all group"
              >
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} className="max-h-[80%] max-w-[80%] object-contain p-4 transition-transform group-hover:scale-105" />
                ) : (
                  <div className="text-center">
                    <div className="text-slate-300 group-hover:text-indigo-400 mb-2 flex justify-center"><Icons.Dashboard /></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase">ატვირთეთ ლოგო</span>
                  </div>
                )}
                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
              </div>
              {settings.logoUrl && (
                <button 
                  onClick={() => onUpdateSettings({...settings, logoUrl: undefined})}
                  className="w-full py-2 text-[9px] font-black text-rose-500 uppercase hover:bg-rose-50 rounded-[5px] transition-colors"
                >
                  ლოგოს წაშლა
                </button>
              )}
            </div>

            {/* Header Font */}
            <div className="space-y-3">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">სათაურების ფონტი (CAPS)</label>
              <div 
                onClick={() => headerFontRef.current?.click()} 
                className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[5px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all"
              >
                <div className="text-center p-4">
                  <p className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">ZENITH PORTAL</p>
                  <span className="text-[9px] font-black text-slate-400 uppercase">{settings.headerFont ? settings.headerFont.name : 'ნაგულისხმევი ფონტი'}</span>
                </div>
                <input type="file" ref={headerFontRef} className="hidden" accept=".woff,.woff2,.ttf" onChange={(e) => handleFileUpload(e, 'header')} />
              </div>
              {settings.headerFont && (
                <button 
                  onClick={() => onUpdateSettings({...settings, headerFont: undefined})}
                  className="w-full py-2 text-[9px] font-black text-rose-500 uppercase hover:bg-rose-50 rounded-[5px] transition-colors"
                >
                  ფონტის წაშლა
                </button>
              )}
            </div>

            {/* Body Font */}
            <div className="space-y-3">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">ტექსტის ფონტი (Normal)</label>
              <div 
                onClick={() => bodyFontRef.current?.click()} 
                className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[5px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all"
              >
                <div className="text-center p-4">
                  <p className="text-sm text-slate-600 mb-2 font-medium">სანიმუშო ტექსტი პლატფორმისთვის</p>
                  <span className="text-[9px] font-black text-slate-400 uppercase">{settings.bodyFont ? settings.bodyFont.name : 'ნაგულისხმევი ფონტი'}</span>
                </div>
                <input type="file" ref={bodyFontRef} className="hidden" accept=".woff,.woff2,.ttf" onChange={(e) => handleFileUpload(e, 'body')} />
              </div>
              {settings.bodyFont && (
                <button 
                  onClick={() => onUpdateSettings({...settings, bodyFont: undefined})}
                  className="w-full py-2 text-[9px] font-black text-rose-500 uppercase hover:bg-rose-50 rounded-[5px] transition-colors"
                >
                  ფონტის წაშლა
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'permissions' && (
        <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Icons.Admin /> როლებზე დაფუძნებული წვდომა
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4 sticky left-0 bg-slate-50 z-10 w-48">მოდული / ფუნქცია</th>
                  {ROLES.map(role => (
                    <th key={role} className="px-6 py-4 text-center">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.values(View).map((view) => (
                  <tr key={view} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 sticky left-0 bg-white z-10 font-black text-[10px] text-slate-700 uppercase tracking-tight">
                      {VIEW_LABELS[view]}
                    </td>
                    {ROLES.map(role => {
                      const isEnabled = settings.rolePermissions[role]?.includes(view);
                      const isLocked = role === 'Admin' && view === View.ADMIN; // Admin can't lose admin access
                      return (
                        <td key={`${role}-${view}`} className="px-6 py-4 text-center">
                          <button 
                            disabled={isLocked}
                            onClick={() => togglePermission(role, view)}
                            className={`w-5 h-5 rounded-[4px] border-2 transition-all flex items-center justify-center mx-auto
                              ${isEnabled 
                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                : 'bg-white border-slate-200 text-transparent hover:border-indigo-300'}
                              ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                          >
                            <Icons.Check />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'users' && (
        <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Icons.User /> თანამშრომლების როლები
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">თანამშრომელი</th>
                  <th className="px-6 py-4">დეპარტამენტი</th>
                  <th className="px-6 py-4">ამჟამინდელი როლი</th>
                  <th className="px-6 py-4 text-right">შეცვლა</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-3 flex items-center gap-3">
                      <img src={emp.avatar} className="w-8 h-8 rounded-[5px] object-cover border border-slate-100" />
                      <div>
                        <p className="text-[11px] font-black text-slate-900 leading-tight uppercase tracking-tight">{emp.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{emp.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">{emp.department}</td>
                    <td className="px-6 py-3">
                      <span className="text-[8px] font-black px-2 py-1 bg-indigo-50 text-indigo-600 rounded-[3px] uppercase tracking-widest">
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <select 
                        disabled={emp.id === user.id && user.role === 'Admin'} // Protect self admin role
                        value={emp.role}
                        onChange={(e) => changeUserRole(emp.id, e.target.value as UserRole)}
                        className="bg-white border border-slate-200 rounded-[5px] px-2 py-1 text-[10px] font-black uppercase outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminPanel;
