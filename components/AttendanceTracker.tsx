
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceRecord, User, BranchConfig } from '../types';
import { Icons } from '../constants';

interface AttendanceTrackerProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
  onAddRecord: (record: AttendanceRecord) => void;
  attendanceLogs: AttendanceRecord[];
  branches: BranchConfig[];
  onUpdateRecord?: (record: AttendanceRecord) => void;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ 
  user, 
  onUpdateUser, 
  onAddRecord,
  attendanceLogs,
  branches,
  onUpdateRecord
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

  const activeRecord = useMemo(() => {
    return attendanceLogs.find(log => log.date === todayDateStr && log.employeeId === user.id && log.status === 'Active');
  }, [attendanceLogs, user.id, todayDateStr]);

  const hasFinishedToday = useMemo(() => {
    return attendanceLogs.some(log => log.date === todayDateStr && log.employeeId === user.id && log.status === 'Complete');
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

  const handleArrive = () => {
    if (activeRecord || hasFinishedToday || !user.branch) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const isLate = calculateLateness(now);
    const newRecord: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: user.id,
      employeeName: user.name,
      date: todayDateStr,
      checkIn: timeStr,
      status: 'Active',
      branch: user.branch,
      isLate
    };
    onAddRecord(newRecord);
    onUpdateUser({ checkedIn: true, lastCheckIn: timeStr });
  };

  const handleLeave = () => {
    if (!activeRecord) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const updatedRecord: AttendanceRecord = {
      ...activeRecord,
      checkOut: timeStr,
      status: 'Complete'
    };
    if (onUpdateRecord) {
      onUpdateRecord(updatedRecord);
    }
    onUpdateUser({ checkedIn: false });
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="bg-white rounded-[5px] shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
           {user.checkedIn && <div className="h-full bg-emerald-500 animate-pulse w-full"></div>}
        </div>

        <div className="mb-4">
           <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-[5px]">
              <span className={`w-1.5 h-1.5 rounded-full ${user.checkedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                {user.branch || 'ფილიალი არაა არჩეული'}
              </span>
           </div>
        </div>

        <div className="mb-8">
          <h2 className="text-5xl font-black text-slate-900 tracking-tight tabular-nums leading-none">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </h2>
          <p className="text-slate-400 mt-2 font-bold text-[10px] uppercase tracking-widest">
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="w-full max-w-xs space-y-3">
          {!user.checkedIn ? (
            <button 
              onClick={handleArrive} 
              disabled={!user.branch || hasFinishedToday} 
              className={`w-full py-5 rounded-[5px] font-black text-lg transition-all shadow-md active:scale-95 uppercase tracking-widest border-2 flex items-center justify-center gap-2
                ${hasFinishedToday 
                  ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'}`}
            >
              <Icons.LogIn />
              {hasFinishedToday ? 'ცვლა დასრულებულია' : 'მოვედი'}
            </button>
          ) : (
            <button 
              onClick={handleLeave} 
              className="w-full py-5 rounded-[5px] font-black text-lg transition-all shadow-md active:scale-95 uppercase tracking-widest border-2 flex items-center justify-center gap-2 bg-rose-600 text-white border-rose-600 hover:bg-rose-700"
            >
              <Icons.LogOut />
              ცვლის დასრულება
            </button>
          )}
          
          {!user.branch && !user.checkedIn && (
            <p className="text-[9px] font-bold text-rose-500 mt-2 uppercase">გთხოვთ აირჩიოთ ფილიალი პროფილში</p>
          )}

          {user.checkedIn && (
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2 animate-bounce">
              მიმდინარეობს მუშაობა: {user.lastCheckIn}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[5px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Icons.Clock /> ბოლო აქტივობა
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                <th className="px-4 py-3">თარიღი</th>
                <th className="px-4 py-3">ფილიალი</th>
                <th className="px-4 py-3">მოსვლა</th>
                <th className="px-4 py-3">წასვლა</th>
                <th className="px-4 py-3 text-right">სტატუსი</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceLogs.slice(0, 10).map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-4 py-3 text-[11px] text-slate-700 font-bold">{record.date}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-500 font-black uppercase tracking-widest">{record.branch || 'N/A'}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-800 font-black">{record.checkIn}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-800 font-black">{record.checkOut || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-[3px] uppercase tracking-widest ${record.status === 'Active' ? 'bg-amber-50 text-amber-500' : record.isLate ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {record.status === 'Active' ? 'მიმდინარე' : record.isLate ? 'დაგვიანება' : 'დროული'}
                    </span>
                  </td>
                </tr>
              ))}
              {attendanceLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-300 italic text-xs">ისტორია ცარიელია</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTracker;
