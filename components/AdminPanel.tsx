
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { User, UserRole, View } from '../types';
import { Database, SystemSettings, CustomFont, DEFAULT_ROLE_PERMISSIONS } from '../services/database';
import { SMSService } from '../services/smsService';
import { MigrationService } from '../services/migrationService';

const ROLES: UserRole[] = ['Admin', 'Manager', 'Editor', 'Accountant', 'Employee', 'HR'];

const VIEW_LABELS: Record<string, string> = {
  [View.DASHBOARD]: 'მთავარი გვერდი',
  [View.ATTENDANCE]: 'დასწრების აღრიცხვა',
  [View.PROFILE]: 'პროფილი',
  [View.ADMIN]: 'პარამეტრები (ადმინ პანელი)',
  [View.VACATIONS]: 'შვებულება (მოდული)',
  [View.VACATION_FORM]: 'შვებულების მოთხოვნის ფორმა',
  [View.VACATION_REQUESTS]: 'განსახილველი მოთხოვნები (ტაბი)',
  [View.CASHIER]: 'სალარო',
  [View.COMPANY_STRUCTURE]: 'კომპანიის სტრუქტურა',
  [View.ATTENDANCE_REPORT]: 'დასწრების რეპორტები',
  [View.ACCOUNTANT]: 'ბუღალტერია',
  [View.USERS]: 'მომხმარებლები'
};

