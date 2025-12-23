
import React, { useState, useEffect, useCallback } from 'react';
import { AttendanceRecord, BranchConfig, User } from '../types';
import { Icons } from '../constants';
import { Database } from '../services/database';
import { QueryDocumentSnapshot } from 'firebase/firestore';

interface AttendanceReportModuleProps {
  branches: BranchConfig[];
  user: User;
  onDeleteAttendance: (id: string) => Promise<void>;
  onUpdateAttendance: (log: AttendanceRecord) => Promise<void>;
}

const PAGE_SIZE = 50;

const AttendanceReportModule: React.FC<AttendanceReportModuleProps> = ({ branches, user, onDeleteAttendance, onUpdateAttendance }) => {
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [editingLog, setEditingLog] = useState<AttendanceRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    branch: '',
    department: '',
    status: 'all' as 'all' | 'late' | 'on-time',
    days: 30
  });

  const fetchLogs = useCallback(async (isNextPage: boolean = false) => {
    setIsLoading(true);
    
    try {
      const reportFilters = {
        branch: filters.branch || undefined,
        department: filters.department || undefined,
        isLate: filters.status === 'all' ? undefined : filters.status === 'late',
        days: filters.days
      };

      const result = await Database.getAttendanceReport(
        reportFilters,
        PAGE_SIZE,
        isNextPage ? (lastDoc || undefined) : undefined
      );

      if (isNextPage) {
        setLogs(prev => [...prev, ...result.data]);
      } else {
        setLogs(result.data);
        setTotalCount(result.totalCount);
      }
      
      setLastDoc(result.lastVisible);
      setHasMore(result.data.length === PAGE_SIZE);
    } catch (error) {
      console.error("Attendance Report Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lastDoc]);

  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    fetchLogs(false);
  }, [filters.branch, filters.department, filters.status, filters.days]);

  const isAdmin = user.role === 'Admin';

  const handleDelete = async (id: string) => {
    if (window.confirm("ნამდვილად გსურთ ამ ჩანაწერის წაშლა?")) {
      await onDeleteAttendance(id);
      fetchLogs(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    await onUpdateAttendance(editingLog);
    setIsEditModalOpen(false);
    setEditingLog(null);
    fetchLogs(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">დასწრების მართვა</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2 flex items-center gap-3">
             <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-[3px] border border-indigo-100 shadow-sm">ჯამი: {totalCount} ჩანაწერი</span>
             <span className="text-slate-400 font-black">ბოლო {filters.days} დღე</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">ფილიალი</label>
          <select 
            value={filters.branch} 
            onChange={e => setFilters({...filters, branch: e.target.value})} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500"
          >
            <option value="">ყველა ფილიალი</option>
            {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
        </div>
        
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">სტატუსი</label>
          <select 
            value={filters.status} 
            onChange={e => setFilters({...filters, status: e.target.value as any})} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500"
          >
            <option value="all">ყველა</option>
            <option value="on-time">დროული</option>
            <option value="late">დაგვიანება</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">პერიოდი (დღეები)</label>
          <select 
            value={filters.days} 
            onChange={e => setFilters({...filters, days: parseInt(e.target.value)})} 
            className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500"
          >
            <option value={7}>ბოლო 7 დღე</option>
            <option value={30}>ბოლო 30 დღე</option>
            <option value={90}>ბოლო 90 დღე</option>
          </select>
        </div>

        <div className="flex items-end">
           <button onClick={() => fetchLogs(false)} disabled={isLoading} className="w-full bg-slate-900 text-white py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors flex items-center justify-center gap-3 shadow-lg active:scale-95">
             {isLoading && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
             რეპორტის განახლება
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-5">თარიღი</th>
                <th className="px-6 py-5">ფილიალი</th>
                <th className="px-6 py-5">თანამშრომელი</th>
                <th className="px-6 py-5">მოსვლის დრო</th>
                <th className="px-6 py-5">სტატუსი</th>
                {isAdmin && <th className="px-6 py-5 text-right">ქმედება</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/30 transition-colors text-[10px]">
                  <td className="px-6 py-5 text-slate-700 font-bold">{log.date}</td>
                  <td className="px-6 py-5 text-indigo-600 font-black uppercase">{log.branch}</td>
                  <td className="px-6 py-5">
                    <p className="font-black text-slate-800 uppercase leading-none">{log.employeeName}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{log.employeeRole}</p>
                  </td>
                  <td className="px-6 py-5 text-slate-900 font-black tabular-nums">{log.checkIn}</td>
                  <td className="px-6 py-5">
                    <span className={`px-2.5 py-1 rounded-[3px] font-black uppercase tracking-widest border ${log.isLate ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-500 border-emerald-100'}`}>
                      {log.isLate ? 'დაგვიანება' : 'დროული'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-5 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setEditingLog(log); setIsEditModalOpen(true); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Icons.Edit /></button>
                          <button onClick={() => handleDelete(log.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Icons.Trash /></button>
                       </div>
                    </td>
                  )}
                </tr>
              ))}
              {logs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-24 text-center text-slate-300 italic text-[11px] font-black uppercase tracking-[0.2em]">ჩანაწერები არ მოიძებნა</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {hasMore && (
          <div className="p-10 border-t border-slate-100 bg-slate-50/30 flex items-center justify-center">
            <button 
              onClick={() => fetchLogs(true)} 
              disabled={isLoading}
              className="px-16 py-4 bg-white border border-slate-200 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-md active:scale-95 flex items-center gap-4 disabled:opacity-50"
            >
              {isLoading && <div className="w-4 h-4 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>}
              {isLoading ? 'იტვირთება...' : 'მეტის ნახვა'}
            </button>
          </div>
        )}
      </div>

      {/* Edit Attendance Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[5px] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-tight">დასწრების რედაქტირება</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Icons.X /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">თარიღი</label>
                 <input type="text" value={editingLog?.date || ''} onChange={e => setEditingLog(prev => ({ ...prev!, date: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-[5px] text-xs font-bold outline-none" />
               </div>
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">მოსვლის დრო (HH:mm:ss)</label>
                 <input type="text" value={editingLog?.checkIn || ''} onChange={e => setEditingLog(prev => ({ ...prev!, checkIn: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-[5px] text-xs font-bold outline-none" />
               </div>
               <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">ფილიალი</label>
                 <select value={editingLog?.branch || ''} onChange={e => setEditingLog(prev => ({ ...prev!, branch: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-[5px] text-xs font-bold outline-none">
                    {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                 </select>
               </div>
               <div className="flex items-center gap-4 py-2">
                 <input type="checkbox" id="isLateEdit" checked={editingLog?.isLate || false} onChange={e => setEditingLog(prev => ({ ...prev!, isLate: e.target.checked }))} className="w-4 h-4 rounded-[3px] accent-indigo-600" />
                 <label htmlFor="isLateEdit" className="text-[10px] font-black uppercase text-slate-600 tracking-widest cursor-pointer">დაგვიანება</label>
               </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
               <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">გაუქმება</button>
               <button onClick={handleSaveEdit} className="flex-1 py-3 bg-slate-900 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">შენახვა</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReportModule;
