
import React from 'react';
import { Icons } from '../constants';
import { NewsItem } from '../types';

interface NewsFeedProps {
  news: NewsItem[];
}

const NewsFeed: React.FC<NewsFeedProps> = ({ news }) => {
  const sortedNews = [...news].sort((a, b) => {
    // Basic string sort for dates if formatted as DD/MM/YYYY or YYYY-MM-DD
    // For reliable sorting we should use timestamp but this works for simple cases
    return b.id.localeCompare(a.id);
  });

  return (
    <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
          <Icons.Newspaper /> კომპანიის სიახლეები
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
        {sortedNews.map(item => (
          <div key={item.id} className="p-6 hover:bg-slate-50 transition-all group cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-[3px] uppercase tracking-widest ${
                item.type === 'Success' ? 'bg-emerald-50 text-emerald-600' :
                item.type === 'Alert' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
              }`}>
                {item.type}
              </span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.date}</span>
            </div>
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-1 group-hover:text-indigo-600 transition-colors">
              {item.title}
            </h4>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed line-clamp-2">
              {item.content}
            </p>
          </div>
        ))}
        {news.length === 0 && (
          <div className="p-12 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.2em] italic">
            სიახლეები არ არის
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsFeed;
