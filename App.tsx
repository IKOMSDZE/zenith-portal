
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AttendanceReportModule from './components/AttendanceReportModule';
import AdminPanel from './components/AdminPanel';
import VacationManagement from './components/VacationManagement';
import CashierModule from './components/CashierModule';
import CompanyStructureModule from './components/CompanyStructureModule';
import AccountantModule from './components/AccountantModule';
import UsersModule from './components/UsersModule';
import ProfileModule from './components/ProfileModule';
import Dashboard from './components/Dashboard';
import BranchSelectorPopup from './components/BranchSelectorPopup';
import LoginPage from './components/LoginPage';
import AIChat from './components/AIChat';
import { View, User, BranchConfig, VacationRecord, AttendanceRecord, PositionMapping, CashDeskRecord, NewsItem } from './types';
import { Icons, MOCK_USER } from './constants';
import { Database, SystemSettings } from './services/database';
import { SMSService } from './services/smsService';
import { AuthService } from './services/authService';
import { MigrationService } from './services/migrationService';

const App: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showBranchPopup, setShowBranchPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const sentTodayRef = useRef<Set<string>>(new Set());

  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const [user, setUser] = useState<User>(MOCK_USER);
  const [employees, setEmployees] = useState<User[]>([]);
  const [branches, setBranches] = useState<BranchConfig[]>([]);
  const [vacations, setVacations] = useState<VacationRecord[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [cashHistory, setCashHistory] = useState<CashDeskRecord[]>([]);
  const [positions, setPositions] = useState<PositionMapping[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);

  // Auth & Global Init
  useEffect(() => {
    const unsub = AuthService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        setIsLoading(true);
        await Database.init();
        
        // 1. Sync / Migrate Profile
        const profile = await Database.syncUserWithAuth(firebaseUser.uid, firebaseUser.email);
        
        if (profile) {
          setUser(profile);
          await Database.setCurrentUser(profile);
          setIsAuthenticated(true);

          // 2. Perform background migration of any existing local data (localStorage)
          setIsMigrating(true);
          try {
            await MigrationService.migrateLocalData(firebaseUser.uid);
          } catch (e) {
            console.error("Migration failed during session init", e);
          } finally {
            setIsMigrating(false);
          }
          
          // 3. Initial Data Fetching from Firebase
          const [
            fetchedSettings,
            fetchedEmployees,
            fetchedBranches,
            fetchedVacations,
            fetchedAttendance,
            fetchedCash,
            fetchedPositions,
            fetchedDepts,
            fetchedNews
          ] = await Promise.all([
            Database.getSettings(),
            Database.getEmployees(),
            Database.getBranches(),
            Database.getVacations(),
            Database.getAttendanceLogs(),
            Database.getCashHistory(),
            Database.getPositions(),
            Database.getDepartments(),
            Database.getNews()
          ]);

          setSettings(fetchedSettings);
          setEmployees(fetchedEmployees);
          setBranches(fetchedBranches);
          setVacations(fetchedVacations);
          setAttendanceLogs(fetchedAttendance);
          setCashHistory(fetchedCash);
          setPositions(fetchedPositions);
          setDepartments(fetchedDepts);
          setNews(fetchedNews);

          // Handle Branch Selector Logic
          const branchSelectorEnabled = (fetchedSettings.branchSelectorEnabledDepartments || []).includes(profile.department);
          const today = new Date().toISOString().split('T')[0];
          const lastPopDate = localStorage.getItem('zenith_last_branch_pop_date');

          if (branchSelectorEnabled && lastPopDate !== today) {
            setShowBranchPopup(true);
          }
        } else {
          // Profile not found despite successful auth
          AuthService.logout();
        }
        setIsLoading(false);
      } else {
        setIsAuthenticated(false);
        // Still need settings for login page logo/title if possible
        const fetchedSettings = await Database.getSettings();
        setSettings(fetchedSettings);
        setIsLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Settings update listener
  useEffect(() => {
    const handleSettingsUpdate = (e: any) => setSettings(e.detail);
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  // Application Title and Favicon Injection
  useEffect(() => {
    if (!settings) return;
    document.title = settings.appTitle || 'Zenith Portal';
    
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    if (settings.faviconUrl) {
      favicon.href = settings.faviconUrl;
    }
  }, [settings?.appTitle, settings?.faviconUrl]);

  // Birthday Automation
  useEffect(() => {
    if (!isAuthenticated || !settings) return;

    const checkBirthdays = async () => {
      const now = new Date();
      const currentHoursMinutes = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      if (currentHoursMinutes === '00:00') {
        sentTodayRef.current.clear();
      }

      if (currentHoursMinutes === (settings.birthdaySmsTime || '09:00')) {
        const todayMonth = now.getMonth() + 1;
        const todayDay = now.getDate();
        
        for (const emp of employees) {
          if (emp.birthday && !sentTodayRef.current.has(emp.id)) {
            const [bYear, bMonth, bDay] = emp.birthday.split('-').map(Number);
            if (todayMonth === bMonth && todayDay === bDay) {
              sentTodayRef.current.add(emp.id);
              try {
                await SMSService.sendBirthdayAlerts(emp.name, emp.phoneNumber || '');
              } catch (e) {
                console.error("[Automation] Failed to send birthday SMS", e);
              }
            }
          }
        }
      }
    };

    const interval = setInterval(checkBirthdays, 60000);
    return () => clearInterval(interval);
  }, [settings?.birthdaySmsTime, isAuthenticated, employees]);

  // Branding Injection (Fonts)
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
      if (settings.headerFont) css += `@font-face { font-family: 'HeaderFont'; src: url('${settings.headerFont.data}') format('${settings.headerFont.format}'); font-weight: bold; } h1, h2, h3, h4, h5, h6, .font-black, .font-bold, button, label, th, .uppercase { font-family: 'HeaderFont', sans-serif !important; }`;
      if (settings.bodyFont) css += `@font-face { font-family: 'BodyFont'; src: url('${settings.bodyFont.data}') format('${settings.bodyFont.format}'); font-weight: normal; } body, p, span, td, input, textarea, select { font-family: 'BodyFont', sans-serif !important; }`;
      styleTag.innerHTML = css;
    } else if (styleTag) styleTag.remove();
  }, [settings?.headerFont, settings?.bodyFont]);

  const handleLogin = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setIsAuthenticated(true);
    setActiveView(View.DASHBOARD);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    localStorage.removeItem('zenith_current_user');
    setIsAuthenticated(false);
  };

  const updateUserInfo = async (updates: Partial<User>) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    await Database.setCurrentUser(updatedUser);
    const updatedEmployees = await Database.getEmployees();
    setEmployees(updatedEmployees);
  };

  const handleUpdateEmployees = async (newEmployees: User[]) => {
    setEmployees(newEmployees);
    await Database.setEmployees(newEmployees);
    const curr = newEmployees.find(e => (e.uid && e.uid === user.uid) || e.id === user.id);
    if (curr) setUser(curr);
  };

  const handleDeleteUser = async (id: string) => {
    await Database.deleteUser(id);
    setEmployees(employees.filter(e => (e.uid || e.id) !== id));
  };

  const handleUpdateAttendance = async (log: AttendanceRecord) => {
    await Database.saveAttendanceLog(log);
    const updated = await Database.getAttendanceLogs();
    setAttendanceLogs(updated);
  };

  const handleDeleteAttendance = async (id: string) => {
    await Database.deleteAttendanceLog(id);
    setAttendanceLogs(attendanceLogs.filter(l => l.id !== id));
  };

  const handleUpdateBranches = async (newBranches: BranchConfig[]) => {
    setBranches(newBranches);
    await Database.setBranches(newBranches);
  };

  const handleDeleteBranch = async (name: string) => {
    await Database.deleteBranch(name);
    setBranches(branches.filter(b => b.name !== name));
  };

  const handleUpdatePositions = async (newPositions: PositionMapping[]) => {
    setPositions(newPositions);
    await Database.setPositions(newPositions);
  };

  const handleDeletePosition = async (title: string) => {
    await Database.deletePosition(title);
    setPositions(positions.filter(p => p.title !== title));
  };

  const handleUpdateDepartments = async (newDepts: string[]) => {
    setDepartments(newDepts);
    await Database.setDepartments(newDepts);
  };

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    await Database.setSettings(newSettings);
  };

  const handleSaveVacation = async (vacation: VacationRecord) => {
    await Database.saveVacation(vacation);
    const updated = await Database.getVacations();
    setVacations(updated);
  };

  const handleDeleteVacation = async (id: string) => {
    await Database.deleteVacation(id);
    setVacations(vacations.filter(v => v.id !== id));
  };

  const handleSaveCashRecord = async (record: CashDeskRecord) => {
    await Database.saveCashRecord(record);
    const updated = await Database.getCashHistory();
    setCashHistory(updated);
  };

  const handleDeleteCashRecord = async (id: string) => {
    await Database.deleteCashRecord(id);
    setCashHistory(cashHistory.filter(c => c.id !== id));
  };

  const handleSaveNews = async (newsItem: NewsItem) => {
    await Database.saveNews(newsItem);
    const updated = await Database.getNews();
    setNews(updated);
  };

  const handleDeleteNews = async (id: string) => {
    await Database.deleteNews(id);
    setNews(news.filter(n => n.id !== id));
  };

  const isModuleAllowed = (view: View) => {
    if (!settings) return false;
    return (settings.rolePermissions[user.role] || []).includes(view);
  }
  const isAttendanceEnabledForUser = useMemo(() => settings?.attendanceEnabledDepartments?.includes(user.department), [settings, user.department]);

  const handleBirthdayChange = async (newDate: string) => {
    if (!canEditBirthday) { alert("დაბადების თარიღის შეცვლა შესაძლებელია წელიწადში ერთხელ."); return; }
    const old = user.phoneNumber;
    await updateUserInfo({ birthday: newDate, lastBirthdayUpdate: new Date().toISOString() });
    if (old) await SMSService.sendBirthdayUpdateNotification(user.name, old, newDate);
  };

  const canEditBirthday = useMemo(() => {
    if (user.role === 'Admin') return true;
    if (!user.lastBirthdayUpdate) return true;
    const last = new Date(user.lastBirthdayUpdate);
    const now = new Date();
    return last.getFullYear() < now.getFullYear();
  }, [user.lastBirthdayUpdate, user.role]);

  const handleBranchSelect = async (branchName: string) => {
    await updateUserInfo({ branch: branchName });
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('zenith_last_branch_pop_date', today);
    setShowBranchPopup(false);
  };

  const renderContent = () => {
    if (!isModuleAllowed(activeView)) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
           <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4"><Icons.Alert /></div>
           <h3 className="text-xl font-black text-slate-900 uppercase">წვდომა შეზღუდულია</h3>
           <button onClick={() => setActiveView(View.DASHBOARD)} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest">მთავარზე დაბრუნება</button>
        </div>
      );
    }

    if (!settings) return null;

    switch (activeView) {
      case View.DASHBOARD:
        return (
          <Dashboard 
            user={user} 
            employees={employees}
            news={news}
            onUpdateUser={updateUserInfo} 
            onAddRecord={handleUpdateAttendance}
            isAttendanceEnabled={!!isAttendanceEnabledForUser}
            branches={branches}
            setActiveView={setActiveView}
            attendanceLogs={attendanceLogs}
          />
        );
      case View.ATTENDANCE_REPORT: return <AttendanceReportModule branches={branches} user={user} onDeleteAttendance={handleDeleteAttendance} onUpdateAttendance={handleUpdateAttendance} />;
      case View.USERS: return <UsersModule employees={employees} onUpdateEmployees={handleUpdateEmployees} onDeleteUser={handleDeleteUser} positions={positions} />;
      case View.ACCOUNTANT: return <AccountantModule branches={branches} cashHistory={cashHistory} onUpdateCashHistory={async (h) => { await Database.saveCashRecord(h[0]); const updated = await Database.getCashHistory(); setCashHistory(updated); }} onDeleteCashRecord={handleDeleteCashRecord} />;
      case View.CASHIER: return <CashierModule user={user} onUpdateCashHistory={handleSaveCashRecord} />;
      case View.COMPANY_STRUCTURE: return <CompanyStructureModule branches={branches} onUpdateBranches={handleUpdateBranches} onDeleteBranch={handleDeleteBranch} positions={positions} onUpdatePositions={handleUpdatePositions} onDeletePosition={handleDeletePosition} departments={departments} onUpdateDepartments={handleUpdateDepartments} settings={settings} onUpdateSettings={handleUpdateSettings} />;
      case View.VACATIONS: return < VacationManagement user={user} employees={employees} onUpdateEmployees={handleUpdateEmployees} vacations={vacations} onSaveVacation={handleSaveVacation} onDeleteVacation={handleDeleteVacation} settings={settings} />;
      case View.PROFILE: return <ProfileModule user={user} onUpdateUser={updateUserInfo} settings={settings} canEditBirthday={canEditBirthday} onBirthdayChange={handleBirthdayChange} />;
      case View.ADMIN: return <AdminPanel user={user} settings={settings} onUpdateSettings={handleUpdateSettings} employees={employees} onUpdateEmployees={handleUpdateEmployees} news={news} onSaveNews={handleSaveNews} onDeleteNews={handleDeleteNews} />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 bg-indigo-600 rounded-[5px] animate-bounce flex items-center justify-center text-white text-2xl font-black">Z</div>
        <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] animate-pulse">იტვირთება მონაცემები...</p>
      </div>
    );
  }

  if (!isAuthenticated || !settings) {
    return <LoginPage onLogin={handleLogin} logoUrl={settings?.logoUrl} appTitle={settings?.appTitle} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
      <Sidebar 
        activeView={activeView} 
        setView={setActiveView} 
        user={user} 
        logoUrl={settings.logoUrl} 
        settings={settings}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          user={user}
          settings={settings}
          activeView={activeView}
          isAttendanceEnabledForUser={!!isAttendanceEnabledForUser}
          branches={branches}
          updateUserInfo={updateUserInfo}
          setActiveView={setActiveView}
          onLogout={handleLogout}
        />
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {isMigrating && (
              <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-[5px] flex items-center gap-3 animate-pulse">
                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">მიმდინარეობს მონაცემების სინქრონიზაცია ღრუბელთან...</p>
              </div>
            )}
            {renderContent()}
          </div>
        </div>
      </main>

      <AIChat />

      {/* Branch Selector Popup Module */}
      {showBranchPopup && (
        <BranchSelectorPopup 
          user={user} 
          branches={branches} 
          onSelect={handleBranchSelect} 
          logoUrl={settings.logoUrl} 
        />
      )}
    </div>
  );
};

export default App;
