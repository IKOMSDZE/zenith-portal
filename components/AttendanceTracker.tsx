
import React, { useState, useEffect, useMemo } from 'react';
import { AttendanceRecord, User, BranchConfig } from '../types';
import { Icons } from '../constants';
import { Database, SystemSettings } from '../services/database';

interface AttendanceTrackerProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
  onAddRecord: (record: AttendanceRecord) => void;
  attendanceLogs: AttendanceRecord[];
  branches: BranchConfig[];
  onUpdateRecord?: (record: AttendanceRecord) => void;
  onDeleteRecord?: (id: string) => void;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ 
  user, 
  onUpdateUser, 
  onAddRecord,
  attendanceLogs,
  branches,
  onDeleteRecord
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    Database.getSettings().then(setSettings);
    return () => clearInterval(timer);
  }, []);

  // Standardized Date format for better aggregation keys (YYYY-MM-DD)
  const dateKey = useMemo(() => {
    const d = currentTime;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [currentTime]);

  const todayDisplayStr = useMemo(() => 
    currentTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    [currentTime]
  );

  const hasCheckedInToday = useMemo(() => {
    return attendanceLogs.some(log => (log.date === dateKey || log.date === todayDisplayStr) && log.employeeId === user.id);
  }, [attendanceLogs, user.id, dateKey, todayDisplayStr]);

  const isAttendanceEnabled = useMemo(() => {
    if (!settings) return false;
    return (settings.attendanceEnabledDepartments || []).includes(user.department);
  }, [settings, user.department]);

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
    if (hasCheckedInToday || !user.branch || !isAttendanceEnabled || !user.uid) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const isLate = calculateLateness(now);
    
    // REDESIGN: Denormalizing user data into the record for instant reporting
    const newRecord: AttendanceRecord = {
      id: `ATT-${Date.now()}-${user.id}`,
      employeeId: user.id,
      uid: user.uid, 
      employeeName: user.name,
      employeeRole: user.role,
      department: user.department,
      branch: user.branch,
      date: dateKey,
      checkIn: timeStr,
      status: 'Complete',
      isLate
    };
    
    onAddRecord(newRecord);
    onUpdateUser({ checkedIn: true, lastCheckIn: timeStr });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("ნამდვილად გსურთ ჩანაწერის წაშლა?")) {
      onDeleteRecord?.(id);
    }
  };

  if (settings && !isAttendanceEnabled) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-[5px] shadow-sm border border-slate-200 p-12 flex flex-col items-center text-center relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
           {hasCheckedInToday && <div className="h-full bg-emerald-500 w-full"></div>}
        </div>

        <div className="mb-6">
           <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-[5px]">
              <span className={`w-2 h-2 rounded-full ${hasCheckedInToday ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                {user.branch || 'ფილიალი არაა არჩეული'}
              </span>
           </div>
        </div>

        <div className="mb-10">
          <h2 className="text-6xl font-black text-slate-900 tracking-tight tabular-nums leading-none">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </h2>
          <p className="text-slate-400 mt-3 font-bold text-[11px] uppercase tracking-widest">
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <button 
            onClick={handleArrive} 
            disabled={!user.branch || hasCheckedInToday} 
            className={`w-full py-6 rounded-[5px] font-black text-xl transition-all shadow-md active:scale-95 uppercase tracking-widest border-2 flex items-center justify-center gap-3
              ${hasCheckedInToday 
                ? 'bg-emerald-50 text-emerald-500 border-emerald-100 cursor-not-allowed' 
                : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'}`}
          >
            {hasCheckedInToday ? <Icons.Check /> : <Icons.Clock />}
            {hasCheckedInToday ? 'მოსვლა დაფიქსირებულია' : 'მოვედი'}
          </button>
          
          {!user.branch && (
            <p className="text-[10px] font-black text-rose-500 uppercase animate-pulse">გთხოვთ აირჩიოთ ფილიალი</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[5px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Icons.Clock /> ბოლო აქტივობა
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                <th className="px-6 py-5">თარიღი</th>
                <th className="px-6 py-5">მოსვლის დრო</th>
                <th className="px-6 py-5">ფილიალი</th>
                <th className="px-6 py-5 text-right">ქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceLogs.slice(0, 10).map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-5 text-[11px] text-slate-700 font-bold">{record.date}</td>
                  <td className="px-6 py-5 text-[11px] text-slate-800 font-black">{record.checkIn}</td>
                  <td className="px-6 py-5 text-[11px] text-indigo-600 font-black uppercase">{record.branch}</td>
                  <td className="px-6 py-5 text-right">
                    <button onClick={() => handleDelete(record.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2">
                      <Icons.Trash />
                    </button>
                  </td>
                </tr>
              ))}
              {attendanceLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">ჩანაწერები არ მოიძებნა</td>
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
