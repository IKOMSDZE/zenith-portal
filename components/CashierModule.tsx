
import React, { useState, useMemo, useEffect } from 'react';
import { User, CashDeskRecord } from '../types';
import { Icons } from '../constants';
import { Database } from '../services/database';

interface CashierModuleProps {
  user: User;
}

const CashierModule: React.FC<CashierModuleProps> = ({ user }) => {
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [lastReports, setLastReports] = useState<CashDeskRecord[]>([]);
  // Local state to trigger re-renders when history changes
  const [historyVersion, setHistoryVersion] = useState(0);

  // Correctly fetch async data on mount and whenever user.branch or historyVersion changes
  useEffect(() => {
    const loadData = async () => {
      if (user.branch) {
        const balance = await Database.getBranchBalance(user.branch);
        setOpeningBalance(balance);
        const history = await Database.getCashHistory();
        const branchHistory = history
          .filter(r => r.branch === user.branch)
          .slice(0, 3);
        setLastReports(branchHistory);
      }
    };
    loadData();
  }, [user.branch, historyVersion]);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    cash: '',
    terminal: '',
    incasation: '',
    hasCancellation: false,
    checkNumber: '',
    checkAmount: '',
    cancellationReason: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isReviewing, setIsReviewing] = useState(false);

  const calcs = useMemo(() => {
    const cash = parseFloat(formData.cash) || 0;
    const terminal = parseFloat(formData.terminal) || 0;
    const incas = parseFloat(formData.incasation) || 0;
    
    // As per user request: Opening Balance + Cash - Incasation = New Cash Balance
    const cashBalance = openingBalance + cash - incas;
    
    return { 
      cashBalance, 
      revenue: cash + terminal,
      terminal,
      cash
    };
  }, [formData, openingBalance]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      setFormData(p => ({ ...p, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(p => ({ ...p, [name]: value }));
    }
  };

  const handleFinish = async () => {
    if (user.branch) {
      // Update the branch balance with the new cash-only balance
      await Database.updateBranchBalance(user.branch, calcs.cashBalance);
      
      const record: CashDeskRecord = {
        id: `TXN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        branch: user.branch,
        cashierId: user.id,
        cashierName: user.name,
        date: formData.date,
        openingBalance,
        cash: parseFloat(formData.cash) || 0,
        terminal: parseFloat(formData.terminal) || 0,
        incasation: parseFloat(formData.incasation) || 0,
        closingBalance: calcs.cashBalance,
        cancelledCheck: formData.hasCancellation ? {
          number: formData.checkNumber,
          amount: parseFloat(formData.checkAmount) || 0,
          reason: formData.cancellationReason
        } : undefined
      };
      
      await Database.saveCashRecord(record);
      
      // Reset form and close review modal immediately without success screen
      setFormData(initialFormState);
      setIsReviewing(false);
      setHistoryVersion(v => v + 1); // Trigger history refresh
      alert("მონაცემები წარმატებით გაიგზავნა.");
    }
  };

  if (!user.branch) {
    return (
      <div className="p-10 text-center bg-rose-50 rounded-[5px] border border-rose-100 animate-in fade-in">
        <div className="text-rose-400 mb-2 flex justify-center"><Icons.Alert /></div>
        <p className="text-rose-600 font-black uppercase text-xs tracking-widest">გთხოვთ აირჩიოთ ფილიალი პროფილში</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">სალაროს დახურვა</h2>
        <div className="flex items-center gap-2 mt-1">
           <span className="text-indigo-600 font-black text-[10px] uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-[3px] border border-indigo-100">{user.branch}</span>
           <span className="text-slate-300">•</span>
           <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">მოლარე: {user.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Icons.Wallet /> საოპერაციო მონაცემები
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">თარიღი</label>
                  <input 
                    type="date" 
                    name="date" 
                    value={formData.date} 
                    onChange={handleInputChange} 
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-[5px] text-[12px] font-bold text-slate-700 outline-none focus:border-indigo-500"
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">მოლარე</label>
                  <div className="w-full bg-slate-100 border border-slate-200 px-3 py-2.5 rounded-[5px] text-[12px] font-black text-slate-500">
                    {user.name}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
               <div className="space-y-1">
                  <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block ml-1">ნაღდი ფული (₾)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="cash" 
                    value={formData.cash} 
                    onChange={handleInputChange} 
                    placeholder="0.00"
                    className="w-full bg-emerald-50/30 border border-emerald-100 px-4 py-3 rounded-[5px] text-[14px] font-black text-emerald-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest block ml-1">ტერმინალი (₾)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="terminal" 
                    value={formData.terminal} 
                    onChange={handleInputChange} 
                    placeholder="0.00"
                    className="w-full bg-blue-50/30 border border-blue-100 px-4 py-3 rounded-[5px] text-[14px] font-black text-blue-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[9px] font-black text-rose-600 uppercase tracking-widest block ml-1">ინკასაცია (₾)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="incasation" 
                    value={formData.incasation} 
                    onChange={handleInputChange} 
                    placeholder="0.00"
                    className="w-full bg-rose-50/30 border border-rose-100 px-4 py-3 rounded-[5px] text-[14px] font-black text-rose-700 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50"
                  />
               </div>
            </div>
          </section>

          <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                გაუქმებული ჩეკი
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  name="hasCancellation" 
                  checked={formData.hasCancellation} 
                  onChange={handleInputChange} 
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            {formData.hasCancellation && (
              <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">ჩეკის ნომერი</label>
                      <input 
                        type="text" 
                        name="checkNumber" 
                        value={formData.checkNumber} 
                        onChange={handleInputChange} 
                        placeholder="#000000"
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">ჩეკის თანხა (₾)</label>
                      <input 
                        type="number" 
                        name="checkAmount" 
                        value={formData.checkAmount} 
                        onChange={handleInputChange} 
                        placeholder="0.00"
                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500"
                      />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">გაუქმების მიზეზი</label>
                    <textarea 
                      name="cancellationReason" 
                      rows={2} 
                      value={formData.cancellationReason} 
                      onChange={handleInputChange} 
                      placeholder="აღწერეთ მოკლედ..."
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-[5px] text-[11px] font-bold outline-none focus:border-indigo-500 resize-none"
                    />
                 </div>
              </div>
            )}
          </section>

          <button 
            onClick={() => setIsReviewing(true)} 
            className="w-full py-4 bg-slate-900 text-white rounded-[5px] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-[0.99]"
          >
            მონაცემების გადამოწმება
          </button>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden h-fit sticky top-6">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                 <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">სალაროს რეზიუმე</h3>
              </div>
              <div className="p-6 space-y-6">
                 <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ნაღდი ფული სალაროში</p>
                    </div>
                    <div className="space-y-2 bg-slate-50 p-3 rounded-[5px] border border-slate-100">
                       <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-bold">საწყისი ნაშთი:</span>
                          <span className="font-bold text-slate-700">{openingBalance.toFixed(2)} ₾</span>
                       </div>
                       <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-bold">ნაღდი ნავაჭრი:</span>
                          <span className="font-bold text-emerald-500">+ {calcs.cash.toFixed(2)} ₾</span>
                       </div>
                       <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-bold">ინკასაცია:</span>
                          <span className="font-bold text-rose-500">- { (parseFloat(formData.incasation) || 0).toFixed(2) } ₾</span>
                       </div>
                       <div className="h-[1px] bg-slate-200 my-1"></div>
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-800 uppercase">ნაღდი ნაშთი:</span>
                          <span className="text-xl font-black text-indigo-600 tabular-nums">{calcs.cashBalance.toFixed(2)} ₾</span>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-3 pt-6 border-t border-slate-50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">უნაღდო ბრუნვა</p>
                    <div className="space-y-2 bg-slate-50 p-3 rounded-[5px] border border-slate-100">
                       <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-bold">ტერმინალი:</span>
                          <span className="font-bold text-blue-600">{calcs.terminal.toFixed(2)} ₾</span>
                       </div>
                    </div>
                 </div>

                 <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase">ჯამური ნავაჭრი:</span>
                      <span className="text-lg font-black text-slate-900">{calcs.revenue.toFixed(2)} ₾</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 italic leading-tight text-center mt-4">
                       დახურვისას სისტემაში განახლდება მხოლოდ ნაღდი ფულის ნაშთი.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* NEW: Bottom Section - Last 3 Reports for this Branch */}
      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Icons.Clock /> ბოლო 3 რეპორტი ({user.branch})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[8px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-4 py-3">თარიღი</th>
                <th className="px-4 py-3">მოლარე</th>
                <th className="px-4 py-3 text-right">ნაღდი</th>
                <th className="px-4 py-3 text-right">ტერმინალი</th>
                <th className="px-4 py-3 text-right">ინკასაცია</th>
                <th className="px-4 py-3 text-right">საბოლოო ნაშთი</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lastReports.map((r) => (
                <tr key={r.id} className="text-[10px] hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-slate-700">{r.date}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-500">{r.cashierName}</td>
                  <td className="px-4 py-2.5 text-right font-black text-emerald-600 tabular-nums">{r.cash.toFixed(2)} ₾</td>
                  <td className="px-4 py-2.5 text-right font-black text-blue-600 tabular-nums">{r.terminal.toFixed(2)} ₾</td>
                  <td className="px-4 py-2.5 text-right font-black text-rose-600 tabular-nums">{r.incasation.toFixed(2)} ₾</td>
                  <td className="px-4 py-2.5 text-right font-black text-indigo-600 tabular-nums bg-indigo-50/30">{r.closingBalance.toFixed(2)} ₾</td>
                </tr>
              ))}
              {lastReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-300 italic text-[10px] uppercase tracking-widest">ისტორია ცარიელია</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isReviewing && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[5px] w-full max-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
               <h4 className="text-sm font-black uppercase text-slate-900">მონაცემების გადამოწმება</h4>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                 <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase">თარიღი:</span> <span className="font-bold">{formData.date}</span></div>
                 <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase">ფილიალი:</span> <span className="font-bold text-indigo-600">{user.branch}</span></div>
                 <div className="h-[1px] bg-slate-100 my-2"></div>
                 <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase">საწყისი ნაშთი:</span> <span className="font-black">{openingBalance.toFixed(2)} ₾</span></div>
                 <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase">ნაღდი ფული:</span> <span className="font-black">+{calcs.cash.toFixed(2)} ₾</span></div>
                 <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase">ინკასაცია:</span> <span className="font-black text-rose-600">-{ (parseFloat(formData.incasation) || 0).toFixed(2) } ₾</span></div>
                 <div className="h-[1px] bg-slate-200 my-2"></div>
                 <div className="flex justify-between text-sm"><span className="text-slate-900 font-black uppercase">საბოლოო ნაშთი:</span> <span className="font-black text-indigo-600 underline text-lg">{calcs.cashBalance.toFixed(2)} ₾</span></div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-2">
              <button onClick={() => setIsReviewing(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors">უკან</button>
              <button onClick={handleFinish} className="flex-2 py-3 bg-indigo-600 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">დადასტურება</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierModule;
