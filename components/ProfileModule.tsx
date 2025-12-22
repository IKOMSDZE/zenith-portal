
import React, { useRef, useState, useEffect } from 'react';
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
  const isAdmin = user.role === 'Admin';
  
  const [formData, setFormData] = useState<Partial<User>>({ ...user });
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setFormData({ ...user });
  }, [user]);

  // Utility to compress image before syncing to Firestore
  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // High compression for Firestore sync
      };
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setFormData(prev => ({ ...prev, avatar: compressed }));
        setIsProcessingImage(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field: keyof User, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      alert('პაროლები არ ემთხვევა!');
      return;
    }

    setIsSaving(true);
    
    if (formData.birthday !== user.birthday && formData.birthday) {
      await onBirthdayChange(formData.birthday);
    }

    const updates: Partial<User> = { ...formData };
    if (newPassword) {
      updates.password = newPassword;
    }
    
    // This triggers sync to Firebase via App.tsx -> Database.setCurrentUser
    await onUpdateUser(updates);
    
    setIsSaving(false);
    setSaveSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const inputClasses = "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[5px] font-bold text-sm text-slate-700 focus:bg-white focus:border-indigo-600 outline-none transition-all shadow-sm";
  const labelClasses = "text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1 mb-3 block leading-none";
  const readOnlyClasses = "w-full px-5 py-4 bg-slate-100 text-slate-400 border border-transparent rounded-[5px] font-bold text-sm cursor-not-allowed select-none shadow-none";

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700 pb-32">
      <div className="bg-white rounded-[5px] shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="h-56 bg-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="absolute top-10 right-10">
             <div className="px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-[5px] border border-white/10 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">სისტემაშია</span>
             </div>
          </div>
        </div>

        <div className="px-12 pb-14">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-12 -mt-24 relative z-10">
            <div className="relative group p-2 bg-white rounded-[5px] shadow-2xl">
              <div className="w-48 h-48 rounded-[5px] overflow-hidden bg-slate-100 border-2 border-slate-50 flex items-center justify-center">
                {isProcessingImage ? (
                  <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                ) : (
                  <img src={formData.avatar} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Avatar" />
                )}
              </div>
              <button 
                onClick={() => avatarInputRef.current?.click()}
                disabled={isProcessingImage}
                className="absolute bottom-4 right-4 w-12 h-12 bg-indigo-600 text-white rounded-[5px] shadow-xl flex items-center justify-center hover:bg-indigo-700 transition-all active:scale-90 disabled:opacity-50"
              >
                <Icons.Edit />
              </button>
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>

            <div className="flex-1 text-center md:text-left pt-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="text-4xl font-black text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-100 focus:border-indigo-600 outline-none w-full px-2 py-1 transition-all text-center md:text-left tracking-tight leading-tight"
                    placeholder="სახელი და გვარი"
                  />
                </div>
                <div className="px-5 py-2 bg-slate-100 border border-slate-200 rounded-[5px] mx-auto md:mx-0 shadow-sm">
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">{user.role}</span>
                </div>
              </div>
              <p className="text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] mt-2 ml-1 flex items-center justify-center md:justify-start gap-3">
                <span>{user.position || '—'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                <span>{user.department}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <div className="bg-white rounded-[5px] p-12 border border-slate-200 shadow-sm space-y-12">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
              <div className="w-12 h-12 rounded-[5px] bg-slate-900 text-white flex items-center justify-center shadow-lg">
                <Icons.User />
              </div>
              პირადი ინფორმაცია
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              <div className="space-y-2">
                <label className={labelClasses}>ტელეფონის ნომერი</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[11px] tracking-widest">+995</div>
                  <input 
                    type="tel" 
                    value={formData.phoneNumber || ''} 
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)} 
                    className={inputClasses.replace('px-5', 'pl-16 pr-5')} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClasses}>ელ-ფოსტა</label>
                <input 
                  type="email" 
                  value={formData.email || ''} 
                  onChange={(e) => handleInputChange('email', e.target.value)} 
                  className={inputClasses} 
                />
              </div>

              <div className="space-y-2">
                <label className={labelClasses}>პირადი ნომერი</label>
                <input 
                  type="text" 
                  value={formData.personalId || ''} 
                  onChange={(e) => handleInputChange('personalId', e.target.value)} 
                  className={inputClasses} 
                />
              </div>

              <div className="space-y-2">
                <label className={labelClasses}>დაბადების თარიღი</label>
                <input 
                  type="date" 
                  disabled={!canEditBirthday && !isAdmin} 
                  value={formData.birthday || ''} 
                  onChange={(e) => handleInputChange('birthday', e.target.value)} 
                  className={(!canEditBirthday && !isAdmin) ? readOnlyClasses : inputClasses} 
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className={labelClasses}>საცხოვრებელი მისამართი</label>
                <textarea 
                  rows={4}
                  value={formData.address || ''} 
                  onChange={(e) => handleInputChange('address', e.target.value)} 
                  className={inputClasses + " resize-none leading-relaxed"}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-10">
          <div className="bg-white rounded-[5px] p-12 border border-slate-200 shadow-sm space-y-12">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
              <div className="w-12 h-12 rounded-[5px] bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                <Icons.Admin />
              </div>
              სამსახურებრივი
            </h3>

            <div className="space-y-8">
              <div className="p-6 bg-slate-50 rounded-[5px] border border-slate-100 flex items-center justify-between shadow-sm">
                 <div className="space-y-2">
                    <p className={labelClasses.replace('mb-3', 'mb-1')}>თანამშრომლის ID</p>
                    <p className="text-base font-black text-slate-900 tracking-tight leading-none">{user.id}</p>
                 </div>
                 <div className="text-slate-300 scale-110"><Icons.Dashboard /></div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                   <label className={labelClasses}>პოზიცია</label>
                   {isAdmin ? (
                     <input type="text" value={formData.position || ''} onChange={(e) => handleInputChange('position', e.target.value)} className={inputClasses} />
                   ) : (
                     <div className={readOnlyClasses + " bg-slate-50/50"}>{user.position || '—'}</div>
                   )}
                </div>

                <div className="space-y-2">
                   <label className={labelClasses}>დეპარტამენტი</label>
                   {isAdmin ? (
                     <input type="text" value={formData.department || ''} onChange={(e) => handleInputChange('department', e.target.value)} className={inputClasses} />
                   ) : (
                     <div className={readOnlyClasses + " bg-slate-50/50"}>{user.department || '—'}</div>
                   )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[5px] p-12 border border-slate-200 shadow-sm space-y-10">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
              <div className="w-12 h-12 rounded-[5px] bg-rose-600 text-white flex items-center justify-center shadow-lg">
                <Icons.Alert />
              </div>
              უსაფრთხოება
            </h3>

            <div className="space-y-6">
              <div className="space-y-2">
                 <label className={labelClasses}>ახალი პაროლი</label>
                 <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClasses} 
                 />
              </div>
              <div className="space-y-2">
                 <label className={labelClasses}>პაროლის დადასტურება</label>
                 <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClasses} 
                 />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-8 z-40 lg:left-64 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="hidden md:flex items-center gap-6">
             <div className="w-12 h-12 bg-slate-100 rounded-[5px] flex items-center justify-center text-slate-400 shadow-inner">
               <Icons.Gift />
             </div>
             <div className="space-y-1">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">პროფილის სტატუსი</p>
               <p className="text-sm font-black text-slate-900 uppercase leading-none">მონაცემები აქტუალურია</p>
             </div>
          </div>
          
          <div className="flex items-center gap-6 w-full md:w-auto">
            {saveSuccess && (
              <div className="px-6 py-4 bg-emerald-50 text-emerald-600 rounded-[5px] border border-emerald-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-in fade-in duration-300">
                <Icons.Check /> წარმატებით შეინახა
              </div>
            )}
            <button 
              onClick={handleSave}
              disabled={isSaving || isProcessingImage}
              className={`flex-1 md:flex-none px-14 py-5 rounded-[5px] font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4
                ${isSaving || isProcessingImage
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
            >
              {isSaving ? (
                <span className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></span>
              ) : (
                <div className="scale-110"><Icons.Check /></div>
              )}
              <span>{isSaving ? 'მიმდინარეობს შენახვა...' : 'ცვლილებების შენახვა'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModule;
