
import React from 'react';
import { View, User } from '../types';
import { Icons } from '../constants';
import { SystemSettings } from '../services/database';

interface SidebarProps {
  activeView: View;
  setView: (view: View) => void;
  user: User;
  logoUrl?: string;
  settings: SystemSettings;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setView, user, logoUrl, settings }) => {
  // Use settings from props instead of calling async Database.getSettings() synchronously
  const allowedViews = settings.rolePermissions[user.role] || [];
  
  // Removed View.PROFILE from navItems
  const navItems = [
    { id: View.DASHBOARD, label: 'მთავარი', icon: Icons.Dashboard },
    { id: View.ATTENDANCE, label: 'აღრიცხვა', icon: Icons.Clock },
    { id: View.ATTENDANCE_REPORT, label: 'დასწრების რეპორტი', icon: Icons.Newspaper },
    { id: View.USERS, label: 'მომხმარებლები', icon: Icons.Users },
    { id: View.ACCOUNTANT, label: 'ბუღალტერია', icon: Icons.Wallet },
    { id: View.CASHIER, label: 'სალარო', icon: Icons.Wallet },
    { id: View.VACATIONS, label: 'შვებულება', icon: Icons.Calendar },
    { id: View.COMPANY_STRUCTURE, label: 'სტრუქტურა', icon: Icons.Dashboard },
    { id: View.ADMIN, label: 'ადმინი', icon: Icons.Admin },
  ].filter(item => allowedViews.includes(item.id));

  return (
    <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden lg:flex flex-col border-r border-slate-800">
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-6 group cursor-pointer" onClick={() => setView(View.DASHBOARD)}>
          {logoUrl ? (
            <img src={logoUrl} className="w-6 h-6 object-contain" alt="Logo" />
          ) : (
            <div className="w-6 h-6 bg-indigo-600 rounded-[5px] flex items-center justify-center font-bold text-sm">Z</div>
          )}
          <span className="text-lg font-black tracking-tight uppercase">ZENITH</span>
        </div>
        
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-[3px] transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white font-bold shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="transform scale-90 flex-shrink-0"><Icon /></div>
                <span className="text-[11px] font-black uppercase tracking-wider whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto p-4 border-t border-slate-800">
        <div className="bg-slate-800/40 rounded-[5px] p-2.5 border border-slate-700/50">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">წვდომა</p>
          <div className="flex items-center space-x-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${user.role === 'Admin' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
            <span className="text-[9px] font-black text-slate-300 uppercase">{user.role}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
