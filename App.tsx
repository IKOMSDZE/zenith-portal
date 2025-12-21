
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import AttendanceTracker from './components/AttendanceTracker';
import AttendanceReportModule from './components/AttendanceReportModule';
import AdminPanel from './components/AdminPanel';
import VacationManagement from './components/VacationManagement';
import CashierModule from './components/CashierModule';
import CompanyStructureModule from './components/CompanyStructureModule';
import AccountantModule from './components/AccountantModule';
import UsersModule from './components/UsersModule';
import ProfileModule from './components/ProfileModule';
import NewsFeed from './components/NewsFeed';
import { View, User, BranchConfig, VacationRecord, AttendanceRecord, PositionMapping, NewsItem } from './types';
import { Icons } from './constants';
import { Database, SystemSettings } from './services/database';
import { SMSService } from './services/smsService';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const [user, setUser] = useState<User>(Database.getCurrentUser());
  const [employees, setEmployees] = useState<User[]>([]);
  const [branches, setBranches] = useState<BranchConfig[]>([]);
  const [vacations, setVacations] = useState<VacationRecord[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [positions, setPositions] = useState<PositionMapping[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Initialize Data from Firebase
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        await Database.init();
        const [
          dbSettings,
          dbEmployees,
          dbBranches,
          dbVacations,
          dbAttendance,
          dbPositions,
          dbDepartments,
          dbNews
        ] = await Promise.all([
          Database.getSettings(),
          Database.getEmployees(),
          Database.getBranches(),
          Database.getVacations(),
          Database.getAttendanceLogs(),
          Database.getPositions(),
          Database.getDepartments(),
          Database.getNews()
        ]);

        setSettings(dbSettings);
        setEmployees(dbEmployees);
        setBranches(dbBranches);
        setVacations(dbVacations);
        setAttendanceLogs(dbAttendance);
        setPositions(dbPositions);
        setDepartments(dbDepartments);
        setNews(dbNews);

        // Sync local current user state with DB record
        const me = dbEmployees.find(e => e.id === user.id);
        if (me) setUser(me);
      } catch (err) {
        console.error("Failed to load data from Firebase", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();

    const handleSettingsUpdate = (e: any) => setSettings(e.detail);
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  // Global Branding Injection
  useEffect(() => {
    if (!settings) return;
    const styleId = 'zenith-custom-branding-style';
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;

    if (settings.headerFont || settings.bodyFont) {
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }
      
      let css = '';
      if (settings.headerFont) {
        css += `
          @font-face {
            font-family: 'HeaderFont';
            src: url('${settings.headerFont.data}') format('${settings.headerFont.format}');
            font-weight: bold;
          }
          h1, h2, h3, h4, h5, h6, .font-black, .font-bold, button, label, th, .uppercase {
            font-family: 'HeaderFont', sans-serif !important;
          }
        `;
      }
      if (settings.bodyFont) {
        css += `
          @font-face {
            font-family: 'BodyFont';
            src: url('${settings.bodyFont.data}') format('${settings.bodyFont.format}');
          }
          body, p, span, td, input, textarea, select {
            font-family: 'BodyFont', sans-serif !important;
          }
        `;
      }
      styleTag.innerHTML = css;
    }
  }, [settings]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateUserInfo = async (updates: Partial<User>) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    await Database.setCurrentUser(updatedUser);
    const updatedEmployees = await Database.getEmployees();
    setEmployees(updatedEmployees);
  };

  const handleUpdateEmployees = async (newEmployees: User[]) => {
    await Database.setEmployees(newEmployees);
    setEmployees(newEmployees);
    const me = newEmployees.find(e => e.id === user.id);
    if (me) setUser(me);
  };

  const handleUpdateVacations = async (newVacations: VacationRecord[]) => {
    await Database.setVacations(newVacations);
    setVacations(newVacations);
  };

  const handleUpdateBranches = async (newBranches: BranchConfig[]) => {
    await Database.setBranches(newBranches);
    setBranches(newBranches);
  };

  const handleUpdatePositions = async (newPositions: PositionMapping[]) => {
    await Database.setPositions(newPositions);
    setPositions(newPositions);
  };

  const handleUpdateDepartments = async (newDepts: string[]) => {
    await Database.setDepartments(newDepts);
    setDepartments(newDepts);
  };

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    await Database.setSettings(newSettings);
    setSettings(newSettings);
  };

  const handleNewAttendance = async (log: AttendanceRecord) => {
    await Database.saveAttendanceLog(log);
    const updated = await Database.getAttendanceLogs();
    setAttendanceLogs(updated);
  };

  const handleUpdateAttendance = async (log: AttendanceRecord) => {
    await Database.updateAttendanceLog(log);
    const updated = await Database.getAttendanceLogs();
    setAttendanceLogs(updated);
  };

  const handleBirthdayChange = async (newDate: string) => {
    const oldPhone = user.phoneNumber;
    await updateUserInfo({ birthday: newDate, lastBirthdayUpdate: new Date().toISOString() });
    if (oldPhone) await SMSService.sendBirthdayUpdateNotification(user.name, oldPhone, newDate);
  };

  const isModuleAllowed = (view: View) => {
    if (!settings) return false;
    const allowed = settings.rolePermissions[user.role] || [];
    return allowed.includes(view);
  };

  if (loading || !settings) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white font-black text-xs uppercase tracking-widest">BH Portal Migration...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!isModuleAllowed(activeView)) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
           <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4"><Icons.Alert /></div>
           <h3 className="text-xl font-black text-slate-900 uppercase">წვდომა შეზღუდულია</h3>
           <button onClick={() => setActiveView(View.DASHBOARD)} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-[5px] text-[10px] font-black uppercase">მთავარზე დაბრუნება</button>
        </div>
      );
    }

    switch (activeView) {
      case View.DASHBOARD:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div onClick={() => isModuleAllowed(View.VACATIONS) && setActiveView(View.VACATIONS)} className="bg-indigo-600 rounded-[5px] p-5 text-white shadow-xl cursor-pointer h-36 flex flex-col justify-between">
                <div>
                  <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">შვებულების ბალანსი</p>
                  <h4 className="text-3xl font-black">{user.vacationDaysTotal - user.vacationDaysUsed} <span className="text-sm font-medium opacity-60">დღე</span></h4>
                </div>
                <div className="w-full bg-white/20 rounded-[5px] h-1.5 overflow-hidden">
                  <div className="bg-white h-full transition-all duration-1000" style={{ width: `${((user.vacationDaysTotal - user.vacationDaysUsed) / user.vacationDaysTotal) * 100}%` }}></div>
                </div>
              </div>
              <div className="bg-white rounded-[5px] p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-36">
                <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">დეპარტამენტი</p><h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{user.department}</h4></div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-2"><span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">პოზიცია</span><span className="font-bold text-slate-800 text-xs">{user.position}</span></div>
              </div>
              <div className="bg-slate-900 rounded-[5px] p-5 text-white shadow-xl flex flex-col justify-between h-36">
                <div className="flex items-center space-x-2 text-indigo-400 font-black text-[10px] uppercase tracking-widest"><Icons.Clock /><span>სტატუსი</span></div>
                <p className="text-slate-300 font-medium text-xs italic">{user.checkedIn ? `ცვლა დაწყებულია: ${user.lastCheckIn}` : "ცვლა არ არის დაწყებული"}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-7 space-y-6">
                 {isModuleAllowed(View.ATTENDANCE) && (
                    <AttendanceTracker 
                      user={user} 
                      onUpdateUser={updateUserInfo} 
                      onAddRecord={handleNewAttendance} 
                      onUpdateRecord={handleUpdateAttendance}
                      attendanceLogs={attendanceLogs.filter(l => l.employeeId === user.id)} 
                      branches={branches} 
                    />
                 )}
                 <NewsFeed news={news} />
               </div>
               <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white p-6 rounded-[5px] border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">კომპანიის ფაილები</h3>
                    <div className="space-y-2">
                       {['შინაგანაწესი.pdf', 'ბრენდბუქი_2024.pdf'].map(file => (
                          <div key={file} className="flex items-center justify-between p-3 border border-slate-50 rounded-[5px] hover:bg-slate-50 cursor-pointer group">
                             <span className="text-[11px] font-bold text-slate-700">{file}</span>
                             <Icons.Newspaper />
                          </div>
                       ))}
                    </div>
                  </div>
               </div>
            </div>
          </div>
        );
      case View.ATTENDANCE: return <AttendanceTracker user={user} onUpdateUser={updateUserInfo} onAddRecord={handleNewAttendance} onUpdateRecord={handleUpdateAttendance} attendanceLogs={attendanceLogs.filter(l => l.employeeId === user.id)} branches={branches} />;
      case View.ATTENDANCE_REPORT: return <AttendanceReportModule branches={branches} attendanceLogs={attendanceLogs} />;
      case View.USERS: return <UsersModule employees={employees} onUpdateEmployees={handleUpdateEmployees} positions={positions} />;
      case View.ACCOUNTANT: return <AccountantModule branches={branches} />;
      case View.CASHIER: return <CashierModule user={user} />;
      case View.COMPANY_STRUCTURE: return <CompanyStructureModule branches={branches} onUpdateBranches={handleUpdateBranches} positions={positions} onUpdatePositions={handleUpdatePositions} departments={departments} onUpdateDepartments={handleUpdateDepartments} />;
      case View.VACATIONS: return <VacationManagement user={user} employees={employees} onUpdateEmployees={handleUpdateEmployees} vacations={vacations} onUpdateVacations={handleUpdateVacations} settings={settings} />;
      case View.PROFILE: return <ProfileModule user={user} onUpdateUser={updateUserInfo} settings={settings!} canEditBirthday={true} onBirthdayChange={handleBirthdayChange} />;
      case View.ADMIN: return <AdminPanel user={user} settings={settings!} onUpdateSettings={handleUpdateSettings} employees={employees} onUpdateEmployees={handleUpdateEmployees} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar activeView={activeView} setView={setActiveView} user={user} logoUrl={settings.logoUrl} settings={settings} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-30 shadow-sm">
          <div className="lg:hidden flex items-center gap-2">
            {settings.logoUrl ? <img src={settings.logoUrl} className="h-8" /> : <div className="w-8 h-8 bg-indigo-600 rounded text-white flex items-center justify-center font-black">Z</div>}
          </div>
          <div className="hidden lg:block font-black text-[10px] text-slate-400 uppercase tracking-widest">BH Cloud Portal</div>
          <div className="flex items-center space-x-6" ref={menuRef}>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
               <div className="text-right hidden sm:block">
                  <p className="text-xs font-black uppercase text-slate-900">{user.name}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{user.role}</p>
               </div>
               <img src={user.avatar} className="w-9 h-9 rounded-[5px] object-cover border border-slate-200" />
            </div>
            {isProfileMenuOpen && (
              <div className="absolute top-14 right-8 w-64 bg-white rounded shadow-2xl border border-slate-100 p-4 z-50">
                <button onClick={() => setActiveView(View.PROFILE)} className="w-full text-left p-2 hover:bg-slate-50 text-[10px] font-black uppercase">პროფილი</button>
                <div className="h-[1px] bg-slate-100 my-2"></div>
                <button className="w-full text-left p-2 hover:bg-rose-50 text-rose-500 text-[10px] font-black uppercase">გამოსვლა</button>
              </div>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;
