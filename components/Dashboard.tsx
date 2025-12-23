
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

  // Logic for upcoming birthdays (exactly next 14 days)
  const upcomingBirthdays = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fourteenDaysLater = new Date(today);
    fourteenDaysLater.setDate(today.getDate() + 14);

    return employees
      .filter(emp => emp.birthday)
      .map(emp => {
        const [year, month, day] = emp.birthday!.split('-').map(Number);
        const bdayThisYear = new Date(today.getFullYear(), month - 1, day);
        if (bdayThisYear < today) {
          bdayThisYear.setFullYear(today.getFullYear() + 1);
        }
        return { ...emp, nextBday: bdayThisYear };
      })
      .filter(emp => emp.nextBday >= today && emp.nextBday <= fourteenDaysLater)
      .sort((a, b) => a.nextBday.getTime() - b.nextBday.getTime());
  }, [employees]);

  const last3Activities = useMemo(() => {
    return attendanceLogs
      .filter(log => log.employeeId === user.id)
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      })
      .slice(0, 3);
  }, [attendanceLogs, user.id]);

  const handleArrive = async () => {
    if (hasCheckedInToday || !user.branch || !isAttendanceEnabled) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    
    const branchConfig = branches.find(b => b.name === user.branch);
    let isLate = false;
    if (branchConfig) {
      const [openH, openM] = branchConfig.openTime.split(':').map(Number);
      const openDate = new Date(now);
      openDate.setHours(openH, openM, 0, 0);
      isLate = (now.getTime() - openDate.getTime()) / (1000 * 60) > branchConfig.lateThreshold;
    }

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

  const remainingVacation = user.vacationDaysTotal - user.vacationDaysUsed;

  const tenureInfo = useMemo(() => {
    if (!user.jobStartDate) return null;
    const start = new Date(user.jobStartDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 365) return `${diffDays} დღე გუნდში`;
    const years = (diffDays / 365).toFixed(1);
    return `${years} წელი გუნდში`;
  }, [user.jobStartDate]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Welcome & Time Header - Light Version */}
      <div className="relative bg-white border border-slate-200 rounded-[5px] p-8 md:p-12 overflow-hidden shadow-sm">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-50 rounded-full blur-[100px] opacity-40"></div>
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
             <div className="w-20 h-20 rounded-[5px] p-1 bg-slate-50 border border-slate-200">
                <img src={user.avatar} className="w-full h-full object-cover rounded-[3px]" alt="Avatar" />
             </div>
             <div>
                <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] mb-1">მოგესალმებით,</p>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">{user.name}!</h1>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                     <Icons.User /> {user.position} • {user.department}
                  </p>
                  {tenureInfo && (
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-[3px] text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                      {tenureInfo}
                    </span>
                  )}
                </div>
             </div>
          </div>

          <div className="text-center md:text-right space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{todayDateStr}</p>
             <p className="text-5xl font-black tabular-nums tracking-tighter text-slate-900">
               {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
             </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Conditional Attendance Section */}
          {isAttendanceEnabled && (
            <div className="bg-white rounded-[5px] p-10 md:p-14 border border-slate-200 shadow-sm relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-bl-full -mr-20 -mt-20 transition-transform group-hover:scale-110"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="space-y-8 text-center md:text-left flex-1">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-widest mb-2">სამუშაო სტატუსი</h3>
                    <p className="text-sm text-slate-400 font-bold uppercase">თქვენი ლოკაცია: <span className="text-indigo-600 font-black underline decoration-2 underline-offset-4">{user.branch || 'არჩეული არ არის'}</span></p>
                  </div>

                  {hasCheckedInToday ? (
                    <div className="inline-flex items-center gap-8 text-emerald-600 bg-emerald-50/50 px-12 py-8 rounded-[5px] border border-emerald-100 shadow-sm">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
                        <Icons.Check />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase opacity-60 mb-1 tracking-widest">მოსვლა დაფიქსირდა</p>
                        <p className="text-4xl font-black tabular-nums leading-none tracking-tight">{user.lastCheckIn}</p>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={handleArrive}
                      disabled={!user.branch}
                      className="w-full md:w-auto px-20 py-10 bg-slate-900 text-white rounded-[5px] font-black text-2xl uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-8 disabled:opacity-50 group/btn"
                    >
                      <div className="group-hover/btn:rotate-12 transition-transform duration-300 scale-125">
                        <Icons.Clock />
                      </div>
                      დროის დაფიქსირება
                    </button>
                  )}
                </div>

                <div className="hidden md:flex flex-col items-center gap-4 px-12 border-l border-slate-100">
                   <div className="w-40 h-40 bg-slate-50 rounded-full border-4 border-slate-100 flex items-center justify-center text-slate-200 shadow-inner">
                      <div className="scale-[2.5]"><Icons.Dashboard /></div>
                   </div>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">BH Systems</p>
                </div>
              </div>
            </div>
          )}

          {/* Last 3 Activities Section */}
          {isAttendanceEnabled && (
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                    <Icons.Clock /> ბოლო 3 აქტივობა
                  </h3>
                  <button onClick={() => setActiveView(View.ATTENDANCE_REPORT)} className="text-[10px] font-black text-indigo-600 uppercase hover:underline tracking-widest">ყველას ნახვა</button>
               </div>
               <div className="divide-y divide-slate-100">
                  {last3Activities.map(log => (
                    <div key={log.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                       <div className="flex items-center gap-5">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.isLate ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                             <Icons.Check />
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-900 uppercase leading-none tracking-tight">{log.date}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{log.branch}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-lg font-black text-slate-800 tabular-nums leading-none tracking-tight">{log.checkIn}</p>
                          {log.isLate && <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1 block">დაგვიანება</span>}
                       </div>
                    </div>
                  ))}
                  {last3Activities.length === 0 && (
                    <div className="p-16 text-center text-slate-300 italic text-[11px] font-black uppercase tracking-[0.3em]">აქტივობა არ ფიქსირდება</div>
                  )}
               </div>
            </div>
          )}

          {/* Upcoming Birthdays (Next 14 Days) */}
          <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
             <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                  <Icons.Gift /> მოახლოებული დაბადების დღეები (14 დღე)
                </h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {upcomingBirthdays.map(emp => (
                  <div key={emp.id} className="p-8 flex flex-col items-center text-center space-y-4 group hover:bg-slate-50 transition-all">
                     <div className="w-16 h-16 rounded-full border-2 border-indigo-100 p-0.5 group-hover:border-indigo-400 transition-colors shadow-md">
                        <img src={emp.avatar} className="w-full h-full object-cover rounded-full" />
                     </div>
                     <div className="space-y-1">
                        <p className="text-[12px] font-black text-slate-900 uppercase leading-tight tracking-tight">{emp.name}</p>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                           {emp.nextBday.toLocaleDateString('ka-GE', { day: 'numeric', month: 'long' })}
                        </p>
                     </div>
                  </div>
                ))}
                {upcomingBirthdays.length === 0 && (
                  <div className="col-span-3 p-16 text-center text-slate-300 italic text-[11px] font-black uppercase tracking-[0.3em]">ამ პერიოდში დაბადების დღეები არ არის</div>
                )}
             </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="lg:col-span-4 space-y-8">
          {/* My Vacation Balance Card */}
          <div 
            onClick={() => setActiveView(View.VACATIONS)}
            className="bg-indigo-600 rounded-[5px] p-10 text-white shadow-xl relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all h-72 flex flex-col justify-between"
          >
             <div className="absolute -right-4 -bottom-4 text-white opacity-5 scale-[4.5] group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
                <Icons.Calendar />
             </div>
             
             <div className="relative z-10 space-y-2">
                <p className="text-indigo-100 text-[11px] font-black uppercase tracking-[0.2em] opacity-80">ჩემი შვებულება</p>
                <h4 className="text-7xl font-black tabular-nums tracking-tighter leading-none">{remainingVacation}</h4>
                <p className="text-[11px] font-black text-indigo-300 uppercase tracking-widest mt-2">დარჩენილი დღეები</p>
             </div>

             <div className="relative z-10 w-full space-y-4">
                <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                   <span className="text-indigo-200">ათვისებული: {user.vacationDaysUsed}</span>
                   <span className="text-white">ჯამი: {user.vacationDaysTotal}</span>
                </div>
                <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden backdrop-blur-md">
                   <div 
                    className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out" 
                    style={{ width: `${(remainingVacation / user.vacationDaysTotal) * 100}%` }}
                   ></div>
                </div>
             </div>
          </div>
          
          {/* Quick Access was removed as per request */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