interface AdminPanelProps {
  user: User;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  employees: User[];
  onUpdateEmployees: (newEmployees: User[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user, settings, onUpdateSettings, employees, onUpdateEmployees }) => {
  if (user.role !== 'Admin') return null;

  const [activeTab, setActiveTab] = useState<'branding' | 'permissions' | 'sms' | 'migration'>('branding');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [rawSmsLogs, setRawSmsLogs] = useState<string>('');
  const [migrationReport, setMigrationReport] = useState<any>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const headerFontRef = useRef<HTMLInputElement>(null);
  const bodyFontRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRawSmsLogs(SMSService.getRawLogs());
    const handleLogUpdate = (e: any) => setRawSmsLogs(e.detail);
    window.addEventListener('smsLogUpdated', handleLogUpdate);
    return () => window.removeEventListener('smsLogUpdated', handleLogUpdate);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'header' | 'body' | 'favicon') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        if (type === 'logo') onUpdateSettings({ ...settings, logoUrl: data });
        else if (type === 'favicon') onUpdateSettings({ ...settings, faviconUrl: data });
        else {
          const font: CustomFont = { name: file.name, data, format: file.name.split('.').pop() || 'woff2' };
          if (type === 'header') onUpdateSettings({ ...settings, headerFont: font as any });
          else onUpdateSettings({ ...settings, bodyFont: font as any });
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeBrandingAsset = (type: 'logo' | 'favicon') => {
    if (type === 'logo') onUpdateSettings({ ...settings, logoUrl: '' });
    else onUpdateSettings({ ...settings, faviconUrl: '' });
  };

  const handleTestSms = async () => {
    if (!settings.smsApiKey) { alert("გთხოვთ მიუთითოთ API Key"); return; }
    if (!user.phoneNumber) { alert("თქვენს პროფილში ტელეფონის ნომერი არ არის მითითებული ტესტირებისთვის"); return; }
    setIsSendingTest(true);
    try {
      await SMSService.send(user.phoneNumber, `Zenith Test SMS. Check sms.log file.`, 'Test');
      alert("სატესტო SMS გაიგზავნა! იხილეთ ლოგი ქვემოთ.");
    } catch (error) {
      alert("შეცდომა გაგზავნისას.");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDownloadLogFile = () => {
    const blob = new Blob([rawSmsLogs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sms.log';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunMigration = async () => {
    if (!user.uid) return;
    setIsMigrating(true);
    try {
      const report = await MigrationService.migrateLocalData(user.uid);
      setMigrationReport(report);
      alert(report.success ? "მიგრაცია წარმატებით დასრულდა!" : "მიგრაციისას დაფიქსირდა შეცდომები.");
    } catch (err) {
      alert("კრიტიკული შეცდომა მიგრაციისას.");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">პარამეტრები</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">პლატფორმის ადმინისტრირება</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-[5px] border border-slate-200 overflow-x-auto">
          <button onClick={() => setActiveTab('branding')} className={`px-4 py-1.5 rounded-[5px] text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'branding' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ბრენდინგი & ფუნქციები</button>
          <button onClick={() => setActiveTab('sms')} className={`px-4 py-1.5 rounded-[5px] text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'sms' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>SMS & ლოგები</button>
          <button onClick={() => setActiveTab('permissions')} className={`px-4 py-1.5 rounded-[5px] text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'permissions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>წვდომები</button>
          <button onClick={() => setActiveTab('migration')} className={`px-4 py-1.5 rounded-[5px] text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'migration' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>მიგრაცია</button>
        </div>
      </div>

      {activeTab === 'branding' && (
        <div className="space-y-6">
          <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-10 space-y-12">
            <div className="max-w-md space-y-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">აპლიკაციის სახელი</label>
              <input type="text" value={settings.appTitle || ''} onChange={(e) => onUpdateSettings({ ...settings, appTitle: e.target.value })} placeholder="Zenith Portal" className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-5 py-3 text-sm font-black text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pt-6 border-t border-slate-100">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ლოგო</label>
                <div className="relative group">
                  <div onClick={() => logoInputRef.current?.click()} className="w-full h-44 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[5px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all overflow-hidden shadow-inner">
                    {settings.logoUrl ? <img src={settings.logoUrl} className="max-h-[80%] max-w-[80%] object-contain p-4" /> : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ატვირთეთ ლოგო</span>}
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                  </div>
                  {settings.logoUrl && <button onClick={(e) => { e.stopPropagation(); removeBrandingAsset('logo'); }} className="absolute top-3 right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 active:scale-90"><Icons.X /></button>}
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Favicon</label>
                <div className="relative group">
                  <div onClick={() => faviconInputRef.current?.click()} className="w-full h-44 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[5px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all overflow-hidden shadow-inner">
                    {settings.faviconUrl ? <img src={settings.faviconUrl} className="w-16 h-16 object-contain" /> : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ატვირთეთ Favicon</span>}
                    <input type="file" ref={faviconInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'favicon')} />
                  </div>
                  {settings.faviconUrl && <button onClick={(e) => { e.stopPropagation(); removeBrandingAsset('favicon'); }} className="absolute top-3 right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 active:scale-90"><Icons.X /></button>}
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">სათაურების ფონტი</label>
                <div onClick={() => headerFontRef.current?.click()} className="w-full h-44 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[5px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-all shadow-inner"><p className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight leading-none text-center px-6">{settings.headerFont ? settings.headerFont.name : 'სათაურის ნიმუში'}</p><input type="file" ref={headerFontRef} className="hidden" accept=".woff,.woff2,.ttf" onChange={(e) => handleFileUpload(e, 'header')} /></div>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ტექსტის ფონტი</label>
                <div onClick={() => bodyFontRef.current?.click()} className="w-full h-44 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[5px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-all shadow-inner"><p className="text-sm text-slate-600 font-bold text-center px-6 leading-relaxed">{settings.bodyFont ? settings.bodyFont.name : 'ძირითადი ტექსტის ნიმუში'}</p><input type="file" ref={bodyFontRef} className="hidden" accept=".woff,.woff2,.ttf" onChange={(e) => handleFileUpload(e, 'body')} /></div>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'sms' && (
        <div className="space-y-6">
          <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">SMS კონფიგურაცია</h3>
              <button onClick={handleTestSms} disabled={isSendingTest} className="px-8 py-3 bg-emerald-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-3 shadow-lg">{isSendingTest ? 'იგზავნება...' : <><Icons.Clock /> სატესტო გაგზავნა</>}</button>
            </div>
            <div className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">API KEY</label>
                        <input type="text" value={settings.smsApiKey || ''} onChange={e => onUpdateSettings({...settings, smsApiKey: e.target.value})} placeholder="API KEY" className="w-full border border-slate-200 px-5 py-3 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 bg-slate-50" />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">დრო (HH:MM)</label>
                        <input type="time" value={settings.birthdaySmsTime || '09:00'} onChange={e => onUpdateSettings({...settings, birthdaySmsTime: e.target.value})} className="w-full border border-slate-200 px-5 py-3 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 bg-slate-50" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">გამომგზავნი (SENDER ID)</label>
                      <input type="text" value={settings.smsSenderName || ''} onChange={e => onUpdateSettings({...settings, smsSenderName: e.target.value})} placeholder="smsoffice" className="w-full border border-slate-200 px-5 py-3 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 bg-slate-50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">დაბადების დღის ტექსტი</label>
                    <textarea rows={5} value={settings.userSmsTemplate || ''} onChange={e => onUpdateSettings({...settings, userSmsTemplate: e.target.value})} className="w-full border border-slate-200 px-5 py-4 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 resize-none bg-slate-50 leading-relaxed" />
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">ადმინისტრაციის ნომრები</label>
                    <input type="text" value={settings.adminPhone || ''} onChange={e => onUpdateSettings({...settings, adminPhone: e.target.value})} placeholder="5XXXXXXXX" className="w-full border border-slate-200 px-5 py-3 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">ბუღალტერიის ნომრები</label>
                    <input type="text" value={settings.accountantPhone || ''} onChange={e => onUpdateSettings({...settings, accountantPhone: e.target.value})} placeholder="5XXXXXXXX" className="w-full border border-slate-200 px-5 py-3 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">HR დეპარტამენტის ნომრები</label>
                    <input type="text" value={settings.hrPhone || ''} onChange={e => onUpdateSettings({...settings, hrPhone: e.target.value})} placeholder="5XXXXXXXX" className="w-full border border-slate-200 px-5 py-3 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 bg-slate-50" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 rounded-[5px] shadow-2xl overflow-hidden border border-slate-800">
            <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest">ლოკალური ფაილი: sms.log</h3>
              </div>
              <div className="flex gap-4">
                <button onClick={() => { if(window.confirm('ნამდვილად გსურთ ლოგების გასუფთავება?')) SMSService.clearLogs(); }} className="text-rose-400 text-[10px] font-black uppercase hover:underline">ლოგების წაშლა</button>
                <button onClick={handleDownloadLogFile} className="px-6 py-2 bg-indigo-600 text-white rounded-[3px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg"><Icons.Newspaper /> ჩამოტვირთვა (.log)</button>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-black/40 rounded-[3px] p-6 font-mono text-[11px] leading-relaxed text-emerald-400/90 h-[400px] overflow-y-auto custom-scrollbar border border-slate-800 shadow-inner">
                {rawSmsLogs.split('\n').map((line, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-slate-500 mr-2">{(rawSmsLogs.split('\n').length - i).toString().padStart(3, '0')}</span>
                    {line}
                  </div>
                ))}
                {!rawSmsLogs.trim() && <div className="text-slate-600 italic">LOG FILE IS EMPTY. WAITING FOR EVENTS...</div>}
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="space-y-6">
          <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">წვდომის კონტროლი (RBAC)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase border-b border-slate-100 tracking-widest"><th className="px-8 py-6">მოდული / ფუნქცია</th>{ROLES.map(role => <th key={role} className="px-8 py-6 text-center">{role}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {Object.values(View).map((view) => (
                    <tr key={view} className="hover:bg-slate-50/50">
                      <td className="px-8 py-6 font-black text-[11px] text-slate-700 uppercase tracking-tight">{VIEW_LABELS[view]}</td>
                      {ROLES.map(role => {
                        const isProtected = role === 'Admin' && view === View.ADMIN;
                        const rolePerms = (settings.rolePermissions && settings.rolePermissions[role]) ? settings.rolePermissions[role] : (DEFAULT_ROLE_PERMISSIONS[role] || []);
                        const isEnabled = isProtected || rolePerms.includes(view);
                        return (
                          <td key={`${role}-${view}`} className="px-8 py-6 text-center">
                            <button onClick={() => { if (isProtected) return; const updated = isEnabled ? rolePerms.filter(v => v !== view) : [...rolePerms, view]; onUpdateSettings({ ...settings, rolePermissions: { ...settings.rolePermissions, [role]: updated } }); }} className={`w-6 h-6 rounded-[5px] border-2 flex items-center justify-center mx-auto transition-all ${isEnabled ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200'} ${isProtected ? 'opacity-40 cursor-not-allowed border-indigo-300' : 'hover:border-indigo-400'}`}><Icons.Check /></button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'migration' && (
        <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Firestore სინქრონიზაცია</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">ადგილობრივი მონაცების გადატანა ღრუბელში</p>
            </div>
            <button onClick={handleRunMigration} disabled={isMigrating} className="px-12 py-4 bg-indigo-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl disabled:opacity-50">{isMigrating ? 'მიმდინარეობს...' : 'სინქრონიზაცია'}</button>
          </div>
          {migrationReport && <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-[5px] text-[10px] font-bold text-slate-600 uppercase">მიგრაცია დასრულდა: {new Date(migrationReport.timestamp).toLocaleString('ka-GE')}</div>}
        </section>
      )}
    </div>
  );
};

export default AdminPanel;