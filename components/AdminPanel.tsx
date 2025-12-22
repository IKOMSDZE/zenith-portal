
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { User, UserRole, View, NewsItem } from '../types';
import { Database, SystemSettings, CustomFont, SMSLog } from '../services/database';
import { SMSService } from '../services/smsService';

const ROLES: UserRole[] = ['Admin', 'Manager', 'Editor', 'Accountant', 'Employee', 'HR'];

const VIEW_LABELS: Record<string, string> = {
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

interface AdminPanelProps {
  user: User;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  employees: User[];
  onUpdateEmployees: (newEmployees: User[]) => void;
  news: NewsItem[];
  onSaveNews: (item: NewsItem) => Promise<void>;
  onDeleteNews: (id: string) => Promise<void>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user, settings, onUpdateSettings, employees, onUpdateEmployees, news, onSaveNews, onDeleteNews }) => {
  const [activeTab, setActiveTab] = useState<'branding' | 'permissions' | 'sms' | 'news'>('branding');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);

  // News form state
  const [newsForm, setNewsForm] = useState<Partial<NewsItem>>({
    title: '',
    content: '',
    type: 'Info'
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const headerFontRef = useRef<HTMLInputElement>(null);
  const bodyFontRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Database.getSMSLogs().then(setSmsLogs);
    const handleLogsUpdate = (e: any) => {
      setSmsLogs(e.detail);
    };
    window.addEventListener('smsLogsUpdated', handleLogsUpdate);
    return () => window.removeEventListener('smsLogsUpdated', handleLogsUpdate);
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
    if (!settings.smsApiKey) {
      alert("გთხოვთ მიუთითოთ API Key");
      return;
    }
    if (!user.phoneNumber) {
      alert("თქვენს პროფილში ტელეფონის ნომერი არ არის მითითებული ტესტირებისთვის");
      return;
    }
    
    setIsSendingTest(true);
    try {
      const message = `Zenith Portal Test SMS. Connection successful.`;
      await SMSService.send(user.phoneNumber, message, 'Test');
      alert("სატესტო SMS გაიგზავნა!");
      const updatedLogs = await Database.getSMSLogs();
      setSmsLogs(updatedLogs);
    } catch (error) {
      console.error("[Test] SMS failed", error);
      alert("შეცდომა გაგზავნისას.");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsForm.title || !newsForm.content) return;
    
    const newItem: NewsItem = {
      id: `news-${Date.now()}`,
      title: newsForm.title,
      content: newsForm.content,
      type: (newsForm.type as any) || 'Info',
      date: new Date().toLocaleDateString('ka-GE'),
      author: user.name
    };
    
    await onSaveNews(newItem);
    setNewsForm({ title: '', content: '', type: 'Info' });
    alert('სიახლე დამატებულია');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">ადმინისტრირება</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">პლატფორმის მართვა</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-[5px] border border-slate-200 overflow-x-auto">
          <button onClick={() => setActiveTab('branding')} className={`px-4 py-1.5 rounded-[5px] text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'branding' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ბრენდინგი</button>
          <button onClick={() => setActiveTab('sms')} className={`px-4 py-1.5 rounded-[5px] text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'sms' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>SMS</button>
          <button onClick={() => setActiveTab('permissions')} className={`px-4 py-1.5 rounded-[5px] text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'permissions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>წვდომები</button>
          <button onClick={() => setActiveTab('news')} className={`px-4 py-1.5 rounded-[5px] text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'news' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>სიახლეები</button>
        </div>
      </div>

      {activeTab === 'branding' && (
        <div className="space-y-6">
          <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-10 space-y-10">
            <div className="max-w-md space-y-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">აპლიკაციის სახელი</label>
              <input 
                type="text" 
                value={settings.appTitle || ''} 
                onChange={(e) => onUpdateSettings({ ...settings, appTitle: e.target.value })}
                placeholder="Zenith Portal"
                className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-5 py-3 text-sm font-black text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ლოგოს რედაქტირება</label>
                <div className="relative group">
                  <div onClick={() => logoInputRef.current?.click()} className="w-full h-44 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[5px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all overflow-hidden shadow-inner">
                    {settings.logoUrl ? <img src={settings.logoUrl} className="max-h-[80%] max-w-[80%] object-contain p-4" /> : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ატვირთეთ ლოგო</span>}
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                  </div>
                  {settings.logoUrl && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeBrandingAsset('logo'); }}
                      className="absolute top-3 right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 active:scale-90"
                      title="ლოგოს წაშლა"
                    >
                      <Icons.X />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Favicon-ის რედაქტირება</label>
                <div className="relative group">
                  <div onClick={() => faviconInputRef.current?.click()} className="w-full h-44 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[5px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all overflow-hidden shadow-inner">
                    {settings.faviconUrl ? <img src={settings.faviconUrl} className="w-16 h-16 object-contain" /> : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ატვირთეთ Favicon</span>}
                    <input type="file" ref={faviconInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'favicon')} />
                  </div>
                  {settings.faviconUrl && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeBrandingAsset('favicon'); }}
                      className="absolute top-3 right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 active:scale-90"
                      title="Favicon-ის წაშლა"
                    >
                      <Icons.X />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">სათაურების ფონტი</label>
                <div onClick={() => headerFontRef.current?.click()} className="w-full h-44 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[5px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-all shadow-inner">
                  <p className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight leading-none text-center px-6">
                    {settings.headerFont ? settings.headerFont.name : 'სათაურის ნიმუში'}
                  </p>
                  <input type="file" ref={headerFontRef} className="hidden" accept=".woff,.woff2,.ttf" onChange={(e) => handleFileUpload(e, 'header')} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ტექსტის ფონტი</label>
                <div onClick={() => bodyFontRef.current?.click()} className="w-full h-44 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[5px] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-all shadow-inner">
                  <p className="text-sm text-slate-600 font-bold text-center px-6 leading-relaxed">
                    {settings.bodyFont ? settings.bodyFont.name : 'ძირითადი ტექსტის ნიმუში'}
                  </p>
                  <input type="file" ref={bodyFontRef} className="hidden" accept=".woff,.woff2,.ttf" onChange={(e) => handleFileUpload(e, 'body')} />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'sms' && (
        <div className="space-y-6">
          <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">SMS პარამეტრები (SMSOffice)</h3>
              <button 
                onClick={handleTestSms}
                disabled={isSendingTest}
                className="px-8 py-3 bg-emerald-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-3 shadow-lg"
              >
                {isSendingTest ? 'იგზავნება...' : <><Icons.Clock /> სატესტო გაგზავნა</>}
              </button>
            </div>
            <div className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">API KEY</label>
                        <input 
                          type="text" 
                          value={settings.smsApiKey || ''} 
                          onChange={e => onUpdateSettings({...settings, smsApiKey: e.target.value})}
                          placeholder="API KEY"
                          className="w-full border border-slate-200 px-5 py-3 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 bg-slate-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">დრო (HH:MM)</label>
                        <input 
                          type="time" 
                          value={settings.birthdaySmsTime || '09:00'} 
                          onChange={e => onUpdateSettings({...settings, birthdaySmsTime: e.target.value})}
                          className="w-full border border-slate-200 px-5 py-3 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 bg-slate-50"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">გამომგზავნი (SENDER ID)</label>
                      <input 
                        type="text" 
                        value={settings.smsSenderName || ''} 
                        onChange={e => onUpdateSettings({...settings, smsSenderName: e.target.value})}
                        placeholder="მაგ: smsoffice"
                        className="w-full border border-slate-200 px-5 py-3 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">დაბადების დღის ტექსტი</label>
                    <textarea 
                      rows={5}
                      value={settings.userSmsTemplate || ''}
                      onChange={e => onUpdateSettings({...settings, userSmsTemplate: e.target.value})}
                      placeholder="გილოცავთ დაბადების დღეს {name}!"
                      className="w-full border border-slate-200 px-5 py-4 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 resize-none bg-slate-50 leading-relaxed"
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ადმინისტრაციის ნომრები</label>
                    <input 
                      type="text" 
                      value={settings.adminPhone || ''} 
                      onChange={e => onUpdateSettings({...settings, adminPhone: e.target.value})}
                      placeholder="5XXXXXXXX, 5XXXXXXXX"
                      className="w-full border border-slate-200 px-5 py-3 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 bg-slate-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ბუღალტერიის ნომრები</label>
                    <input 
                      type="text" 
                      value={settings.accountantPhone || ''} 
                      onChange={e => onUpdateSettings({...settings, accountantPhone: e.target.value})}
                      placeholder="5XXXXXXXX, 5XXXXXXXX"
                      className="w-full border border-slate-200 px-5 py-3 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 bg-slate-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">HR დეპარტამენტის ნომრები</label>
                    <input 
                      type="text" 
                      value={settings.hrPhone || ''} 
                      onChange={e => onUpdateSettings({...settings, hrPhone: e.target.value})}
                      placeholder="5XXXXXXXX, 5XXXXXXXX"
                      className="w-full border border-slate-200 px-5 py-3 rounded-[5px] text-xs font-black outline-none focus:border-indigo-500 bg-slate-50"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-8 border-t border-slate-100 flex items-center justify-end">
                <button 
                  onClick={() => alert("პარამეტრები შენახულია")}
                  className="px-12 py-4 bg-slate-900 text-white rounded-[5px] text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl active:scale-95"
                >
                  შენახვა
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">გაგზავნის ისტორია</h3>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100 z-10">
                  <tr>
                    <th className="px-8 py-5">დრო</th>
                    <th className="px-8 py-5">ნომერი</th>
                    <th className="px-8 py-5">ტექსტი</th>
                    <th className="px-8 py-5">ტიპი</th>
                    <th className="px-8 py-5 text-right">სტატუსი</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {smsLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate-300 text-[11px] uppercase font-black italic tracking-widest">ისტორია ცარიელია</td>
                    </tr>
                  ) : (
                    smsLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 text-[11px] font-bold text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                        <td className="px-8 py-5 text-[11px] font-black text-slate-700">{log.to}</td>
                        <td className="px-8 py-5 text-[11px] text-slate-600 max-w-xs truncate" title={log.content}>{log.content}</td>
                        <td className="px-8 py-5">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-[3px] uppercase ${
                            log.type === 'Automation' ? 'bg-indigo-50 text-indigo-600' : 
                            log.type === 'Test' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex flex-col items-end">
                             <span className={`text-[10px] font-black uppercase tracking-wider ${log.status === 'Dispatched' ? 'text-emerald-500' : 'text-rose-500'}`}>
                               {log.status === 'Dispatched' ? 'გაიგზავნა' : 'შეცდომა'}
                             </span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{log.apiMessage}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'permissions' && (
        <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">წვდომის კონტროლი</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase border-b border-slate-100 tracking-widest"><th className="px-8 py-6">მოდული</th>{ROLES.map(role => <th key={role} className="px-8 py-6 text-center">{role}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-50">
                {Object.values(View).map((view) => (
                  <tr key={view} className="hover:bg-slate-50/50"><td className="px-8 py-6 font-black text-[11px] text-slate-700 uppercase tracking-tight">{VIEW_LABELS[view]}</td>
                    {ROLES.map(role => {
                      const isEnabled = settings.rolePermissions[role]?.includes(view);
                      return (<td key={`${role}-${view}`} className="px-8 py-6 text-center"><button onClick={() => {
                        const current = settings.rolePermissions[role] || [];
                        const updated = current.includes(view) ? current.filter(v => v !== view) : [...current, view];
                        onUpdateSettings({ ...settings, rolePermissions: { ...settings.rolePermissions, [role]: updated } });
                      }} className={`w-6 h-6 rounded-[5px] border-2 flex items-center justify-center mx-auto transition-all ${isEnabled ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200'}`}><Icons.Check /></button></td>);
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'news' && (
        <div className="space-y-6">
          <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden p-10">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8">სიახლის გამოქვეყნება</h3>
            <form onSubmit={handleNewsSubmit} className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">სათაური</label>
                <input 
                  type="text" 
                  value={newsForm.title} 
                  onChange={e => setNewsForm({...newsForm, title: e.target.value})}
                  placeholder="მაგ: ახალი ფილიალი ბათუმში"
                  className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-[5px] text-sm font-black outline-none focus:border-indigo-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">ტიპი</label>
                  <select 
                    value={newsForm.type} 
                    onChange={e => setNewsForm({...newsForm, type: e.target.value as any})}
                    className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-[5px] text-sm font-black outline-none"
                  >
                    <option value="Info">ინფორმაცია</option>
                    <option value="Success">წარმატება</option>
                    <option value="Alert">ყურადღება</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">შინაარსი</label>
                <textarea 
                  rows={4} 
                  value={newsForm.content} 
                  onChange={e => setNewsForm({...newsForm, content: e.target.value})}
                  placeholder="აღწერეთ სიახლე..."
                  className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-[5px] text-sm font-bold outline-none focus:border-indigo-600 resize-none"
                />
              </div>
              <button 
                type="submit"
                className="px-12 py-4 bg-slate-900 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
              >
                გამოქვეყნება
              </button>
            </form>
          </section>

          <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">არსებული სიახლეები</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {news.map(item => (
                <div key={item.id} className="p-8 flex items-start justify-between group">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-[3px] uppercase tracking-widest ${
                        item.type === 'Success' ? 'bg-emerald-50 text-emerald-600' :
                        item.type === 'Alert' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{item.date}</span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 uppercase">{item.title}</h4>
                    <p className="text-xs text-slate-500 font-bold max-w-2xl">{item.content}</p>
                  </div>
                  <button 
                    onClick={() => onDeleteNews(item.id)}
                    className="p-3 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              ))}
              {news.length === 0 && (
                <div className="p-12 text-center text-slate-300 font-black text-[10px] uppercase italic">სიახლეები არ არის</div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
