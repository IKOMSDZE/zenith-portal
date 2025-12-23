
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CashDeskRecord, BranchConfig, User } from '../types';
import { Icons } from '../constants';
import { Database } from '../services/database';
import { where, orderBy, QueryConstraint, QueryDocumentSnapshot, limit, startAfter } from 'firebase/firestore';

interface AccountantModuleProps {
  branches: BranchConfig[];
  cashHistory: CashDeskRecord[];
  onUpdateCashHistory: (newHistory: CashDeskRecord[]) => Promise<void>;
  onDeleteCashRecord: (id: string) => Promise<void>;
}

const PAGE_SIZE = 50;

const AccountantModule: React.FC<AccountantModuleProps> = ({ branches, onDeleteCashRecord, onUpdateCashHistory }) => {
  const [history, setHistory] = useState<CashDeskRecord[]>([]);
  const [branchBalances, setBranchBalances] = useState<Record<string, number>>({});
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Balance Management State
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceForm, setBalanceForm] = useState({ branch: '', amount: '' });
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);

  // Edit Record State
  const [editingRecord, setEditingRecord] = useState<CashDeskRecord | null>(null);
  const [isEditRecordModalOpen, setIsEditRecordModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    branch: '',
    startDate: '',
    endDate: '',
    cashierName: ''
  });

  const fetchBalances = useCallback(async () => {
    const bals = await Database.getAllBranchBalances();
    setBranchBalances(bals);
  }, []);

  const fetchHistory = useCallback(async (isNextPage: boolean = false) => {
    setIsLoading(true);
    const constraints: QueryConstraint[] = [];
    
    if (filters.branch) constraints.push(where('branch', '==', filters.branch));
    if (filters.startDate) constraints.push(where('date', '>=', filters.startDate));
    if (filters.endDate) constraints.push(where('date', '<=', filters.endDate));
    
    constraints.push(orderBy('date', 'desc'));

    try {
      const result = await Database.getCashHistory(
        constraints, 
        PAGE_SIZE, 
        isNextPage ? (lastDoc || undefined) : undefined
      );
      
      let finalData = result.data;
      if (filters.cashierName) {
        finalData = finalData.filter(r => 
          r.cashierName.toLowerCase().includes(filters.cashierName.toLowerCase())
        );
      }

      if (isNextPage) {
        setHistory(prev => [...prev, ...finalData]);
      } else {
        setHistory(finalData);
        setTotalCount(result.totalCount);
      }
      
      setLastDoc(result.lastVisible);
      setHasMore(result.data.length === PAGE_SIZE);
    } catch (error) {
      console.error("Accountant Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, lastDoc]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    fetchHistory(false);
  }, [filters.branch, filters.startDate, filters.endDate, filters.cashierName]);

  const handleUpdateStartingBalance = async () => {
    if (!balanceForm.branch || !balanceForm.amount) {
      alert("გთხოვთ შეავსოთ ყველა ველი");
      return;
    }
    setIsUpdatingBalance(true);
    try {
      const amount = parseFloat(balanceForm.amount);
      await Database.updateBranchBalance(balanceForm.branch, amount);
      setBranchBalances(prev => ({ ...prev, [balanceForm.branch]: amount }));
      setIsBalanceModalOpen(false);
      setBalanceForm({ branch: '', amount: '' });
    } catch (error) {
      console.error(error);
      alert("შეცდომა ნაშთის განახლებისას");
    } finally {
      setIsUpdatingBalance(false);
    }
  };

  const handleEditBranchBalance = (branchName: string) => {
    setBalanceForm({
      branch: branchName,
      amount: (branchBalances[branchName] || 0).toString()
    });
    setIsBalanceModalOpen(true);
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm("ნამდვილად გსურთ ამ ჩანაწერის წაშლა? ეს არ შეცვლის ფილიალის მიმდინარე ნაშთს ავტომატურად.")) {
      try {
        await onDeleteCashRecord(id);
        setHistory(prev => prev.filter(r => r.id !== id));
        setTotalCount(prev => prev - 1);
      } catch (error) {
        alert("შეცდომა წაშლისას");
      }
    }
  };

  const handleSaveEditedRecord = async () => {
    if (!editingRecord) return;
    try {
      await onUpdateCashHistory([editingRecord]);
      setIsEditRecordModalOpen(false);
      setEditingRecord(null);
      fetchHistory(false);
    } catch (error) {
      alert("შეცდომა შენახვისას");
    }
  };

  const handleExportCSV = () => {
    if (history.length === 0) {
      alert("რეპორტში მონაცემები არ არის საექსპორტოდ.");
      return;
    }
    const headers = [
      "ID", "თარიღი", "ფილიალი", "მოლარე", "საწყისი ნაშთი", 
      "ნაღდი", "ტერმინალი", "ინკასაცია", "საბოლოო ნაშთი", 
      "გაუქმებული ჩეკი", "გაუქმებული თანხა", "გაუქმების მიზეზი"
    ];
    
    const rows = history.map(r => [
      r.id,
      r.date,
      r.branch,
      r.cashierName,
      r.openingBalance.toFixed(2),
      r.cash.toFixed(2),
      r.terminal.toFixed(2),
      r.incasation.toFixed(2),
      r.closingBalance.toFixed(2),
      r.cancelledCheck?.number || "—",
      r.cancelledCheck?.amount.toFixed(2) || "0.00",
      r.cancelledCheck?.reason || "—"
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `finance_report_${filters.branch || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalCompanyCash = Object.values(branchBalances).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">ბუღალტერია</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2 flex items-center gap-3">
             <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-[2px] shadow-sm">ჯამი: {totalCompanyCash.toFixed(2)} ₾</span>
             <span className="text-slate-400 font-black">ფინანსური კონტროლი</span>
          </p>
        </div>
      </div>

      {/* Compact Branch Totals Grid */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ფილიალების ნაშთები</h3>
           <div className="h-[1px] flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {branches.map(branch => {
            const balance = branchBalances[branch.name] || 0;
            return (
              <div key={branch.name} className="bg-white rounded-[4px] border border-slate-200 p-3 shadow-sm hover:border-indigo-400 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate pr-4">{branch.name}</p>
                  <button 
                    onClick={() => handleEditBranchBalance(branch.name)}
                    className="text-slate-300 hover:text-indigo-600 transition-all p-1 -mt-1 -mr-1"
                  >
                    <Icons.Edit />
                  </button>
                </div>
                <h4 className="text-sm font-black text-slate-900 mt-1 tabular-nums">{balance.toFixed(2)} ₾</h4>
                <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500/20 w-full">
                  <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (balance / Math.max(1, totalCompanyCash)) * 100)}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Advanced Filters with Export Button */}
      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ფილიალი</label>
            <select 
              value={filters.branch} 
              onChange={e => setFilters({...filters, branch: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-black outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">ყველა ფილიალი</option>
              {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">თარიღი (დან)</label>
            <input 
              type="date"
              value={filters.startDate}
              onChange={e => setFilters({...filters, startDate: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-black outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">თარიღი (მდე)</label>
            <input 
              type="date"
              value={filters.endDate}
              onChange={e => setFilters({...filters, endDate: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-black outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">მოლარე</label>
            <input 
              type="text"
              placeholder="ძებნა სახელით..."
              value={filters.cashierName}
              onChange={e => setFilters({...filters, cashierName: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-black outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="pt-2 flex justify-end">
           <button 
              onClick={handleExportCSV}
              className="px-8 py-2.5 bg-slate-900 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-3 shadow-lg hover:-translate-y-0.5 active:scale-95"
            >
              <Icons.Newspaper /> ექსპორტი (CSV)
            </button>
        </div>
      </section>

      {/* Main Financial Report Table */}
      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">ოპერაციების ისტორია</h3>
            <span className="text-[8px] font-bold text-slate-400 uppercase">ნაჩვენებია {history.length} ჩანაწერი</span>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 text-[8px] font-black uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">
                <th className="px-5 py-4">თარიღი</th>
                <th className="px-5 py-4">ფილიალი</th>
                <th className="px-5 py-4">მოლარე</th>
                <th className="px-5 py-4 text-right">საწყისი</th>
                <th className="px-5 py-4 text-right">ნაღდი</th>
                <th className="px-5 py-4 text-right">ტერმინალი</th>
                <th className="px-5 py-4 text-right">ინკასაცია</th>
                <th className="px-5 py-4 text-right">საბოლოო</th>
                <th className="px-5 py-4">გაუქმებული</th>
                <th className="px-5 py-4 text-right">ქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors text-[10px] whitespace-nowrap group">
                  <td className="px-5 py-4 font-bold text-slate-700">{rec.date}</td>
                  <td className="px-5 py-4 text-indigo-600 font-black uppercase">{rec.branch}</td>
                  <td className="px-5 py-4 font-bold text-slate-600">{rec.cashierName}</td>
                  <td className="px-5 py-4 text-right font-black text-slate-400">{rec.openingBalance.toFixed(2)} ₾</td>
                  <td className="px-5 py-4 text-right font-black text-emerald-600">+{rec.cash.toFixed(2)} ₾</td>
                  <td className="px-5 py-4 text-right font-black text-blue-500">{rec.terminal.toFixed(2)} ₾</td>
                  <td className="px-5 py-4 text-right font-black text-rose-500">-{rec.incasation.toFixed(2)} ₾</td>
                  <td className="px-5 py-4 text-right font-black text-indigo-600 bg-indigo-50/20">{rec.closingBalance.toFixed(2)} ₾</td>
                  <td className="px-5 py-4">
                    {rec.cancelledCheck ? (
                      <div className="flex flex-col">
                        <span className="font-black text-rose-500 text-[9px] leading-none">#{rec.cancelledCheck.number}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{rec.cancelledCheck.amount.toFixed(2)} ₾</span>
                      </div>
                    ) : (
                      <span className="text-slate-200">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => { setEditingRecord(rec); setIsEditRecordModalOpen(true); }} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><Icons.Edit /></button>
                       <button onClick={() => handleDeleteRecord(rec.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"><Icons.Trash /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {history.length === 0 && !isLoading && (
                 <tr>
                    <td colSpan={10} className="px-8 py-20 text-center text-slate-300 italic text-[10px] font-black uppercase tracking-[0.2em]">მონაცემები არ მოიძებნა</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {hasMore && (
          <div className="p-8 text-center border-t border-slate-100 bg-slate-50/30">
            <button 
              onClick={() => fetchHistory(true)} 
              disabled={isLoading}
              className="px-12 py-3 bg-white border border-slate-200 rounded-[5px] text-[9px] font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3 mx-auto disabled:opacity-50"
            >
              {isLoading && <div className="w-3 h-3 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>}
              {isLoading ? 'იტვირთება...' : 'მეტის ნახვა'}
            </button>
          </div>
        )}
      </section>

      {/* Edit Balance Modal */}
      {isBalanceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsBalanceModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[5px] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-tight">ნაშთის კორექტირება</h3>
              <button onClick={() => setIsBalanceModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><Icons.X /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">ფილიალი</label>
                 <div className="w-full bg-slate-100 border border-slate-200 px-4 py-3 rounded-[5px] text-xs font-black text-slate-500 uppercase">
                    {balanceForm.branch}
                 </div>
               </div>
               <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">ახალი ნაშთი (₾)</label>
                 <input 
                   type="number" 
                   step="0.01"
                   value={balanceForm.amount} 
                   onChange={e => setBalanceForm({ ...balanceForm, amount: e.target.value })} 
                   placeholder="0.00"
                   className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-[5px] text-base font-black outline-none transition-all focus:border-indigo-600" 
                 />
               </div>
               <div className="bg-amber-50 p-4 rounded-[4px] border border-amber-100 flex gap-3">
                  <div className="text-amber-500 mt-0.5"><Icons.Alert /></div>
                  <p className="text-[9px] font-bold text-amber-700 uppercase leading-relaxed">ეს ოპერაცია პირდაპირ ცვლის ფილიალის მიმდინარე ნაშთს ბაზაში.</p>
               </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
               <button onClick={() => setIsBalanceModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">გაუქმება</button>
               <button onClick={handleUpdateStartingBalance} disabled={isUpdatingBalance} className="flex-2 py-3 bg-indigo-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg">
                 {isUpdatingBalance ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Icons.Check />}
                 შენახვა
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {isEditRecordModalOpen && editingRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsEditRecordModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[5px] shadow-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase text-slate-900 tracking-tight">რედაქტირება ({editingRecord.id})</h3>
              <button onClick={() => setIsEditRecordModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><Icons.X /></button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">თარიღი</label>
                   <input type="date" value={editingRecord.date} onChange={e => setEditingRecord({...editingRecord, date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">ფილიალი</label>
                   <select value={editingRecord.branch} onChange={e => setEditingRecord({...editingRecord, branch: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600">
                      {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                   </select>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">საწყისი ნაშთი (₾)</label>
                   <input type="number" value={editingRecord.openingBalance} onChange={e => setEditingRecord({...editingRecord, openingBalance: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">ნაღდი ნავაჭრი (₾)</label>
                   <input type="number" value={editingRecord.cash} onChange={e => setEditingRecord({...editingRecord, cash: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600" />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">ტერმინალი (₾)</label>
                   <input type="number" value={editingRecord.terminal} onChange={e => setEditingRecord({...editingRecord, terminal: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">ინკასაცია (₾)</label>
                   <input type="number" value={editingRecord.incasation} onChange={e => setEditingRecord({...editingRecord, incasation: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600" />
                 </div>
               </div>
               <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block ml-1">საბოლოო ნაშთი (₾)</label>
                 <input type="number" value={editingRecord.closingBalance} onChange={e => setEditingRecord({...editingRecord, closingBalance: parseFloat(e.target.value) || 0})} className="w-full bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-[5px] text-xs font-black outline-none" />
               </div>

               <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">გაუქმებული ჩეკი</h4>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">ნომერი</label>
                        <input type="text" value={editingRecord.cancelledCheck?.number || ''} onChange={e => setEditingRecord({...editingRecord, cancelledCheck: {...(editingRecord.cancelledCheck || {amount: 0, reason: ''}), number: e.target.value}})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">თანხა</label>
                        <input type="number" value={editingRecord.cancelledCheck?.amount || 0} onChange={e => setEditingRecord({...editingRecord, cancelledCheck: {...(editingRecord.cancelledCheck || {number: '', reason: ''}), amount: parseFloat(e.target.value) || 0}})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600" />
                     </div>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">მიზეზი</label>
                     <textarea rows={2} value={editingRecord.cancelledCheck?.reason || ''} onChange={e => setEditingRecord({...editingRecord, cancelledCheck: {...(editingRecord.cancelledCheck || {number: '', amount: 0}), reason: e.target.value}})} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[5px] text-xs font-black outline-none focus:border-indigo-600 resize-none" />
                  </div>
               </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
               <button onClick={() => setIsEditRecordModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">გაუქმება</button>
               <button onClick={handleSaveEditedRecord} className="flex-2 py-3 bg-slate-900 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg">
                 <Icons.Check /> შენახვა
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountantModule;
