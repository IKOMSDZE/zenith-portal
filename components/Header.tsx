
import React, { useState, useRef, useEffect } from 'react';
import { View, User, BranchConfig } from '../types';
import { Icons } from '../constants';
import { SystemSettings } from '../services/database';

interface HeaderProps {
  user: User;
  settings: SystemSettings;
  activeView: View;
  isAttendanceEnabledForUser: boolean;
  branches: BranchConfig[];
  updateUserInfo: (updates: Partial<User>) => void;
  setActiveView: (view: View) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  settings,
  activeView,
  isAttendanceEnabledForUser,
  branches,
  updateUserInfo,
  setActiveView,
  onLogout,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const viewLabels: Record<string, string> = {
    [View.DASHBOARD]: 'მთავარი გვერდი',
    [View.ATTENDANCE]: 'დასწრების აღრიცხვა',
    [View.PROFILE]: 'პროფილი',
    [View.ADMIN]: 'ადმინ პანელი',
    [View.VACATIONS]: 'შვებულება',
    [View.CASHIER]: 'სალარო',
    [View.COMPANY_STRUCTURE]: 'კომპანიის სტრუქტურა',
    [View.ATTENDANCE_REPORT]: 'დასწრების რეპორტები',
    [View.ACCOUNTANT]: 'ბუღალტერია',
    [View.USERS]: 'მომხმარებლები'
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-30">
      <div className="flex items-center lg:hidden">
        {settings.logoUrl ? (
          <img src={settings.logoUrl} className="h-8 mr-3" alt="Logo" />
        ) : (
          <div className="w-8 h-8 bg-indigo-600 rounded-[5px] flex items-center justify-center font-bold text-white mr-3 text-sm">
            {(settings.appTitle || 'Z').charAt(0).toUpperCase()}
          </div>
        )}
        <span className="font-black text-lg uppercase tracking-tight truncate max-w-[120px]">
          {settings.appTitle || 'ZENITH'}
        </span>
      </div>
      
      <div className="hidden lg:block">
        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">
          {viewLabels[activeView] || activeView.replace('_', ' ')}
        </p>
      </div>

      <div className="flex items-center space-x-6 relative" ref={menuRef}>
        {isAttendanceEnabledForUser && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-[5px]">
            <span className={`w-2 h-2 rounded-full ${user.checkedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {user.branch || 'ფილიალი არაა'}
            </span>
          </div>
        )}
        
        <div 
          className="flex items-center space-x-3 cursor-pointer group px-3 py-2 rounded-[5px] hover:bg-slate-50 transition-all" 
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black leading-none uppercase text-slate-900">{user.name}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-wider">{user.role}</p>
          </div>
          <img 
            src={user.avatar} 
            className={`w-9 h-9 rounded-[5px] object-cover ring-2 ${isProfileMenuOpen ? 'ring-indigo-600' : 'ring-transparent'} transition-all`} 
            alt="User Avatar"
          />
        </div>

        {isProfileMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-[5px] shadow-2xl border border-slate-200 p-5 animate-in zoom-in-95 duration-200 z-50">
            <div className="space-y-4">
              {isAttendanceEnabledForUser && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">სამუშაო ფილიალი</p>
                  <select 
                    value={user.branch || ''} 
                    onChange={(e) => updateUserInfo({ branch: e.target.value })} 
                    disabled={user.checkedIn} 
                    className="w-full bg-slate-50 text-indigo-700 px-3 py-2.5 rounded-[5px] text-[10px] font-black uppercase border border-slate-200 outline-none"
                  >
                    <option value="">აირჩიეთ ფილიალი</option>
                    {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <div className="h-[1px] bg-slate-100"></div>
              <button 
                onClick={() => { setActiveView(View.PROFILE); setIsProfileMenuOpen(false); }} 
                className="w-full flex items-center space-x-3 p-2.5 rounded-[5px] hover:bg-slate-50 text-left group transition-colors"
              >
                <Icons.User /><span className="text-[10px] font-black uppercase tracking-widest text-slate-700">პროფილი</span>
              </button>
              <button 
                onClick={() => { onLogout(); setIsProfileMenuOpen(false); }} 
                className="w-full flex items-center space-x-3 p-2.5 rounded-[5px] hover:bg-rose-50 text-rose-600 text-left transition-colors"
              >
                <Icons.X /><span className="text-[10px] font-black uppercase tracking-widest">გამოსვლა</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
