
import React from 'react';
import { NewsItem } from '../types';
import { Icons } from '../constants';

interface NewsFeedProps {
  news: NewsItem[];
}

const NewsFeed: React.FC<NewsFeedProps> = ({ news }) => {
  return (
    <div className="bg-white rounded-[5px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
         <h3 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
            <Icons.Newspaper /> სიახლეები
         </h3>
         <span className="text-[9px] font-black bg-indigo-600 text-white px-3 py-1 rounded-[3px] uppercase tracking-widest">
            Live
         </span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
        {news.length === 0 ? (
          <div className="text-center py-20">
             <div className="text-slate-200 mb-2 flex justify-center scale-150"><Icons.Newspaper /></div>
             <p className="text-slate-300 font-bold text-[10px] uppercase tracking-widest">სიახლეები არ არის</p>
          </div>
        ) : (
          news.map((item) => (
            <article key={item.id} className="group p-5 rounded-[5px] border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/10 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                 <span className={`text-[8px] font-black px-2 py-0.5 rounded-[3px] uppercase tracking-widest ${
                    item.category === 'Urgent' ? 'bg-rose-100 text-rose-600' :
                    item.category === 'Events' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-600'
                 }`}>
                    {item.category}
                 </span>
                 <time className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{item.date}</time>
              </div>
              <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-2 uppercase tracking-tight">
                 {item.title}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">
                 {item.content}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ავტორი: {item.author}</span>
                 <button className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline">სრულად</button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default NewsFeed;
