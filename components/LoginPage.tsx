
import React, { useState } from 'react';
import { Icons, MOCK_EMPLOYEES } from '../constants';
import { Database } from '../services/database';
import { AuthService } from '../services/authService';
import { User } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
  logoUrl?: string;
  appTitle?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, logoUrl, appTitle }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  const handleSyncProfile = async (firebaseUser: any) => {
    if (firebaseUser && firebaseUser.email) {
      const profile = await Database.syncUserWithAuth(firebaseUser.uid, firebaseUser.email);
      
      if (profile) {
        onLogin(profile);
        return true;
      } else {
        setError('ავტორიზაცია წარმატებულია, თუმცა თქვენი პროფილი სისტემაში არ მოიძებნა.');
        return false;
      }
    }
    return false;
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsSocialLoading(true);
    try {
      const result = await AuthService.signInWithGoogle();
      const success = await handleSyncProfile(result.user);
      if (!success) setIsSocialLoading(false);
    } catch (err: any) {
      setError(err.message || 'შეცდომა Google-ით ავტორიზაციისას.');
      setIsSocialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const input = identifier.trim();
    let loginEmail = input;

    // Check if input is likely a personal ID (digits only or specific length) vs email
    const isEmail = input.includes('@');
    
    try {
      if (!isEmail) {
        // Attempt to find user by Personal ID to get their associated email
        const userByPid = await Database.getUserByPersonalId(input);
        if (userByPid && userByPid.email) {
          loginEmail = userByPid.email;
        } else {
          // If not found and not an email, we can't proceed to Firebase Auth
          setError('მომხმარებელი პირადი ნომრით ვერ მოიძებნა.');
          setIsLoading(false);
          return;
        }
      }

      // 1. Try to sign in with email (mapped or original)
      try {
        const authResult = await AuthService.signIn(loginEmail, password);
        await handleSyncProfile(authResult.user);
      } catch (err: any) {
        // 2. If user doesn't exist or credentials invalid, check if it's a mock user for auto-provisioning
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          const mock = MOCK_EMPLOYEES.find(emp => emp.email?.toLowerCase() === loginEmail.toLowerCase());
          
          if (mock && password === mock.password) {
            try {
              // Auto-signup the mock user in Firebase Auth
              const signupResult = await AuthService.signUp(loginEmail, password);
              await handleSyncProfile(signupResult.user);
              return;
            } catch (signupErr: any) {
              if (signupErr.code === 'auth/weak-password') {
                setError('Firebase-ის მოთხოვნით პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო. შეცვალეთ constants.tsx-ში.');
              } else if (signupErr.code === 'auth/email-already-in-use') {
                setError('არასწორი პაროლი.');
              } else {
                setError('ავტომატური რეგისტრაცია ვერ მოხერხდა: ' + signupErr.message);
              }
              setIsLoading(false);
              return;
            }
          }
        }
        throw err; // Re-throw to be caught by the outer catch
      }
    } catch (err: any) {
      // Standard error mapping
      let msg = 'დაფიქსირდა შეცდომა ავტორიზაციისას.';
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          msg = 'არასწორი მონაცემები.';
          break;
        case 'auth/invalid-email':
          msg = 'ელფოსტის ფორმატი არასწორია.';
          break;
        case 'auth/operation-not-allowed':
          msg = 'Email/Password ავტორიზაცია გამორთულია Firebase კონსოლში.';
          break;
        default:
          msg = err.message;
      }
      
      setError(msg);
      setIsLoading(false);
    }
  };

  const isAnyLoading = isLoading || isSocialLoading;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[5px] shadow-3xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            <div className="relative z-10 space-y-6">
              {logoUrl ? (
                <img src={logoUrl} className="h-16 object-contain mx-auto" alt="Logo" />
              ) : (
                <div className="w-16 h-16 bg-indigo-600 rounded-[5px] flex items-center justify-center text-white text-2xl font-black mx-auto shadow-lg">
                  {(appTitle || 'Z').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-white uppercase tracking-tight">ავტორიზაცია</h1>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{appTitle || 'ZENITH PORTAL'}</p>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-8">
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-[5px] flex flex-col gap-2 animate-in slide-in-from-top-2">
                <div className="flex gap-3">
                  <div className="text-rose-500 mt-0.5 flex-shrink-0"><Icons.Alert /></div>
                  <p className="text-[11px] font-bold text-rose-700 leading-relaxed uppercase tracking-wide">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">ელფოსტა ან პირადი ნომერი</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="admin@portal.ge ან 0101..."
                      className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-[5px] text-sm font-black text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-sm"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
                      <Icons.User />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">პაროლი</label>
                  <div className="relative group">
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-[5px] text-sm font-black text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-sm"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
                      <Icons.Admin />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isAnyLoading}
                className="w-full py-5 bg-slate-900 text-white rounded-[5px] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <><Icons.Check /> შესვლა</>
                )}
              </button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[9px] font-black uppercase">
                <span className="bg-white px-4 text-slate-400 tracking-[0.3em]">ან</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isAnyLoading}
              className="w-full py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-[5px] font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-4 disabled:opacity-50"
            >
              {isSocialLoading ? (
                <span className="w-5 h-5 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></span>
              ) : (
                <><Icons.Google /> Google-ით შესვლა</>
              )}
            </button>
          </div>

          <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                დაგავიწყდათ პაროლი? მიმართეთ ადმინისტრაციას
             </p>
          </div>
        </div>
        
        <p className="text-center mt-8 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
          Powered by BH Systems • 2024
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
