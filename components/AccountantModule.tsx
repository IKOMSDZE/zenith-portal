
import React, { useState, useMemo, useEffect } from 'react';
import { CashDeskRecord, BranchConfig } from '../types';
import { Icons } from '../constants';
import { Database } from '../services/database';

interface AccountantModuleProps {
  branches: BranchConfig[];
}

const AccountantModule: React.FC<AccountantModuleProps> = ({ branches }) => {
  const [history, setHistory] = useState<CashDeskRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<CashDeskRecord | null>(null);
  const [branchBalances, setBranchBalances] = useState<Record<string, number>>({});
  
  // Load data asynchronously
  useEffect(() => {
    const loadData = async () => {
      const data = await Database.getCashHistory();
      setHistory(data);
      
      const balances: Record<string, number> = {};
      for (const branch of branches) {
        balances[branch.name] = await Database.getBranchBalance(branch.name);
      }
      setBranchBalances(balances);
    };
    loadData();
  }, [branches]);

  // Filters for all variables
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

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredHistory = useMemo(() => {
    return history.filter(rec => {
      const matchBranch = filters.branch ? rec.branch === filters.branch : true;
      const matchCashier = filters.cashier ? rec.cashierName.toLowerCase().includes(filters.cashier.toLowerCase()) : true;
      
      // Date range logic
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

      // Numeric filters
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
  }, [history, filters]);

  const handleUpdateBalance = async (branchName: string, value: string) => {
    const newVal = parseFloat(value) || 0;
    await Database.updateBranchBalance(branchName, newVal);
    setBranchBalances(prev => ({ ...prev, [branchName]: newVal }));
  };

  const handleEditRecord = (record: CashDeskRecord) => {
    setEditingRecord({ ...record });
  };

  const handleSaveEdit = async () => {
    if (editingRecord) {
      await Database.saveCashRecord(editingRecord);
      const updatedHistory = await Database.getCashHistory();
      setHistory(updatedHistory);
      setEditingRecord(null);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm("დარწმუნებული ხართ რომ გსურთ ჩანაწერის წაშლა?")) {
      await Database.deleteCashRecord(id);
      const updatedHistory = await Database.getCashHistory();
      setHistory(updatedHistory);
    }
  };

  const handleDownloadReport = () => {
    if (filteredHistory.length === 0) {
      alert("ჩამოსატვირთი მონაცემები არ არის.");
      return;
    }

    // CSV structure for Excel (using semicolon as common European/Georgian separator or comma with BOM)
    const headers = ["თარიღი", "ფილიალი", "მოლარე", "საწყისი ნაშთი", "ნაღდი", "ტერმინალი", "ინკასაცია", "საბოლოო ნაშთი"];
    const csvRows = filteredHistory.map(rec => [
      rec.date,
      rec.branch,
      rec.cashierName,
      rec.openingBalance.toFixed(2),
      rec.cash.toFixed(2),
      rec.terminal.toFixed(2),
      rec.incasation.toFixed(2),
      rec.closingBalance.toFixed(2)
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    
    // Add UTF-8 BOM for Georgian characters support in Excel
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `სალაროს_რეპორტი_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      {/* Branch Balances Quick Edit */}
      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            ფილიალების ნაშთების მართვა
          </h3>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {branches.map(branch => (
            <div key={branch.name} className="p-2.5 rounded-[5px] border border-slate-100 bg-slate-50/30">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 truncate">
                {branch.name}
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={branchBalances[branch.name] || 0}
                  onChange={(e) => setBranchBalances(prev => ({ ...prev, [branch.name]: parseFloat(e.target.value) || 0 }))}
                  onBlur={(e) => handleUpdateBalance(branch.name, e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-[3px] px-2 py-1.5 text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300">₾</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Advanced Filters */}
      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
            <Icons.Search /> გაფართოებული ფილტრაცია
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={resetFilters}
              className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
            >
              გასუფთავება
            </button>
            <button 
              onClick={handleDownloadReport}
              className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md"
            >
              <Icons.Newspaper /> EXCEL-ში ექსპორტი
            </button>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ფილიალი</label>
            <select 
              name="branch"
              value={filters.branch} 
              onChange={handleFilterChange} 
              className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none"
            >
              <option value="">ყველა ფილიალი</option>
              {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">მოლარე</label>
            <input 
              name="cashier"
              type="text" 
              placeholder="სახელი..." 
              value={filters.cashier} 
              onChange={handleFilterChange} 
              className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">თარიღი (დან)</label>
            <input 
              name="startDate"
              type="date" 
              value={filters.startDate} 
              onChange={handleFilterChange} 
              className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">თარიღი (მდე)</label>
            <input 
              name="endDate"
              type="date" 
              value={filters.endDate} 
              onChange={handleFilterChange} 
              className="w-full bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none"
            />
          </div>

          {/* Amount Filters */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ნაღდი ფული (დიაპაზონი)</label>
            <div className="flex gap-2">
              <input name="minCash" placeholder="Min" type="number" value={filters.minCash} onChange={handleFilterChange} className="w-1/2 bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none" />
              <input name="maxCash" placeholder="Max" type="number" value={filters.maxCash} onChange={handleFilterChange} className="w-1/2 bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ტერმინალი (დიაპაზონი)</label>
            <div className="flex gap-2">
              <input name="minTerminal" placeholder="Min" type="number" value={filters.minTerminal} onChange={handleFilterChange} className="w-1/2 bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none" />
              <input name="maxTerminal" placeholder="Max" type="number" value={filters.maxTerminal} onChange={handleFilterChange} className="w-1/2 bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ინკასაცია (დიაპაზონი)</label>
            <div className="flex gap-2">
              <input name="minIncasation" placeholder="Min" type="number" value={filters.minIncasation} onChange={handleFilterChange} className="w-1/2 bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none" />
              <input name="maxIncasation" placeholder="Max" type="number" value={filters.maxIncasation} onChange={handleFilterChange} className="w-1/2 bg-slate-50 border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none" />
            </div>
          </div>

          <div className="flex items-end">
            <p className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-2.5 rounded-[5px] w-full text-center border border-indigo-100">
              ნაჩვენებია: {filteredHistory.length} ჩანაწერი
            </p>
          </div>
        </div>
      </section>

      {/* Results Table */}
      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[8px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">თარიღი</th>
                <th className="px-6 py-4">ფილიალი</th>
                <th className="px-6 py-4">მოლარე</th>
                <th className="px-6 py-4 text-right">ნაღდი</th>
                <th className="px-6 py-4 text-right">ტერმინალი</th>
                <th className="px-6 py-4 text-right">ინკასაცია</th>
                <th className="px-6 py-4 text-right">საბოლოო ნაშთი</th>
                <th className="px-6 py-4 text-right">ქმედება</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/30 transition-colors text-[10px]">
                  <td className="px-6 py-3 font-bold whitespace-nowrap">{rec.date}</td>
                  <td className="px-6 py-3 text-indigo-600 font-black uppercase whitespace-nowrap">{rec.branch}</td>
                  <td className="px-6 py-3 font-bold whitespace-nowrap">{rec.cashierName}</td>
                  <td className="px-6 py-3 text-right font-black text-emerald-600 tabular-nums">{rec.cash.toFixed(2)} ₾</td>
                  <td className="px-6 py-3 text-right font-black text-blue-600 tabular-nums">{rec.terminal.toFixed(2)} ₾</td>
                  <td className="px-6 py-3 text-right font-black text-rose-600 tabular-nums">{rec.incasation.toFixed(2)} ₾</td>
                  <td className="px-6 py-3 text-right font-black text-indigo-600 tabular-nums bg-indigo-50/20">{rec.closingBalance.toFixed(2)} ₾</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEditRecord(rec)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Icons.Edit /></button>
                      <button onClick={() => handleDeleteRecord(rec.id)} className="p-1.5 text-slate-400 hover:text-rose-500"><Icons.Trash /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-20 text-center">
                    <p className="text-slate-400 font-bold text-[10px] uppercase italic tracking-widest">რეპორტები ამ ფილტრებით არ მოიძებნა</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[5px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
               <h4 className="text-sm font-black uppercase text-slate-900">მონაცემის რედაქტირება</h4>
               <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600"><Icons.X /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ნაღდი ფული</label>
                  <input type="number" value={editingRecord.cash} onChange={e => setEditingRecord({...editingRecord, cash: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[12px] font-black outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ტერმინალი</label>
                  <input type="number" value={editingRecord.terminal} onChange={e => setEditingRecord({...editingRecord, terminal: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[12px] font-black outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ინკასაცია</label>
                  <input type="number" value={editingRecord.incasation} onChange={e => setEditingRecord({...editingRecord, incasation: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[12px] font-black outline-none focus:border-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">დახურვის ნაშთი</label>
                  <input type="number" value={editingRecord.closingBalance} onChange={e => setEditingRecord({...editingRecord, closingBalance: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[12px] font-black outline-none focus:border-indigo-500" />
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-2">
              <button onClick={() => setEditingRecord(null)} className="flex-1 py-2 bg-white border border-slate-200 rounded-[5px] text-[10px] font-black uppercase hover:bg-slate-100">გაუქმება</button>
              <button onClick={handleSaveEdit} className="flex-1 py-2 bg-indigo-600 text-white rounded-[5px] text-[10px] font-black uppercase hover:bg-indigo-700">შენახვა</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountantModule;
