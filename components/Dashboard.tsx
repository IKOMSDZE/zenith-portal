
import React, { useState, useEffect, useMemo } from 'react';
import { User, View, AttendanceRecord, BranchConfig, NewsItem, VacationRecord } from '../types';
import { Icons } from '../constants';
import { Database } from '../services/database';
import { where, orderBy, limit } from 'firebase/firestore';
import NewsFeed from './NewsFeed';

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-slate-200 rounded-[5px] ${className}`}></div>
);

interface DashboardProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
  onAddRecord: (record: AttendanceRecord) => Promise<void>;
  isAttendanceEnabled: boolean;
  branches: BranchConfig[];
  setActiveView: (view: View) => void;
  attendanceLogs: AttendanceRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({
  user,
  onUpdateUser,
  onAddRecord,
  isAttendanceEnabled,
  branches,
  setActiveView
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentLogs, setRecentLogs] = useState<AttendanceRecord[] | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<User[]>([]);
  const [upcomingVacations, setUpcomingVacations] = useState<VacationRecord[]>([]);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayDateStr = useMemo(() => 
    currentTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    [currentTime]
  );

  const fetchDashboardData = async () => {
    // 1. Fetch Attendance if enabled
    if (isAttendanceEnabled) {
      const res = await Database.getAttendanceLogs([
        where('employeeId', '==', user.id),
        orderBy('date', 'desc'),
        limit(5)
      ]);
      setRecentLogs(res.data);
    }

    // 2. Fetch News
    Database.getNews(10).then(setNews);

    // 3. Fetch Birthdays (Logic: Next 14 days)
    const empRes = await Database.getEmployees(100); // Fetch a reasonable batch
    const now = new Date();
    const rangeEnd = new Date();
    rangeEnd.setDate(now.getDate() + 14);

    const bdays = empRes.data.filter(emp => {
      if (!emp.birthday) return false;
      const bday = new Date(emp.birthday);
      const nextBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      if (nextBday < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        nextBday.setFullYear(now.getFullYear() + 1);
      }
      return nextBday >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && nextBday <= rangeEnd;
    }).sort((a, b) => {
      const getNext = (d: string) => {
        const bd = new Date(d);
        const nbd = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
        if (nbd < new Date(now.getFullYear(), now.getMonth(), now.getDate())) nbd.setFullYear(now.getFullYear() + 1);
        return nbd.getTime();
      };
      return getNext(a.birthday!) - getNext(b.birthday!);
    });
    setUpcomingBirthdays(bdays);

    // 4. Fetch Vacations (Active or upcoming)
    const todayISO = now.toISOString().split('T')[0];
    const vacs = await Database.getVacations([
      where('status', '==', 'Approved'),
      where('endDate', '>=', todayISO),
      limit(5)
    ]);
    setUpcomingVacations(vacs);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user.id, isAttendanceEnabled]);

  const activeRecord = useMemo(() => {
    if (!recentLogs) return null;
    return recentLogs.find(log => log.date === todayDateStr && log.status === 'Active');
  }, [recentLogs, todayDateStr]);

  const hasCompletedToday = useMemo(() => {
    if (!recentLogs) return false;
    return recentLogs.some(log => log.date === todayDateStr && log.status === 'Complete');
  }, [recentLogs, todayDateStr]);

  const handleAttendanceAction = async () => {
    if (!user.branch || !isAttendanceEnabled || !user.uid || isLoadingAction) return;
    setIsLoadingAction(true);
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    try {
      if (activeRecord) {
        const updatedRecord: AttendanceRecord = {
          ...activeRecord,
          checkOut: timeStr,
          status: 'Complete'
        };
        await Database.saveAttendanceLog(updatedRecord);
        await onUpdateUser({ checkedIn: false });
        await fetchDashboardData();
      } else {
        if (hasCompletedToday) {
           alert("თქვენ უკვე დაასრულეთ სამუშაო დღე.");
           setIsLoadingAction(false);
           return;
        }

        const branchConfig = branches.find(b => b.name === user.branch);
        let isLate = false;
        if (branchConfig) {
          const [openH, openM] = branchConfig.openTime.split(':').map(Number);
          const openDate = new Date(now);
          openDate.setHours(openH, openM, 0, 0);
          isLate = (now.getTime() - openDate.getTime()) / (1000 * 60) > branchConfig.lateThreshold;
        }

        const newRecord: AttendanceRecord = {
          id: `ATT-${Date.now()}-${user.id}`,
          employeeId: user.id,
          uid: user.uid,
          employeeName: user.name,
          employeeRole: user.role,
          department: user.department,
          date: todayDateStr,
          checkIn: timeStr,
          status: 'Active',
          branch: user.branch,
          isLate
        };
        
        await onAddRecord(newRecord);
        await onUpdateUser({ checkedIn: true, lastCheckIn: timeStr });
        await fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
      alert("შეცდომა ოპერაციისას.");
    } finally {
      setIsLoadingAction(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      {/* Welcome Hero */}
      <div className="relative bg-slate-900 text-white rounded-[5px] p-8 md:p-12 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-600/20 to-transparent"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8">
             <div className="w-20 h-20 rounded-[5px] p-1 bg-white/10 border border-white/20 backdrop-blur-md">
                <img src={user.avatar} className="w-full h-full object-cover rounded-[3px]" alt="Avatar" />
             </div>
             <div>
                <p className="text-indigo-400 text-[11px] font-black uppercase tracking-[0.4em] mb-1">მოგესალმებით,</p>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">{user.name}</h1>
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-2">{user.position} • {user.department}</p>
             </div>
          </div>
          <div className="text-center md:text-right space-y-1 bg-white/5 p-4 rounded-[5px] border border-white/10 backdrop-blur-sm min-w-[180px]">
             <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">{todayDateStr}</p>
             <p className="text-5xl font-black tabular-nums tracking-tighter leading-none">
               {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
             </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Main Attendance Module */}
          {isAttendanceEnabled && (
            <div className="bg-white rounded-[5px] p-10 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 flex-1 text-center md:text-left">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">დღიური აქტივობა</h3>
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ფილიალი: <span className="text-indigo-600 font-black">{user.branch || 'არჩეული არ არის'}</span></p>
                    {activeRecord && <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-2"><Icons.Check /> მუშაობის პროცესშია ({activeRecord.checkIn})</p>}
                  </div>
                </div>

                <button 
                  onClick={handleAttendanceAction}
                  disabled={!user.branch || hasCompletedToday || isLoadingAction}
                  className={`px-12 py-6 rounded-[5px] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50 ${
                    activeRecord 
                      ? 'bg-rose-500 text-white hover:bg-rose-600' 
                      : hasCompletedToday 
                        ? 'bg-emerald-50 text-emerald-500 border border-emerald-100 cursor-not-allowed'
                        : 'bg-slate-900 text-white hover:bg-indigo-600'
                  }`}
                >
                  {isLoadingAction ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : activeRecord ? (
                    <><Icons.X /> სამუშაოს დასრულება</>
                  ) : hasCompletedToday ? (
                    <><Icons.Check /> დასრულებულია</>
                  ) : (
                    <><Icons.Clock /> მუშაობის დაწყება</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Attendance History List - ONLY if enabled */}
          {isAttendanceEnabled && (
            <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                  <Icons.Clock /> ბოლო ჩანაწერები
                </h3>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                      <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                        <th className="px-8 py-4">თარიღი</th>
                        <th className="px-8 py-4">მოსვლა</th>
                        <th className="px-8 py-4">წასვლა</th>
                        <th className="px-8 py-4 text-right">სტატუსი</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {recentLogs === null ? (
                       [1, 2].map(i => <tr key={i}><td colSpan={4} className="p-6"><Skeleton className="h-4 w-full" /></td></tr>)
                     ) : recentLogs.length > 0 ? (
                       recentLogs.map(log => (
                         <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-8 py-5 text-[11px] font-black text-slate-900 uppercase">{log.date}</td>
                           <td className="px-8 py-5 text-[10px] font-black text-indigo-600">{log.checkIn}</td>
                           <td className="px-8 py-5 text-[10px] font-black text-slate-400">{log.checkOut || '—'}</td>
                           <td className="px-8 py-5 text-right">
                             <span className={`px-4 py-1 rounded-[3px] font-black text-[9px] uppercase tracking-widest ${log.status === 'Active' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-500'}`}>
                               {log.status === 'Active' ? 'აქტიური' : 'დასრულებული'}
                             </span>
                           </td>
                         </tr>
                       ))
                     ) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-10 text-center text-slate-300 font-black text-[9px] uppercase tracking-widest italic">აქტივობა არ ფიქსირდება</td>
                      </tr>
                     )}
                   </tbody>
                 </table>
              </div>
            </div>
          )}

          {/* Upcoming Vacations */}
          <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                <Icons.Calendar /> მიმდინარე და დაგეგმილი შვებულებები
              </h3>
              <button onClick={() => setActiveView(View.VACATIONS)} className="text-[9px] font-black text-indigo-600 uppercase hover:underline">ყველას ნახვა</button>
            </div>
            <div className="divide-y divide-slate-100">
               {upcomingVacations.map(vac => (
                 <div key={vac.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><Icons.User /></div>
                       <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase">{vac.employeeName}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{vac.startDate} — {vac.endDate}</p>
                       </div>
                    </div>
                    <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-widest">{vac.reason}</span>
                 </div>
               ))}
               {upcomingVacations.length === 0 && (
                 <div className="p-10 text-center text-slate-300 font-black text-[9px] uppercase tracking-widest italic">შვებულებები არ ფიქსირდება</div>
               )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* Birthdays Section */}
          <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                <Icons.Gift /> დაბადების დღეები
              </h3>
              <span className="text-[8px] font-bold text-white/50 uppercase">შემდეგი 14 დღე</span>
            </div>
            <div className="divide-y divide-slate-50">
               {upcomingBirthdays.map(emp => {
                 const bday = new Date(emp.birthday!);
                 const displayDate = bday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                 return (
                   <div key={emp.id} className="p-5 flex items-center gap-4 group">
                      <img src={emp.avatar} className="w-10 h-10 rounded-[5px] object-cover group-hover:scale-105 transition-transform" />
                      <div className="flex-1">
                         <p className="text-[11px] font-black text-slate-900 uppercase">{emp.name}</p>
                         <p className="text-[9px] text-indigo-500 font-black uppercase">{displayDate}</p>
                      </div>
                      <div className="text-slate-100 group-hover:text-indigo-600 transition-colors"><Icons.Gift /></div>
                   </div>
                 );
               })}
               {upcomingBirthdays.length === 0 && (
                 <div className="p-12 text-center text-slate-300 font-black text-[9px] uppercase tracking-widest italic leading-relaxed">
                   ახლო მომავალში დაბადების დღეები არ ფიქსირდება
                 </div>
               )}
            </div>
          </div>

          {/* Integrated News Feed */}
          <div className="h-fit">
            <NewsFeed news={news} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
