
import React, { useState, useEffect, useMemo } from 'react';
import { User, View, AttendanceRecord, BranchConfig } from '../types';
import { Icons } from '../constants';

interface DashboardProps {
  user: User;
  employees: User[];
  onUpdateUser: (updates: Partial<User>) => void;
  onAddRecord: (record: AttendanceRecord) => void;
  isAttendanceEnabled: boolean;
  branches: BranchConfig[];
  setActiveView: (view: View) => void;
  attendanceLogs: AttendanceRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({
  user,
  employees,
  onUpdateUser,
  onAddRecord,
  isAttendanceEnabled,
  branches,
  setActiveView,
  attendanceLogs
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayDateStr = useMemo(() => 
    currentTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    [currentTime]
  );

  const hasCheckedInToday = useMemo(() => {
    return attendanceLogs.some(log => log.date === todayDateStr && log.employeeId === user.id);
  }, [attendanceLogs, user.id, todayDateStr]);

  const branchConfig = useMemo(() => {
    return branches.find(b => b.name === user.branch);
  }, [branches, user.branch]);

  const calculateLateness = (now: Date): boolean => {
    if (!branchConfig) return false;
    const [openH, openM] = branchConfig.openTime.split(':').map(Number);
    const openDate = new Date(now);
    openDate.setHours(openH, openM, 0, 0);
    const diffMins = (now.getTime() - openDate.getTime()) / (1000 * 60);
    return diffMins > branchConfig.lateThreshold;
  };

  const handleArrive = async () => {
    if (hasCheckedInToday || !user.branch || !isAttendanceEnabled) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const isLate = calculateLateness(now);
    const newRecord: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: user.id,
      employeeName: user.name,
      date: todayDateStr,
      checkIn: timeStr,
      status: 'Complete',
      branch: user.branch,
      isLate
    };
    await onAddRecord(newRecord);
    await onUpdateUser({ checkedIn: true, lastCheckIn: timeStr });
  };

  const myRecentAttendance = useMemo(() => {
    return attendanceLogs
      .filter(log => log.employeeId === user.id)
      .slice(0, 3);
  }, [attendanceLogs, user.id]);

  const remainingVacation = user.vacationDaysTotal - user.vacationDaysUsed;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-white p-10 rounded-[5px] border border-slate-200 shadow-sm">
        <div className="space-y-3">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">მთავარი პანელი</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">გამარჯობა, {user.name.split(' ')[0]}!</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{user.position} • {user.branch || 'ფილიალი არაა შერჩეული'}</p>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{todayDateStr}</p>
            <p className="text-4xl font-black text-slate-900 tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
          </div>
          <div className="w-[1px] h-12 bg-slate-100 hidden sm:block"></div>
          <div className="hidden sm:block space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">სტატუსი</p>
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${user.checkedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
              <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">{user.checkedIn ? 'აქტიური' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clock-in section only displayed if enabled for user's department */}
      {isAttendanceEnabled && (
        <div className="grid grid-cols-1 gap-8">
          <div className="w-full">
            <div className="bg-white rounded-[5px] p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">სამუშაო გრაფიკი</h3>
                    {hasCheckedInToday && (
                      <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">დასრულებული</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 font-bold leading-relaxed max-w-sm uppercase tracking-wide">
                    დღეს თქვენი სამუშაო ლოკაციაა <span className="text-indigo-600 font-black">{user.branch || '—'}</span>. 
                    გთხოვთ დააფიქსიროთ მოსვლა სისტემაში.
                  </p>
                </div>

                {hasCheckedInToday && (
                  <div className="flex items-center gap-5 text-emerald-600 bg-emerald-50 w-fit px-8 py-5 rounded-[5px] border border-emerald-100 animate-in zoom-in-95 shadow-sm">
                    <div className="w-12 h-12 rounded-[5px] bg-emerald-100 flex items-center justify-center scale-110">
                      <Icons.Check />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">მოსვლა დაფიქსირდა</p>
                      <p className="text-lg font-black uppercase tracking-widest tabular-nums leading-none">{user.lastCheckIn}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 rounded-[5px] border border-slate-100 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">დეპარტამენტი</p>
                    <p className="text-xs font-black text-slate-800 uppercase leading-none">{user.department}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[5px] border border-slate-100 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">პოზიცია</p>
                    <p className="text-xs font-black text-slate-800 uppercase truncate leading-none" title={user.position}>{user.position}</p>
                  </div>
                </div>
              </div>
              
              <div className="relative group p-4">
                <button 
                  onClick={handleArrive}
                  disabled={!user.branch || hasCheckedInToday}
                  className={`relative w-64 h-64 rounded-[5px] border-4 flex flex-col items-center justify-center gap-4 transition-all shadow-2xl active:scale-95
                    ${hasCheckedInToday 
                      ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' 
                      : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700 hover:border-indigo-600'}`}
                >
                  <div className={`${hasCheckedInToday ? 'scale-110' : 'scale-[1.8]'} mb-2 transition-transform duration-300`}>
                    {hasCheckedInToday ? <Icons.Check /> : <Icons.Clock />}
                  </div>
                  <span className="text-2xl font-black uppercase tracking-widest leading-none">
                    {hasCheckedInToday ? 'მოვედი' : 'დაწყება'}
                  </span>
                  <span className="text-[11px] opacity-60 font-black uppercase tracking-widest leading-none">
                    {hasCheckedInToday ? 'COMPLETED' : 'CLOCK IN'}
                  </span>
                </button>
                {!user.branch && !hasCheckedInToday && (
                  <p className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black text-rose-500 uppercase tracking-widest animate-pulse whitespace-nowrap">აირჩიეთ ფილიალი</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats and Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-8">
          {/* Vacation Card */}
          <div 
            onClick={() => setActiveView(View.VACATIONS)}
            className="bg-indigo-600 rounded-[5px] p-10 text-white shadow-xl cursor-pointer hover:bg-indigo-700 transition-all flex flex-col justify-between h-56 relative overflow-hidden group"
          >
            <div className="relative z-10 space-y-2">
              <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest leading-none">შვებულების ბალანსი</p>
              <h4 className="text-7xl font-black tabular-nums leading-none">{remainingVacation}</h4>
              <p className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">დარჩენილი დღეები</p>
            </div>
            <div className="relative z-10 w-full bg-white/15 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-1000 ease-out" 
                style={{ width: `${(remainingVacation / user.vacationDaysTotal) * 100}%` }}
              ></div>
            </div>
            <div className="absolute -right-8 -bottom-8 text-white opacity-5 scale-[5] group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
              <Icons.Calendar />
            </div>
          </div>

          {/* Profile Card */}
          <div 
            onClick={() => setActiveView(View.PROFILE)}
            className="bg-white rounded-[5px] p-10 border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors h-56 flex flex-col justify-between"
          >
            <div className="flex items-center gap-8">
              <img src={user.avatar} className="w-20 h-20 rounded-[5px] object-cover shadow-lg border-4 border-white ring-1 ring-slate-100" alt="Avatar" />
              <div className="overflow-hidden space-y-2">
                <p className="text-xl font-black text-slate-900 uppercase leading-none tracking-tight truncate">{user.name}</p>
                <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest truncate">{user.position}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ID: {user.id}</p>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
               <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest">პროფილის მართვა</span>
               <div className="w-10 h-10 rounded-[5px] bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-md">
                 <span className="text-lg">→</span>
               </div>
            </div>
          </div>
        </div>

        {/* Recent Activity - 8 Columns */}
        <div className="lg:col-span-8 bg-white rounded-[5px] p-12 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div className="space-y-3">
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">ჩემი აქტივობა</h3>
              <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">ბოლო 3 ჩანაწერი სისტემაში</p>
            </div>
            <button 
              onClick={() => setActiveView(View.ATTENDANCE_REPORT)} 
              className="w-12 h-12 rounded-[5px] bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
            >
              <span className="text-lg">→</span>
            </button>
          </div>
          
          <div className="space-y-5 flex-1">
            {myRecentAttendance.length > 0 ? (
              myRecentAttendance.map((log) => (
                <div key={log.id} className="p-6 bg-slate-50 rounded-[5px] border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-6">
                    <div className={`w-4 h-4 rounded-full ${log.isLate ? 'bg-rose-500' : 'bg-emerald-500'} shadow-md`}></div>
                    <div className="space-y-2">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-none">{log.date}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{log.branch}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                     <p className="text-2xl font-black text-indigo-600 tabular-nums leading-none">{log.checkIn}</p>
                     <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${log.isLate ? 'text-rose-500' : 'text-emerald-500'}`}>
                       {log.isLate ? 'დაგვიანება' : 'დროული'}
                     </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[5px]">
                <p className="text-[11px] text-slate-300 font-black uppercase tracking-widest italic">აქტივობა არ მოიძებნა</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
