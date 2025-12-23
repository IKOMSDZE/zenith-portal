
import React from 'react';
import { View, User } from '../types';
import { Icons } from '../constants';
import { SystemSettings, DEFAULT_ROLE_PERMISSIONS } from '../services/database';

interface SidebarProps {
  activeView: View;
  setView: (view: View) => void;
  user: User;
  logoUrl?: string;
  settings: SystemSettings;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setView, user, logoUrl, settings }) => {
  // ROBUST PERMISSION LOGIC:
  const getAllowedViews = (): View[] => {
    // Admin always needs access to Admin Panel to manage the system
    if (user.role === 'Admin') {
      const views = (settings && settings.rolePermissions && settings.rolePermissions[user.role]) 
        ? settings.rolePermissions[user.role] 
        : DEFAULT_ROLE_PERMISSIONS[user.role];
      return views.includes(View.ADMIN) ? views : [...views, View.ADMIN];
    }
    
    if (settings && settings.rolePermissions && settings.rolePermissions[user.role]) {
      return settings.rolePermissions[user.role];
    }
    
    return DEFAULT_ROLE_PERMISSIONS[user.role] || [View.DASHBOARD, View.PROFILE];
  };

  const allowedViews = getAllowedViews();
  
  const navItems = [
    { id: View.DASHBOARD, label: 'მთავარი', icon: Icons.Dashboard },
    { id: View.ATTENDANCE_REPORT, label: 'დასწრების რეპორტი', icon: Icons.Newspaper },
    { id: View.USERS, label: 'მომხმარებლები', icon: Icons.Users },
    { id: View.ACCOUNTANT, label: 'ბუღალტერია', icon: Icons.Wallet },
    { id: View.CASHIER, label: 'სალარო', icon: Icons.Wallet },
    { id: View.VACATIONS, label: 'შვებულება', icon: Icons.Calendar },
    { id: View.COMPANY_STRUCTURE, label: 'სტრუქტურა', icon: Icons.Dashboard },
    { id: View.ADMIN, label: 'პარამეტრები', icon: Icons.Admin },
  ].filter(item => allowedViews.includes(item.id));

  return (
    <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden lg:flex flex-col border-r border-slate-800">
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-8 group cursor-pointer" onClick={() => setView(View.DASHBOARD)}>
          {logoUrl ? (
            <img src={logoUrl} className="w-8 h-8 object-contain" alt="Logo" />
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-[5px] flex items-center justify-center font-bold text-sm">
              {(settings.appTitle || 'Z').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-lg font-black tracking-tight uppercase truncate">
            {settings.appTitle || 'ZENITH'}
          </span>
        </div>
        
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-[5px] transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white font-bold shadow-md' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="transform scale-90 flex-shrink-0"><Icon /></div>
                <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto p-4 border-t border-slate-800">
        <div className="bg-slate-800/40 rounded-[5px] p-3 border border-slate-700/50">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">წვდომის დონე</p>
          <div className="flex items-center space-x-2">
            <div className={`w-1.5 h-1.5 rounded-full ${user.role === 'Admin' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
            <span className="text-[9px] font-black text-slate-300 uppercase">{user.role}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
