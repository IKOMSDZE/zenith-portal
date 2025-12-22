
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { GeminiService } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatSession = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!chatSession.current) {
      chatSession.current = GeminiService.startChat();
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setIsLoading(true);

    try {
      if (!chatSession.current) {
        chatSession.current = GeminiService.startChat();
      }
      
      const response = await chatSession.current.sendMessage({ message: userText });
      const aiText = response.text || "ბოდიში, პასუხის მიღება ვერ მოხერხდა.";
      setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "ქსელური შეცდომა. სცადეთ მოგვიანებით." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      {/* Toggle Button */}
      <button 
        onClick={toggleChat}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-3xl transition-all duration-500 hover:scale-110 active:scale-90 ${isOpen ? 'bg-slate-900 rotate-90' : 'bg-indigo-600'}`}
      >
        {isOpen ? <Icons.X /> : <div className="text-white scale-150"><Icons.Dashboard /></div>}
        {!isOpen && messages.length === 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
          </span>
        )}
      </button>

      {/* Chat Interface */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 sm:w-[400px] h-[550px] bg-white rounded-[5px] shadow-3xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-[5px] flex items-center justify-center font-black text-white">Z</div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest leading-none">ზენი ასისტენტი</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">ონლაინ</p>
                </div>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50 custom-scrollbar">
            {messages.length === 0 && (
              <div className="text-center py-12 space-y-6">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                  <div className="text-indigo-600 scale-125"><Icons.Dashboard /></div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">როგორ დაგეხმაროთ?</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed px-8">
                    მკითხეთ ნებისმიერი რამ პორტალის ფუნქციონალზე, შვებულების წესებზე ან ფილიალების შესახებ.
                  </p>
                </div>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-5 py-3 rounded-[5px] text-[11px] font-bold shadow-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-5 py-3 rounded-[5px] border border-slate-100 flex gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-slate-100 bg-white">
            <div className="flex gap-3">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="ჩაწერეთ შეტყობინება..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-[5px] px-5 py-3 text-[11px] font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner"
              />
              <button 
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="w-12 h-12 bg-slate-900 text-white rounded-[5px] flex items-center justify-center hover:bg-indigo-600 transition-all disabled:opacity-50 active:scale-95 shadow-lg"
              >
                <Icons.Check />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;
