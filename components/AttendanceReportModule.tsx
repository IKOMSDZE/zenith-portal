
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, BranchConfig } from '../types';
import { Icons } from '../constants';
import { Database } from '../services/database';

interface AttendanceReportModuleProps {
  branches: BranchConfig[];
  attendanceLogs: AttendanceRecord[];
}

const AttendanceReportModule: React.FC<AttendanceReportModuleProps> = ({ branches, attendanceLogs }) => {
  const [filterBranch, setFilterBranch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'late' | 'on-time'>('all');

  // Group by date and branch to find the actual "Opener" (first person to check in)
  const branchOpeners = useMemo(() => {
    const openers: Record<string, AttendanceRecord> = {};
    
    // Sort logs by checkIn time ascending to correctly identify the first arrivals
    const sortedLogs = [...attendanceLogs].sort((a, b) => a.checkIn.localeCompare(b.checkIn));

    sortedLogs.forEach(log => {
      const key = `${log.date}-${log.branch}`;
      if (!openers[key]) {
        openers[key] = log;
      }
    });

    return Object.values(openers);
  }, [attendanceLogs]);

  const filteredData = useMemo(() => {
    return branchOpeners.filter(log => {
      const matchBranch = filterBranch ? log.branch === filterBranch : true;
      const matchEmployee = filterEmployee ? log.employeeName?.toLowerCase().includes(filterEmployee.toLowerCase()) : true;
      const matchTime = filterTime ? log.checkIn.includes(filterTime) : true;
      const matchStatus = filterStatus === 'all' 
        ? true 
        : filterStatus === 'late' ? log.isLate : !log.isLate;

      // Date range logic
      // Note: AttendanceRecord dates are stored as localized strings like "May 24, 2024"
      const recDate = new Date(log.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      let matchDate = true;
      if (start) {
        start.setHours(0, 0, 0, 0);
        matchDate = matchDate && recDate >= start;
      }
      if (end) {
        end.setHours(23, 59, 59, 999);
        matchDate = matchDate && recDate <= end;
      }

      return matchBranch && matchDate && matchEmployee && matchTime && matchStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [branchOpeners, filterBranch, startDate, endDate, filterEmployee, filterTime, filterStatus]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">დასწრების რეპორტი</h2>
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">ფილიალების გახსნისა და დასწრების კონტროლი</p>
      </div>

      <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">ფილიალი</label>
          <select 
            value={filterBranch} 
            onChange={e => setFilterBranch(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-500"
          >
            <option value="">ყველა</option>
            {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">თანამშრომელი</label>
          <input 
            type="text" 
            placeholder="ძებნა..." 
            value={filterEmployee} 
            onChange={e => setFilterEmployee(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-500" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">დრო (HH:MM)</label>
          <input 
            type="text" 
            placeholder="მაგ: 09:15" 
            value={filterTime} 
            onChange={e => setFilterTime(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-500" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">სტატუსი</label>
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value as any)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-500"
          >
            <option value="all">ყველა</option>
            <option value="on-time">დროული</option>
            <option value="late">დაგვიანება</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">თარიღი (დან)</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-500" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">თარიღი (მდე)</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-2 py-1.5 text-[10px] font-bold outline-none focus:border-indigo-500" 
          />
        </div>
      </div>

      <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[8px] font-black uppercase tracking-widest">
                <th className="px-4 py-3">თარიღი</th>
                <th className="px-4 py-3">ფილიალი</th>
                <th className="px-4 py-3">თანამშრომელი</th>
                <th className="px-4 py-3">დრო</th>
                <th className="px-4 py-3 text-right">სტატუსი</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/30 transition-colors text-[10px]">
                  <td className="px-4 py-2 text-slate-700 font-bold whitespace-nowrap">{log.date}</td>
                  <td className="px-4 py-2 text-indigo-600 font-black uppercase tracking-tight whitespace-nowrap">{log.branch}</td>
                  <td className="px-4 py-2 text-slate-800 font-bold whitespace-nowrap">{log.employeeName}</td>
                  <td className="px-4 py-2 text-slate-900 font-black tabular-nums whitespace-nowrap">{log.checkIn}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`px-1.5 py-0.5 rounded-[3px] font-black uppercase tracking-widest ${log.isLate ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {log.isLate ? 'დაგვიანება' : 'დროული'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold text-[10px] uppercase italic tracking-widest">მონაცემები ვერ მოიძებნა</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReportModule;
