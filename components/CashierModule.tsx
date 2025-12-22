
import React, { useState, useMemo, useEffect } from 'react';
import { User, CashDeskRecord } from '../types';
import { Icons } from '../constants';
import { Database } from '../services/database';

interface CashierModuleProps {
  user: User;
  onUpdateCashHistory: (record: CashDeskRecord) => Promise<void>;
}

const CashierModule: React.FC<CashierModuleProps> = ({ user, onUpdateCashHistory }) => {
  const [openingBalance, setOpeningBalance] = useState(0);
  const [lastReports, setLastReports] = useState<CashDeskRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (user.branch) {
      Database.getBranchBalance(user.branch).then(setOpeningBalance);
      Database.getCashHistory().then(history => {
        const filtered = history
          .filter(r => r.branch === user.branch)
          .slice(0, 3);
        setLastReports(filtered);
      });
    }
  }, [user.branch]);

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
    // Updated: Both cash and terminal sales are added to the opening balance
    const cashBalance = openingBalance + cash + terminal - incas;
    return { cashBalance, revenue: cash + terminal, terminal, cash };
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
    if (!user.branch || isSyncing) return;

    setIsSyncing(true);
    try {
      // 1. Update the running branch balance in Firestore
      await Database.updateBranchBalance(user.branch, calcs.cashBalance);

      // 2. Create the historical record
      const record = {
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
        // Only include cancelledCheck if it exists
        ...(formData.hasCancellation && {
          cancelledCheck: {
            number: formData.checkNumber,
            amount: parseFloat(formData.checkAmount) || 0,
            reason: formData.cancellationReason
          }
        })
      };

      // 3. Sync to cashHistory collection in Firestore
      await onUpdateCashHistory(record);

      // 4. Success UI cleanup
      setFormData(initialFormState);
      setIsReviewing(false);
      
      // Refresh local balance
      const newBal = await Database.getBranchBalance(user.branch);
      setOpeningBalance(newBal);
      
      alert("მონაცემები წარმატებით გაიგზავნა და შენახულია ბაზაში.");
    } catch (err: any) {
      console.error("Failed to save day closing:", err);
      alert(`შეცდომა შენახვისას: ${err.message || 'დაფიქსირდა ტექნიკური ხარვეზი'}`);
    } finally {
      setIsSyncing(false);
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-white p-10 rounded-[5px] border border-slate-200 shadow-sm">
        <div className="space-y-3">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">ფინანსური მოდული</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">სალაროს დახურვა</h1>
          <div className="flex items-center gap-4 mt-1">
             <span className="text-indigo-600 font-black text-[10px] uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-[3px] border border-indigo-100 shadow-sm">{user.branch}</span>
             <span className="text-slate-300">•</span>
             <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">მოლარე: {user.name}</span>
          </div>
        </div>
        <div className="text-right hidden sm:block space-y-2">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">მიმდინარე ნაშთი</p>
           <p className="text-4xl font-black text-slate-900 tabular-nums leading-none">{openingBalance.toFixed(2)} ₾</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm p-12">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-10 flex items-center gap-4">
              <Icons.Wallet /> საოპერაციო მონაცემები
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">საანგარიშო თარიღი</label>
                  <input 
                    type="date" 
                    name="date" 
                    value={formData.date} 
                    onChange={handleInputChange} 
                    className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-[5px] text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">ფილიალის ნომერი</label>
                  <div className="w-full bg-slate-100 border border-slate-200 px-5 py-4 rounded-[5px] text-sm font-black text-slate-500 uppercase flex items-center shadow-sm">
                    {user.branch}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block ml-1 leading-none">ნაღდი ფული (₾)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="cash" 
                    value={formData.cash} 
                    onChange={handleInputChange} 
                    placeholder="0.00"
                    className="w-full bg-emerald-50/40 border border-emerald-100 px-6 py-5 rounded-[5px] text-xl font-black text-emerald-700 outline-none focus:border-emerald-500 focus:ring-8 focus:ring-emerald-50/50 transition-all shadow-sm"
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block ml-1 leading-none">ტერმინალი (₾)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="terminal" 
                    value={formData.terminal} 
                    onChange={handleInputChange} 
                    placeholder="0.00"
                    className="w-full bg-blue-50/40 border border-blue-100 px-6 py-5 rounded-[5px] text-xl font-black text-blue-700 outline-none focus:border-blue-500 focus:ring-8 focus:ring-blue-50/50 transition-all shadow-sm"
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest block ml-1 leading-none">ინკასაცია (₾)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="incasation" 
                    value={formData.incasation} 
                    onChange={handleInputChange} 
                    placeholder="0.00"
                    className="w-full bg-rose-50/40 border border-rose-100 px-6 py-5 rounded-[5px] text-xl font-black text-rose-700 outline-none focus:border-rose-500 focus:ring-8 focus:ring-rose-50/50 transition-all shadow-sm"
                  />
               </div>
            </div>
          </section>

          <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-12 py-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                <Icons.Alert /> გაუქმებული ჩეკის დეკლარაცია
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  name="hasCancellation" 
                  checked={formData.hasCancellation} 
                  onChange={handleInputChange} 
                  className="sr-only peer" 
                />
                <div className="w-12 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
              </label>
            </div>
            
            {formData.hasCancellation && (
              <div className="p-12 space-y-10 animate-in slide-in-from-top-4 duration-400">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">ჩეკის ნომერი</label>
                      <input 
                        type="text" 
                        name="checkNumber" 
                        value={formData.checkNumber} 
                        onChange={handleInputChange} 
                        placeholder="#000000"
                        className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-[5px] text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">ჩეკის თანხა (₾)</label>
                      <input 
                        type="number" 
                        name="checkAmount" 
                        value={formData.checkAmount} 
                        onChange={handleInputChange} 
                        placeholder="0.00"
                        className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-[5px] text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 leading-none">გაუქმების მიზეზი</label>
                    <textarea 
                      name="cancellationReason" 
                      rows={4} 
                      value={formData.cancellationReason} 
                      onChange={handleInputChange} 
                      placeholder="აღწერეთ მოკლედ..."
                      className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-[5px] text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white resize-none transition-all shadow-sm leading-relaxed"
                    />
                 </div>
              </div>
            )}
          </section>

          <button 
            onClick={() => setIsReviewing(true)} 
            className="w-full py-6 bg-slate-900 text-white rounded-[5px] font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl active:scale-[0.99] mt-4"
          >
            მონაცემების გადამოწმება
          </button>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden h-fit sticky top-8">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                 <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">სალაროს რეზიუმე</h3>
              </div>
              <div className="p-10 space-y-12">
                 <div className="space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-md"></span>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ბრუნვა და ნაშთი</p>
                    </div>
                    <div className="space-y-4 bg-slate-50 p-8 rounded-[5px] border border-slate-100 shadow-sm">
                       <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-bold uppercase tracking-tight">საწყისი ნაშთი:</span>
                          <span className="font-black text-slate-700 tabular-nums">{openingBalance.toFixed(2)} ₾</span>
                       </div>
                       <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-bold uppercase tracking-tight">ნავაჭრი (ნაღდი):</span>
                          <span className="font-black text-emerald-500 tabular-nums">+ {calcs.cash.toFixed(2)} ₾</span>
                       </div>
                       <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-bold uppercase tracking-tight">ნავაჭრი (უნაღდო):</span>
                          <span className="font-black text-blue-500 tabular-nums">+ {calcs.terminal.toFixed(2)} ₾</span>
                       </div>
                       <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-bold uppercase tracking-tight">ინკასაცია:</span>
                          <span className="font-black text-rose-500 tabular-nums">- { (parseFloat(formData.incasation) || 0).toFixed(2) } ₾</span>
                       </div>
                       <div className="h-[1px] bg-slate-200 my-4"></div>
                       <div className="flex justify-between items-end pt-1">
                          <span className="text-[10px] font-black text-slate-800 uppercase leading-none">ახალი ნაშთი:</span>
                          <span className="text-3xl font-black text-indigo-600 tabular-nums leading-none">{calcs.cashBalance.toFixed(2)} ₾</span>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-5 pt-10 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">დღიური ჯამი</p>
                    <div className="bg-slate-50 p-8 rounded-[5px] border border-slate-100 shadow-sm">
                       <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500 font-bold uppercase tracking-tight">ჯამური ნავაჭრი:</span>
                          <span className="text-xl font-black text-slate-900 tabular-nums leading-none">{calcs.revenue.toFixed(2)} ₾</span>
                       </div>
                    </div>
                 </div>

                 <div className="pt-10 border-t border-slate-100 space-y-4">
                    <p className="text-[9px] font-bold text-slate-400 italic leading-relaxed text-center uppercase tracking-wider">
                       დადასტურებისას ფილიალის საწყის ნაშთს დაემატება ჯამური ნავაჭრი და გამოაკლდება ინკასაცია.
                    </p>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">ფილიალის ისტორია</h3>
                <Icons.Clock />
              </div>
              <div className="divide-y divide-slate-100">
                {lastReports.map(r => (
                  <div key={r.id} className="p-6 hover:bg-slate-50 transition-all group duration-300">
                    <div className="flex justify-between text-sm font-black text-slate-900 mb-2 uppercase tracking-tight leading-none">
                      <span>{r.date}</span>
                      <span className="text-indigo-600 tabular-nums">{r.closingBalance.toFixed(2)} ₾</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">მოლარე: {r.cashierName}</p>
                  </div>
                ))}
                {lastReports.length === 0 && <p className="p-12 text-[10px] text-slate-300 italic text-center uppercase font-black tracking-widest">ისტორია ცარიელია</p>}
              </div>
           </div>
        </div>
      </div>

      {isReviewing && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[5px] w-full max-w-lg overflow-hidden shadow-3xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 bg-slate-50">
               <h4 className="text-lg font-black uppercase text-slate-900 tracking-tight leading-none">მონაცემების გადამოწმება</h4>
            </div>
            <div className="p-12 space-y-10">
              <div className="space-y-5">
                 <div className="flex justify-between items-center text-[11px]"><span className="text-slate-400 font-black uppercase tracking-widest">თარიღი:</span> <span className="font-bold text-slate-900">{formData.date}</span></div>
                 <div className="flex justify-between items-center text-[11px]"><span className="text-slate-400 font-black uppercase tracking-widest">ფილიალი:</span> <span className="font-black text-indigo-600 uppercase">{user.branch}</span></div>
                 <div className="h-[1px] bg-slate-100 my-6"></div>
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-black uppercase tracking-widest">საწყისი ნაშთი:</span> <span className="font-black text-slate-900">{openingBalance.toFixed(2)} ₾</span></div>
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-black uppercase tracking-widest">ჯამური ნავაჭრი:</span> <span className="font-black text-emerald-600">+{calcs.revenue.toFixed(2)} ₾</span></div>
                 <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-black uppercase tracking-widest">ინკასაცია:</span> <span className="font-black text-rose-600">-{ (parseFloat(formData.incasation) || 0).toFixed(2) } ₾</span></div>
                 <div className="h-[1px] bg-slate-200 my-6"></div>
                 <div className="flex justify-between items-end"><span className="text-slate-900 font-black uppercase tracking-widest leading-none">ახალი ნაშთი:</span> <span className="font-black text-indigo-600 underline text-3xl tabular-nums leading-none">{calcs.cashBalance.toFixed(2)} ₾</span></div>
              </div>
            </div>
            <div className="p-10 bg-slate-50 flex gap-4">
              <button 
                onClick={() => setIsReviewing(false)} 
                disabled={isSyncing}
                className="flex-1 py-5 bg-white border border-slate-200 rounded-[5px] text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50"
              >
                უკან
              </button>
              <button 
                onClick={handleFinish} 
                disabled={isSyncing}
                className="flex-2 py-5 bg-indigo-600 text-white rounded-[5px] text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSyncing ? (
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : <Icons.Check />}
                <span>{isSyncing ? 'ინახება...' : 'დადასტურება'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierModule;
