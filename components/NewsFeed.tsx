
import React from 'react';
import { Icons } from '../constants';
import { NewsItem } from '../types';

interface NewsFeedProps {
  news: NewsItem[];
}

const NewsFeed: React.FC<NewsFeedProps> = ({ news }) => {
  const sortedNews = [...news].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-widest flex items-center gap-3">
          <Icons.Newspaper /> კომპანიის სიახლეები
        </h3>
        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded-[3px]">{news.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
        {sortedNews.map(item => (
          <div key={item.id} className="p-8 hover:bg-slate-50 transition-all group cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-[3px] uppercase tracking-widest border ${
                item.type === 'Success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                item.type === 'Alert' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
              }`}>
                {item.type}
              </span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{item.date}</span>
            </div>
            <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">
              {item.title}
            </h4>
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
              {item.content}
            </p>
          </div>
        ))}
        {news.length === 0 && (
          <div className="p-20 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.3em] italic">
            სიახლეები არ მოიძებნა
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsFeed;
