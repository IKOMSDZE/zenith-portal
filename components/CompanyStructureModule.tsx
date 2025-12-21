
import React, { useState } from 'react';
import { Icons } from '../constants';
import { BranchConfig, PositionMapping } from '../types';

interface CompanyStructureModuleProps {
  branches: BranchConfig[];
  onUpdateBranches: (newBranches: BranchConfig[]) => void;
  positions: PositionMapping[];
  onUpdatePositions: (newPositions: PositionMapping[]) => void;
  departments: string[];
  onUpdateDepartments: (newDepts: string[]) => void;
}

const CompanyStructureModule: React.FC<CompanyStructureModuleProps> = ({
  branches,
  onUpdateBranches,
  positions,
  onUpdatePositions,
  departments,
  onUpdateDepartments
}) => {
  const [newBranch, setNewBranch] = useState<BranchConfig>({ name: '', openTime: '09:00', lateThreshold: 15 });
  const [editingBranch, setEditingBranch] = useState<{index: number, data: BranchConfig} | null>(null);
  const [newDept, setNewDept] = useState('');
  const [editingDept, setEditingDept] = useState<{index: number, value: string} | null>(null);
  const [newPos, setNewPos] = useState<PositionMapping>({ title: '', department: '' });
  const [editingPos, setEditingPos] = useState<{index: number, data: PositionMapping} | null>(null);

  const handleAddBranch = () => {
    if (!newBranch.name) return;
    onUpdateBranches([...branches, newBranch]);
    setNewBranch({ name: '', openTime: '09:00', lateThreshold: 15 });
  };
  const handleUpdateBranch = () => {
    if (!editingBranch) return;
    const updated = [...branches]; updated[editingBranch.index] = editingBranch.data;
    onUpdateBranches(updated); setEditingBranch(null);
  };
  const handleDeleteBranch = (name: string) => {
    if (window.confirm(`ნამდვილად გსურთ ფილიალის წაშლა: ${name}?`)) onUpdateBranches(branches.filter(b => b.name !== name));
  };
  const handleAddDept = () => {
    if (!newDept || departments.includes(newDept)) return;
    onUpdateDepartments([...departments, newDept]); setNewDept('');
  };
  const handleUpdateDept = () => {
    if (!editingDept) return;
    const updated = [...departments]; updated[editingDept.index] = editingDept.value;
    onUpdateDepartments(updated); setEditingDept(null);
  };
  const handleDeleteDept = (dept: string) => {
    if (window.confirm(`ნამდვილად გსურთ დეპარტამენტის წაშლა: ${dept}?`)) onUpdateDepartments(departments.filter(d => d !== dept));
  };
  const handleAddPos = () => {
    if (!newPos.title || !newPos.department) return;
    onUpdatePositions([...positions, newPos]); setNewPos({ title: '', department: '' });
  };
  const handleUpdatePos = () => {
    if (!editingPos) return;
    const updated = [...positions]; updated[editingPos.index] = editingPos.data;
    onUpdatePositions(updated); setEditingPos(null);
  };
  const handleDeletePos = (pos: PositionMapping) => {
    if (window.confirm(`ნამდვილად გსურთ პოზიციის წაშლა: ${pos.title}?`)) onUpdatePositions(positions.filter(p => p.title !== pos.title || p.department !== pos.department));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">კომპანიის სტრუქტურა</h2>
        <p className="text-slate-500 font-bold text-[11px] uppercase tracking-widest">ფილიალების, დეპარტამენტებისა და პოზიციების მართვა</p>
      </div>

      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-900 uppercase">ფილიალები</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-slate-50 p-4 rounded-[5px] border border-slate-100">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">ფილიალის დასახელება</label>
              <input type="text" value={editingBranch ? editingBranch.data.name : newBranch.name} onChange={e => editingBranch ? setEditingBranch({...editingBranch, data: {...editingBranch.data, name: e.target.value}}) : setNewBranch({ ...newBranch, name: e.target.value })} className="w-full bg-white border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none" placeholder="მაგ: ვაჟა-ფშაველა" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">გახსნის დრო</label>
              <input type="time" value={editingBranch ? editingBranch.data.openTime : newBranch.openTime} onChange={e => editingBranch ? setEditingBranch({...editingBranch, data: {...editingBranch.data, openTime: e.target.value}}) : setNewBranch({ ...newBranch, openTime: e.target.value })} className="w-full bg-white border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">დაგვიანების ლიმიტი (წთ)</label>
              <input type="number" value={editingBranch ? editingBranch.data.lateThreshold : newBranch.lateThreshold} onChange={e => editingBranch ? setEditingBranch({...editingBranch, data: {...editingBranch.data, lateThreshold: parseInt(e.target.value) || 0}}) : setNewBranch({ ...newBranch, lateThreshold: parseInt(e.target.value) || 0 })} className="w-full bg-white border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none" />
            </div>
            <button onClick={editingBranch ? handleUpdateBranch : handleAddBranch} className="bg-slate-900 text-white rounded-[5px] py-2.5 font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-800">{editingBranch ? 'შენახვა' : 'დამატება'}</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {branches.map((b, idx) => (
              <div key={b.name} className="flex items-center justify-between p-4 border border-slate-100 rounded-[5px] bg-white group shadow-sm hover:border-indigo-200 transition-colors">
                <div>
                  <p className="font-black text-slate-800 text-[11px] uppercase tracking-tight">{b.name}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{b.openTime} • {b.lateThreshold} წუთი ლიმიტი</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingBranch({index: idx, data: b})} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><Icons.Edit /></button>
                  <button onClick={() => handleDeleteBranch(b.name)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"><Icons.Trash /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-900 uppercase">დეპარტამენტები</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex gap-3 items-end bg-slate-50 p-4 rounded-[5px] border border-slate-100">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">დეპარტამენტის დასახელება</label>
              <input type="text" value={editingDept ? editingDept.value : newDept} onChange={e => editingDept ? setEditingDept({...editingDept, value: e.target.value}) : setNewDept(e.target.value)} className="w-full bg-white border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none" placeholder="მაგ: გაყიდვები" />
            </div>
            <button onClick={editingDept ? handleUpdateDept : handleAddDept} className="bg-indigo-600 text-white px-8 py-2.5 rounded-[5px] font-black text-[10px] uppercase tracking-widest shadow-sm transition-all hover:bg-indigo-700">{editingDept ? 'შენახვა' : 'დამატება'}</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {departments.map((dept, idx) => (
              <div key={dept} className="flex items-center justify-between p-4 bg-slate-50 rounded-[5px] border border-slate-100 group gap-3 hover:bg-slate-100/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-900 text-xs uppercase tracking-tight">{dept}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingDept({index: idx, value: dept})} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><Icons.Edit /></button>
                  <button onClick={() => handleDeleteDept(dept)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"><Icons.Trash /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-900 uppercase">პოზიციები</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-slate-50 p-4 rounded-[5px] border border-slate-100">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">პოზიციის დასახელება</label>
              <input type="text" value={editingPos ? editingPos.data.title : newPos.title} onChange={e => editingPos ? setEditingPos({...editingPos, data: {...editingPos.data, title: e.target.value}}) : setNewPos({ ...newPos, title: e.target.value })} className="w-full bg-white border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none" placeholder="მაგ: კონსულტანტი" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">დეპარტამენტი</label>
              <select value={editingPos ? editingPos.data.department : newPos.department} onChange={e => editingPos ? setEditingPos({...editingPos, data: {...editingPos.data, department: e.target.value}}) : setNewPos({ ...newPos, department: e.target.value })} className="w-full bg-white border border-slate-200 rounded-[5px] px-3 py-2 text-[11px] font-bold outline-none">
                <option value="">აირჩიეთ დეპარტამენტი</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button onClick={editingPos ? handleUpdatePos : handleAddPos} className="bg-indigo-600 text-white rounded-[5px] py-2.5 font-black text-[10px] uppercase tracking-widest shadow-sm transition-all hover:bg-indigo-700">{editingPos ? 'შენახვა' : 'დამატება'}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {positions.map((p, idx) => (
              <div key={`${p.title}-${idx}`} className="p-4 border border-slate-100 rounded-[5px] bg-white shadow-sm flex justify-between items-center group hover:border-indigo-100 transition-colors">
                <div>
                  <p className="font-black text-slate-800 text-[10px] uppercase tracking-tight">{p.title}</p>
                  <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest mt-1">{p.department}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingPos({index: idx, data: p})} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><Icons.Edit /></button>
                  <button onClick={() => handleDeletePos(p)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"><Icons.Trash /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CompanyStructureModule;
