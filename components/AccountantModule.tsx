
import React, { useState, useMemo, useEffect } from 'react';
import { CashDeskRecord, BranchConfig } from '../types';
import { Icons } from '../constants';
import { Database } from '../services/database';

interface AccountantModuleProps {
  branches: BranchConfig[];
  cashHistory: CashDeskRecord[];
  onUpdateCashHistory: (newHistory: CashDeskRecord[]) => Promise<void>;
  onDeleteCashRecord: (id: string) => Promise<void>;
}

const AccountantModule: React.FC<AccountantModuleProps> = ({ branches, cashHistory, onUpdateCashHistory, onDeleteCashRecord }) => {
  const [editingRecord, setEditingRecord] = useState<CashDeskRecord | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});
  
  const [filters, setFilters] = useState({
    branch: '',
    startDate: '',
    endDate: '',
    cashier: '',
    minCash: '',
    maxCash: '',
    minTerminal: '',
    maxTerminal: '',
    minIncasation: '',
    maxIncasation: ''
  });

  useEffect(() => {
    const loadBalances = async () => {
      const b: Record<string, number> = {};
      for (const branch of branches) {
        b[branch.name] = await Database.getBranchBalance(branch.name);
      }
      setBalances(b);
    };
    loadBalances();
  }, [branches]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const totals = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecs = cashHistory.filter(r => r.date === today);
    return {
      todayRevenue: todayRecs.reduce((sum, r) => sum + r.cash + r.terminal, 0),
      todayCash: todayRecs.reduce((sum, r) => sum + r.cash, 0),
      todayTerminal: todayRecs.reduce((sum, r) => sum + r.terminal, 0),
      reportsCount: todayRecs.length
    };
  }, [cashHistory]);

  const filteredHistory = useMemo(() => {
    return cashHistory.filter(rec => {
      const matchBranch = filters.branch ? rec.branch === filters.branch : true;
      const matchCashier = filters.cashier ? rec.cashierName.toLowerCase().includes(filters.cashier.toLowerCase()) : true;
      
      const recDate = new Date(rec.date);
      const start = filters.startDate ? new Date(filters.startDate) : null;
      const end = filters.endDate ? new Date(filters.endDate) : null;
      
      let matchDate = true;
      if (start) {
        start.setHours(0, 0, 0, 0);
        matchDate = matchDate && recDate >= start;
      }
      if (end) {
        end.setHours(23, 59, 59, 999);
        matchDate = matchDate && recDate <= end;
      }

      const matchMinCash = filters.minCash ? rec.cash >= parseFloat(filters.minCash) : true;
      const matchMaxCash = filters.maxCash ? rec.cash <= parseFloat(filters.maxCash) : true;
      const matchMinTerminal = filters.minTerminal ? rec.terminal >= parseFloat(filters.minTerminal) : true;
      const matchMaxTerminal = filters.maxTerminal ? rec.terminal <= parseFloat(filters.maxTerminal) : true;
      const matchMinIncas = filters.minIncasation ? rec.incasation >= parseFloat(filters.minIncasation) : true;
      const matchMaxIncas = filters.maxIncasation ? rec.incasation <= parseFloat(filters.maxIncasation) : true;

      return matchBranch && matchDate && matchCashier && 
             matchMinCash && matchMaxCash && 
             matchMinTerminal && matchMaxTerminal && 
             matchMinIncas && matchMaxIncas;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cashHistory, filters]);

  const handleUpdateBalance = async (branchName: string, value: string) => {
    const newVal = parseFloat(value) || 0;
    await Database.updateBranchBalance(branchName, newVal);
    setBalances(prev => ({ ...prev, [branchName]: newVal }));
  };

  const handleSaveEdit = async () => {
    if (editingRecord) {
      const updated = cashHistory.map(r => r.id === editingRecord.id ? editingRecord : r);
      await onUpdateCashHistory(updated);
      setEditingRecord(null);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm("დარწმუნებული ხართ რომ გსურთ ჩანაწერის წაშლა?")) {
      await onDeleteCashRecord(id);
    }
  };

  const handleDownloadReport = () => {
    if (filteredHistory.length === 0) {
      alert("ჩამოსატვირთი მონაცემები არ არის.");
      return;
    }
    const headers = ["თარიღი", "ფილიალი", "მოლარე", "საწყისი ნაშთი", "ნაღდი", "ტერმინალი", "ინკასაცია", "გაუქმებული ჩეკი", "საბოლოო ნაშთი"];
    const csvRows = filteredHistory.map(rec => [
      rec.date,
      rec.branch,
      rec.cashierName,
      rec.openingBalance.toFixed(2),
      rec.cash.toFixed(2),
      rec.terminal.toFixed(2),
      rec.incasation.toFixed(2),
      rec.cancelledCheck ? `${rec.cancelledCheck.amount} (${rec.cancelledCheck.number})` : "—",
      rec.closingBalance.toFixed(2)
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `სალაროს_რეპორტი_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const resetFilters = () => {
    setFilters({
      branch: '',
      startDate: '',
      endDate: '',
      cashier: '',
      minCash: '',
      maxCash: '',
      minTerminal: '',
      maxTerminal: '',
      minIncasation: '',
      maxIncasation: ''
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-indigo-600 rounded-[5px] flex items-center justify-center text-white">
              <Icons.Wallet />
           </div>
           <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">ბუღალტერია</h2>
        </div>
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest ml-10">ფინანსური რეპორტების მართვა</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-8 rounded-[5px] border border-slate-200 shadow-sm space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">დღევანდელი ჯამური ნავაჭრი</p>
            <h4 className="text-4xl font-black text-slate-900 tabular-nums">{totals.todayRevenue.toFixed(2)} ₾</h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-50">{totals.reportsCount} ფილიალის რეპორტი</p>
         </div>
         <div className="bg-emerald-50 p-8 rounded-[5px] border border-emerald-100 shadow-sm space-y-2">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">ჯამური ნაღდი (დღეს)</p>
            <h4 className="text-4xl font-black text-emerald-700 tabular-nums">{totals.todayCash.toFixed(2)} ₾</h4>
         </div>
         <div className="bg-blue-50 p-8 rounded-[5px] border border-blue-100 shadow-sm space-y-2">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">ჯამური ტერმინალი (დღეს)</p>
            <h4 className="text-4xl font-black text-blue-700 tabular-nums">{totals.todayTerminal.toFixed(2)} ₾</h4>
         </div>
      </div>

      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            ფილიალების ნაშთების მართვა
          </h3>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {branches.map(branch => (
            <div key={branch.name} className="p-3 rounded-[5px] border border-slate-100 bg-slate-50/30">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 truncate">
                {branch.name}
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={balances[branch.name] || 0}
                  onChange={(e) => setBalances(prev => ({ ...prev, [branch.name]: parseFloat(e.target.value) || 0 }))}
                  onBlur={(e) => handleUpdateBalance(branch.name, e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-[3px] px-2.5 py-2 text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300">₾</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
            <Icons.Search /> ფილტრაცია და რეპორტინგი
          </h3>
          <div className="flex gap-2">
            <button onClick={resetFilters} className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">გასუფთავება</button>
            <button onClick={handleDownloadReport} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md">
              <Icons.Newspaper /> EXCEL-ში ექსპორტი
            </button>
          </div>
        </div>
        
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ფილიალი</label>
            <select name="branch" value={filters.branch} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-4 py-2.5 text-[11px] font-bold outline-none">
              <option value="">ყველა ფილიალი</option>
              {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">მოლარე</label>
            <input name="cashier" type="text" placeholder="სახელი..." value={filters.cashier} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-4 py-2.5 text-[11px] font-bold outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">თარიღი (დან)</label>
            <input name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-4 py-2.5 text-[11px] font-bold outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">თარიღი (მდე)</label>
            <input name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-4 py-2.5 text-[11px] font-bold outline-none" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[8px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-6">თარიღი</th>
                <th className="px-8 py-6">ფილიალი</th>
                <th className="px-8 py-6">მოლარე</th>
                <th className="px-8 py-6 text-right">ნაღდი</th>
                <th className="px-8 py-6 text-right">ტერმინალი</th>
                <th className="px-8 py-6 text-right">ინკასაცია</th>
                <th className="px-8 py-6 text-right">გაუქმება</th>
                <th className="px-8 py-6 text-right">საბოლოო ნაშთი</th>
                <th className="px-8 py-6 text-right">ქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/30 transition-colors text-[10px]">
                  <td className="px-8 py-6 font-bold whitespace-nowrap">{rec.date}</td>
                  <td className="px-8 py-6 text-indigo-600 font-black uppercase whitespace-nowrap">{rec.branch}</td>
                  <td className="px-8 py-6 font-bold whitespace-nowrap">{rec.cashierName}</td>
                  <td className="px-8 py-6 text-right font-black text-emerald-600 tabular-nums">{rec.cash.toFixed(2)} ₾</td>
                  <td className="px-8 py-6 text-right font-black text-blue-600 tabular-nums">{rec.terminal.toFixed(2)} ₾</td>
                  <td className="px-8 py-6 text-right font-black text-rose-600 tabular-nums">{rec.incasation.toFixed(2)} ₾</td>
                  <td className="px-8 py-6 text-right whitespace-nowrap">
                    {rec.cancelledCheck ? (
                      <div className="flex flex-col items-end">
                        <span className="font-black text-rose-500 leading-none">{rec.cancelledCheck.amount.toFixed(2)} ₾</span>
                        <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">#{rec.cancelledCheck.number}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right font-black text-indigo-600 tabular-nums bg-indigo-50/20">{rec.closingBalance.toFixed(2)} ₾</td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingRecord({...rec})} className="p-2 text-slate-400 hover:text-indigo-600"><Icons.Edit /></button>
                      <button onClick={() => handleDeleteRecord(rec.id)} className="p-2 text-slate-400 hover:text-rose-500"><Icons.Trash /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-24 text-center">
                    <p className="text-slate-400 font-bold text-[10px] uppercase italic tracking-widest">რეპორტები ამ ფილტრებით არ მოიძებნა</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[5px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
               <h4 className="text-sm font-black uppercase text-slate-900">რედაქტირება</h4>
               <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600"><Icons.X /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ნაღდი ფული</label>
                  <input type="number" value={editingRecord.cash} onChange={e => setEditingRecord({...editingRecord, cash: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[12px] font-black outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ტერმინალი</label>
                  <input type="number" value={editingRecord.terminal} onChange={e => setEditingRecord({...editingRecord, terminal: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[12px] font-black outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ინკასაცია</label>
                  <input type="number" value={editingRecord.incasation} onChange={e => setEditingRecord({...editingRecord, incasation: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[12px] font-black outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">დახურვის ნაშთი</label>
                  <input type="number" value={editingRecord.closingBalance} onChange={e => setEditingRecord({...editingRecord, closingBalance: parseFloat(e.target.value) || 0})} className="w-full bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[12px] font-black outline-none focus:border-indigo-500" />
                </div>
              </div>

              {editingRecord.cancelledCheck && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">გაუქმებული ჩეკის მონაცემები</p>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ჩეკის ნომერი</label>
                        <input type="text" value={editingRecord.cancelledCheck.number} onChange={e => setEditingRecord({...editingRecord, cancelledCheck: {...editingRecord.cancelledCheck!, number: e.target.value}})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[12px] font-black outline-none focus:border-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ჩეკის თანხა</label>
                        <input type="number" value={editingRecord.cancelledCheck.amount} onChange={e => setEditingRecord({...editingRecord, cancelledCheck: {...editingRecord.cancelledCheck!, amount: parseFloat(e.target.value) || 0}})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[12px] font-black outline-none focus:border-indigo-500" />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">მიზეზი</label>
                      <textarea rows={2} value={editingRecord.cancelledCheck.reason} onChange={e => setEditingRecord({...editingRecord, cancelledCheck: {...editingRecord.cancelledCheck!, reason: e.target.value}})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-[12px] font-bold outline-none focus:border-indigo-500 resize-none" />
                   </div>
                </div>
              )}
            </div>
            <div className="p-8 bg-slate-50 flex gap-2">
              <button onClick={() => setEditingRecord(null)} className="flex-1 py-3 bg-white border border-slate-200 rounded-[5px] text-[10px] font-black uppercase hover:bg-slate-100 transition-colors">გაუქმება</button>
              <button onClick={handleSaveEdit} className="flex-1 py-3 bg-indigo-600 text-white rounded-[5px] text-[10px] font-black uppercase hover:bg-indigo-700 transition-colors">შენახვა</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountantModule;
