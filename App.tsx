
import React, { useState, useEffect, useMemo } from 'react';
import SidebarWrapper from './components/Sidebar';
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
import { View, User, BranchConfig, AttendanceRecord, PositionMapping } from './types';
import { MOCK_USER } from './constants';
import { Database, SystemSettings } from './services/database';
import { AuthService } from './services/authService';
import { where, orderBy, limit } from 'firebase/firestore';

const App: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showBranchPopup, setShowBranchPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  const [user, setUser] = useState<User>(MOCK_USER);
  const [branches, setBranches] = useState<BranchConfig[]>([]);
  const [positions, setPositions] = useState<PositionMapping[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const unsub = AuthService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        setIsLoading(true);
        
        const [
          fetchedSettings,
          fetchedBranches,
          fetchedPositions,
          fetchedDepts
        ] = await Promise.all([
          Database.getSettings(),
          Database.getBranches(),
          Database.getPositions(),
          Database.getDepartments()
        ]);

        setSettings(fetchedSettings);
        setBranches(fetchedBranches);
        setPositions(fetchedPositions);
        setDepartments(fetchedDepts);

        let profile = await Database.syncUserWithAuth(firebaseUser.uid, firebaseUser.email);
        
        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);

          const dashboardAttendance = await Database.getAttendanceLogs([
            where('employeeId', '==', profile.id),
            orderBy('date', 'desc'),
            limit(10)
          ]);
          setAttendanceLogs(dashboardAttendance.data);

          const branchSelectorEnabled = (fetchedSettings.branchSelectorEnabledDepartments || []).includes(profile.department);
          const today = new Date().toISOString().split('T')[0];
          const lastPopDate = localStorage.getItem('zenith_last_branch_pop_date');

          if (branchSelectorEnabled && lastPopDate !== today) {
            setShowBranchPopup(true);
          }
        } else {
          AuthService.logout();
        }
        setIsLoading(false);
      } else {
        setIsAuthenticated(false);
        Database.getSettings().then(setSettings);
        setIsLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    await Database.setSettings(newSettings);
  };

  // Dynamic Font Injection
  useEffect(() => {
    if (settings) {
      const styleEl = document.getElementById('dynamic-fonts') || document.createElement('style');
      styleEl.id = 'dynamic-fonts';
      let css = '';
      if (settings.headerFont) {
        css += `@font-face { font-family: 'HeaderCustom'; src: url('${settings.headerFont.data}') format('${settings.headerFont.format}'); } :root { --header-font: 'HeaderCustom', sans-serif; }`;
      }
      if (settings.bodyFont) {
        css += `@font-face { font-family: 'BodyCustom'; src: url('${settings.bodyFont.data}') format('${settings.bodyFont.format}'); } :root { --body-font: 'BodyCustom', sans-serif; }`;
      }
      styleEl.innerHTML = css;
      document.head.appendChild(styleEl);
    }
  }, [settings]);

  const isAttendanceEnabled = useMemo(() => {
    if (!settings) return false;
    return (settings.attendanceEnabledDepartments || []).includes(user.department);
  }, [settings, user.department]);

  const renderContent = () => {
    if (!settings) return null;

    switch (activeView) {
      case View.DASHBOARD:
        return <Dashboard user={user} onUpdateUser={u => { setUser({...user, ...u}); Database.setCurrentUser({...user, ...u}); }} onAddRecord={r => Database.saveAttendanceLog(r)} isAttendanceEnabled={isAttendanceEnabled} branches={branches} setActiveView={setActiveView} attendanceLogs={attendanceLogs} />;
      case View.ATTENDANCE_REPORT: 
        return <AttendanceReportModule branches={branches} user={user} onDeleteAttendance={id => Database.deleteAttendanceLog(id)} onUpdateAttendance={l => Database.saveAttendanceLog(l)} />;
      case View.USERS: 
        return <UsersModule positions={positions} onUpdateEmployees={async e => await Database.setEmployees(e)} onDeleteUser={id => Database.deleteUser(id)} />;
      case View.ACCOUNTANT: 
        return <AccountantModule branches={branches} cashHistory={[]} onUpdateCashHistory={async h => await Database.saveCashRecord(h[0])} onDeleteCashRecord={id => Database.deleteCashRecord(id)} />;
      case View.CASHIER: 
        return <CashierModule user={user} onUpdateCashHistory={r => Database.saveCashRecord(r)} />;
      case View.COMPANY_STRUCTURE: 
        return <CompanyStructureModule branches={branches} onUpdateBranches={b => Database.setBranches(b)} onDeleteBranch={n => Database.deleteBranch(n)} positions={positions} onUpdatePositions={p => Database.setPositions(p)} onDeletePosition={t => Database.deletePosition(t)} departments={departments} onUpdateDepartments={d => Database.setDepartments(d)} settings={settings} onUpdateSettings={handleUpdateSettings} />;
      case View.VACATIONS: 
        return <VacationManagement user={user} settings={settings} />;
      case View.PROFILE: 
        return <ProfileModule user={user} onUpdateUser={u => { setUser({...user, ...u}); Database.setCurrentUser({...user, ...u}); }} settings={settings} canEditBirthday={true} onBirthdayChange={async d => {}} />;
      case View.ADMIN: 
        return <AdminPanel user={user} settings={settings} onUpdateSettings={handleUpdateSettings} employees={[]} onUpdateEmployees={e => Database.setEmployees(e)} />;
      default: return null;
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase tracking-widest">იტვირთება...</div>;
  if (!isAuthenticated || !settings) return <LoginPage onLogin={u => { setUser(u); setIsAuthenticated(true); }} logoUrl={settings?.logoUrl} appTitle={settings?.appTitle} />;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden relative">
      <SidebarWrapper activeView={activeView} setView={setActiveView} user={user} logoUrl={settings.logoUrl} settings={settings} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header user={user} settings={settings} activeView={activeView} isAttendanceEnabledForUser={isAttendanceEnabled} branches={branches} updateUserInfo={u => { setUser({...user, ...u}); Database.setCurrentUser({...user, ...u}); }} setActiveView={setActiveView} onLogout={() => AuthService.logout()} />
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </div>
      </main>
      {showBranchPopup && <BranchSelectorPopup user={user} branches={branches} onSelect={b => { setUser({...user, branch: b}); Database.setCurrentUser({...user, branch: b}); setShowBranchPopup(false); }} logoUrl={settings.logoUrl} />}
    </div>
  );
};

export default App;
