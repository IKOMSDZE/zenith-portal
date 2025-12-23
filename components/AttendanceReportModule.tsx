
import React, { useState, useMemo, useEffect } from 'react';
import { AttendanceRecord, BranchConfig, User } from '../types';
import { Icons } from '../constants';
import { Database } from '../services/database';

interface AttendanceReportModuleProps {
  branches: BranchConfig[];
  user: User;
  onDeleteAttendance: (id: string) => Promise<void>;
  onUpdateAttendance: (log: AttendanceRecord) => Promise<void>;
}

const AttendanceReportModule: React.FC<AttendanceReportModuleProps> = ({ branches, user, onDeleteAttendance, onUpdateAttendance }) => {
  const isAdmin = user.role === 'Admin';
  
  const [filterBranch, setFilterBranch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'late' | 'on-time'>('all');
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    Database.getAttendanceLogs().then(setLogs);
  }, []);

  const filteredData = useMemo(() => {
    return logs.filter(log => {
      const matchBranch = filterBranch ? log.branch === filterBranch : true;
      const matchEmployee = filterEmployee ? log.employeeName?.toLowerCase().includes(filterEmployee.toLowerCase()) : true;
      const matchTime = filterTime ? log.checkIn.includes(filterTime) : true;
      const matchStatus = filterStatus === 'all' 
        ? true 
        : filterStatus === 'late' ? log.isLate : !log.isLate;

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
  }, [logs, filterBranch, startDate, endDate, filterEmployee, filterTime, filterStatus]);

  const handleDelete = async (id: string) => {
    if (window.confirm("ნამდვილად გსურთ ამ ჩანაწერის წაშლა?")) {
      await onDeleteAttendance(id);
      setLogs(logs.filter(l => l.id !== id));
    }
  };

  const handleUpdateRecord = async () => {
    if (editingRecord) {
      await onUpdateAttendance(editingRecord);
      setLogs(logs.map(l => l.id === editingRecord.id ? editingRecord : l));
      setEditingRecord(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">დასწრების მართვა</h2>
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">პერსონალის აღრიცხვის სრული კონტროლი</p>
      </div>

      <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">ფილიალი</label>
          <select 
            value={filterBranch} 
            onChange={e => setFilterBranch(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500"
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
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">დრო (HH:MM)</label>
          <input 
            type="text" 
            placeholder="მაგ: 09:15" 
            value={filterTime} 
            onChange={e => setFilterTime(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">სტატუსი</label>
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value as any)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500"
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
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">თარიღი (მდე)</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500" 
          />
        </div>
      </div>

      <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-5">თარიღი</th>
                <th className="px-6 py-5">ფილიალი</th>
                <th className="px-6 py-5">თანამშრომელი</th>
                <th className="px-6 py-5">დრო</th>
                <th className="px-6 py-5">სტატუსი</th>
                {isAdmin && <th className="px-6 py-5 text-right">ქმედება</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/30 transition-colors text-[10px]">
                  <td className="px-6 py-5 text-slate-700 font-bold whitespace-nowrap">{log.date}</td>
                  <td className="px-6 py-5 text-indigo-600 font-black uppercase tracking-tight whitespace-nowrap">{log.branch}</td>
                  <td className="px-6 py-5 text-slate-800 font-bold whitespace-nowrap">{log.employeeName}</td>
                  <td className="px-6 py-5 text-slate-900 font-black tabular-nums whitespace-nowrap">{log.checkIn}</td>
                  <td className="px-6 py-5">
                    <span className={`px-2.5 py-1 rounded-[3px] font-black uppercase tracking-widest ${log.isLate ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {log.isLate ? 'დაგვიანება' : 'დროული'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingRecord({...log})} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors">
                          <Icons.Edit />
                        </button>
                        <button onClick={() => handleDelete(log.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                          <Icons.Trash />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="p-24 text-center text-slate-400 font-bold text-[10px] uppercase italic tracking-widest">მონაცემები ვერ მოიძებნა</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[5px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
               <h4 className="text-sm font-black uppercase text-slate-900">აღრიცხვის რედაქტირება</h4>
               <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600"><Icons.X /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                 <div>
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">თანამშრომელი</label>
                   <p className="text-sm font-black text-slate-900">{editingRecord.employeeName}</p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">თარიღი</label>
                     <input 
                       type="text" 
                       value={editingRecord.date} 
                       onChange={e => setEditingRecord({...editingRecord, date: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-[5px] text-xs font-bold outline-none focus:border-indigo-500"
                     />
                   </div>
                   <div>
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">დრო</label>
                     <input 
                       type="text" 
                       value={editingRecord.checkIn} 
                       onChange={e => setEditingRecord({...editingRecord, checkIn: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-[5px] text-xs font-bold outline-none focus:border-indigo-500"
                     />
                   </div>
                 </div>

                 <div>
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">ფილიალი</label>
                   <select 
                     value={editingRecord.branch} 
                     onChange={e => setEditingRecord({...editingRecord, branch: e.target.value})}
                     className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2.5 text-xs font-bold outline-none"
                   >
                     {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                   </select>
                 </div>

                 <div className="flex items-center gap-2 pt-2">
                   <input 
                     type="checkbox" 
                     id="isLate"
                     checked={editingRecord.isLate} 
                     onChange={e => setEditingRecord({...editingRecord, isLate: e.target.checked})}
                     className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                   />
                   <label htmlFor="isLate" className="text-[11px] font-black text-slate-600 uppercase tracking-widest cursor-pointer select-none">დაგვიანება</label>
                 </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex gap-2">
              <button onClick={() => setEditingRecord(null)} className="flex-1 py-3 bg-white border border-slate-200 rounded-[5px] text-[10px] font-black uppercase hover:bg-slate-100 transition-colors">გაუქმება</button>
              <button onClick={handleUpdateRecord} className="flex-1 py-3 bg-indigo-600 text-white rounded-[5px] text-[10px] font-black uppercase hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">შენახვა</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReportModule;
