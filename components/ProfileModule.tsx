
import React, { useRef } from 'react';
import { User } from '../types';
import { Icons } from '../constants';
import { SystemSettings } from '../services/database';

interface ProfileModuleProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
  settings: SystemSettings;
  canEditBirthday: boolean;
  onBirthdayChange: (date: string) => Promise<void>;
}

const ProfileModule: React.FC<ProfileModuleProps> = ({ 
  user, 
  onUpdateUser, 
  settings, 
  canEditBirthday, 
  onBirthdayChange 
}) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({ avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const remainingDays = user.vacationDaysTotal - user.vacationDaysUsed;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-2 duration-500 pb-24">
      <div className="bg-white rounded-[5px] shadow-sm border border-slate-200 overflow-hidden">
        {/* Profile Header Banner */}
        <div className="h-40 bg-slate-900 flex items-center justify-center relative">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="absolute top-4 right-6 flex items-center gap-2">
             <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-[5px] border border-white/10">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">სტატუსი</p>
                <p className="text-[10px] font-black text-emerald-400 uppercase">აქტიური</p>
             </div>
          </div>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} className="h-16 opacity-20 grayscale brightness-200" alt="Brand Logo" />
          ) : (
            <p className="text-slate-500 font-black text-5xl tracking-widest uppercase opacity-10 pointer-events-none select-none">ZENITH PROFILE</p>
          )}
        </div>
        
        <div className="px-10 pb-10 -mt-16">
          <div className="flex flex-col md:flex-row items-end gap-6 mb-10">
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <img src={user.avatar} className="w-32 h-32 rounded-[5px] border-[6px] border-white shadow-xl object-cover" alt="Avatar" />
              <div className="absolute inset-0 bg-black/40 rounded-[5px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Icons.Edit />
              </div>
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>
            <div className="pb-3 flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-slate-900 leading-none">{user.name}</h2>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-[3px] uppercase border border-indigo-100">{user.role}</span>
              </div>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-tight mt-2">{user.position} • {user.department}</p>
            </div>
            
            {/* Vacation Quick Card */}
            <div className="bg-slate-900 p-5 rounded-[5px] text-white shadow-xl min-w-[200px] transform hover:scale-105 transition-transform">
               <div className="flex items-center justify-between mb-2">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">დარჩენილი შვებულება</p>
                 <Icons.Calendar />
               </div>
               <div className="flex items-baseline gap-1">
                 <h4 className="text-3xl font-black">{remainingDays}</h4>
                 <span className="text-xs font-bold text-slate-500">/{user.vacationDaysTotal} დღე</span>
               </div>
               <div className="w-full h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${(remainingDays / user.vacationDaysTotal) * 100}%` }}></div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* System Info - Read Only */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center justify-between">
                სისტემური მონაცემები
                <span className="text-[8px] bg-slate-50 px-2 py-0.5 rounded text-slate-400 font-black">READ ONLY</span>
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">თანამშრომლის ID</label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-[5px] font-black text-xs text-slate-500">{user.id}</div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">პირადი ნომერი</label>
                    <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-[5px] font-black text-xs text-slate-500">{user.personalId || '—'}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">სამუშაო პოზიცია</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-[5px] font-black text-xs text-slate-500">{user.position || '—'}</div>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">დეპარტამენტი</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-[5px] font-black text-xs text-slate-500">{user.department}</div>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">სამსახურის დაწყების თარიღი</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-[5px] font-black text-xs text-slate-500">{user.jobStartDate || '—'}</div>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">საცხოვრებელი მისამართი</label>
                  <div className="px-3 py-3 bg-slate-50 border border-slate-100 rounded-[5px] font-bold text-xs text-slate-500 min-h-[60px]">{user.address || '—'}</div>
                </div>
              </div>
            </div>

            {/* Editable Info */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-indigo-100 pb-2 flex items-center justify-between">
                საკონტაქტო ინფორმაცია
                <span className="text-[8px] bg-indigo-50 px-2 py-0.5 rounded text-indigo-400 font-black">EDITABLE</span>
              </h3>
              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest">ტელეფონის ნომერი</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold">+995</span>
                    <input 
                      type="tel" 
                      value={user.phoneNumber || ''} 
                      onChange={(e) => onUpdateUser({ phoneNumber: e.target.value })} 
                      className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-[5px] font-black text-xs text-slate-900 focus:border-indigo-600 outline-none transition-all shadow-sm" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest">ელფოსტის მისამართი</label>
                  <input 
                    type="email" 
                    value={user.email || ''} 
                    onChange={(e) => onUpdateUser({ email: e.target.value })} 
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-[5px] font-black text-xs text-slate-900 focus:border-indigo-600 outline-none transition-all shadow-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest">დაბადების თარიღი</label>
                  <input 
                    type="date" 
                    disabled={!canEditBirthday} 
                    value={user.birthday || ''} 
                    onChange={(e) => onBirthdayChange(e.target.value)} 
                    className={`w-full px-4 py-2.5 border rounded-[5px] font-black text-xs outline-none transition-all shadow-sm ${canEditBirthday ? 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'}`} 
                  />
                  {!canEditBirthday && (
                    <div className="flex items-center gap-1.5 mt-2">
                       <Icons.Alert />
                       <p className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">შეცვლა შესაძლებელია წელიწადში მხოლოდ ერთხელ</p>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <div className="bg-slate-50 p-4 rounded-[5px] border border-slate-100">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ინფორმაცია</p>
                     <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                        თქვენ შეგიძლიათ შეცვალოთ მხოლოდ მობილურის ნომერი, ელფოსტა და დაბადების თარიღი. სხვა მონაცემების ცვლილებისთვის მიმართეთ ადმინისტრაციას.
                     </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-400 italic">
               ბოლო განახლება: {new Date().toLocaleDateString()}
            </div>
            <button 
              onClick={() => alert("ცვლილებები წარმატებით შეინახა.")} 
              className="px-10 py-3.5 bg-indigo-600 text-white rounded-[5px] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
            >
              ცვლილებების შენახვა
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModule;
