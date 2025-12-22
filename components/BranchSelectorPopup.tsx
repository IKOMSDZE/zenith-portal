
import React, { useState } from 'react';
import { BranchConfig, User } from '../types';
import { Icons } from '../constants';

interface BranchSelectorPopupProps {
  user: User;
  branches: BranchConfig[];
  onSelect: (branchName: string) => void;
  logoUrl?: string;
}

const BranchSelectorPopup: React.FC<BranchSelectorPopupProps> = ({ user, branches, onSelect, logoUrl }) => {
  const [selectedBranch, setSelectedBranch] = useState(user.branch || '');

  const handleSave = () => {
    if (selectedBranch) {
      onSelect(selectedBranch);
    } else {
      alert("გთხოვთ აირჩიოთ ფილიალი");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl"></div>
      
      {/* Content Container - Wide and Short */}
      <div className="relative bg-white w-full max-w-4xl rounded-[5px] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">
        
        {/* Left Side: Branding/Welcome (Indigo Accent) */}
        <div className="bg-slate-900 md:w-2/5 p-10 flex flex-col justify-center items-center text-center border-r border-white/5 relative">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="relative z-10 space-y-6">
            {logoUrl ? (
              <img src={logoUrl} className="h-14 object-contain mx-auto" alt="Logo" />
            ) : (
              <div className="w-14 h-14 bg-indigo-600 rounded-[5px] flex items-center justify-center text-white text-2xl font-black mx-auto shadow-lg">Z</div>
            )}
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">დილა მშვიდობისა!</h2>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] leading-relaxed">
                გთხოვთ დაადასტუროთ დღევანდელი სამუშაო ლოკაცია
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Action Form */}
        <div className="md:w-3/5 p-10 flex flex-col justify-center space-y-8 bg-white">
          <div className="space-y-6">
            <div className="text-left space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">ფილიალის არჩევა</label>
              <div className="relative group">
                <select 
                  value={selectedBranch} 
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 px-6 py-4 rounded-[5px] text-sm font-black text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="" disabled>აირჩიეთ ჩამონათვალიდან...</option>
                  {branches.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-indigo-600 transition-colors">
                  <Icons.Dashboard />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100/50 p-4 rounded-[5px] flex gap-3 text-left">
              <div className="text-amber-500 mt-0.5"><Icons.Alert /></div>
              <p className="text-[9px] font-bold text-amber-700 leading-relaxed uppercase tracking-wider">
                ფილიალის შერჩევა აუცილებელია სამუშაო საათების აღრიცხვისა და სალაროს მოდულის ფუნქციონირებისთვის.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={handleSave}
              className="flex-1 w-full py-4 bg-slate-900 text-white rounded-[5px] font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Icons.Check /> დადასტურება
            </button>
            <div className="px-4 py-4 border-l border-slate-100 hidden sm:block">
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">ავტორიზებული პირი</p>
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{user.name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchSelectorPopup;
