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
      console.log('[Login] Syncing profile for user:', firebaseUser.email);
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
    const isEmail = input.includes('@');
    
    try {
      if (!isEmail) {
        const userByPid = await Database.getUserByPersonalId(input);
        if (userByPid && userByPid.email) {
          loginEmail = userByPid.email;
        } else {
          setError('მომხმარებელი პირადი ნომრით ვერ მოიძებნა.');
          setIsLoading(false);
          return;
        }
      }

      try {
        const authResult = await AuthService.signIn(loginEmail, password);
        await handleSyncProfile(authResult.user);
        return;
      } catch (err: any) {
        if (err.code === 'auth/invalid-credential' || 
            err.code === 'auth/user-not-found' || 
            err.code === 'auth/wrong-password' ||
            err.code === 'auth/invalid-login-credentials') {
          
          const mock = MOCK_EMPLOYEES.find(emp => emp.email?.toLowerCase() === loginEmail.toLowerCase());
          
          if (mock && password === mock.password) {
            try {
              const signupResult = await AuthService.signUp(loginEmail, password);
              await handleSyncProfile(signupResult.user);
              return;
            } catch (signupErr: any) {
              if (signupErr.code === 'auth/weak-password') {
                setError('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.');
              } else if (signupErr.code === 'auth/email-already-in-use') {
                setError('არასწორი პაროლი.');
              } else {
                setError('რეგისტრაცია ვერ მოხერხდა: ' + signupErr.message);
              }
              setIsLoading(false);
              return;
            }
          }
        }
        throw err;
      }
    } catch (err: any) {
      let msg = 'დაფიქსირდა შეცდომა ავტორიზაციისას.';
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          msg = 'არასწორი მონაცემები.';
          break;
        case 'auth/too-many-requests':
          msg = 'ძალიან ბევრი მცდელობა. სცადეთ მოგვიანებით.';
          break;
        default:
          msg = `შეცდომა: ${err.message || 'უცნობი შეცდომა'}`;
      }
      setError(msg);
      setIsLoading(false);
    }
  };

  const isAnyLoading = isLoading || isSocialLoading;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100">
          <div className="pt-12 pb-8 px-10 text-center">
            {logoUrl ? (
              <img src={logoUrl} className="h-14 object-contain mx-auto mb-6" alt="Logo" />
            ) : (
              <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-6 shadow-xl ring-4 ring-slate-50">
                {(appTitle || 'Z').charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-1">ავტორიზაცია</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{appTitle || 'ZENITH PORTAL'}</p>
          </div>

          <div className="px-10 pb-12 space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-rose-500 mt-0.5 flex-shrink-0 scale-90"><Icons.Alert /></div>
                <p className="text-[11px] font-bold text-rose-700 leading-relaxed uppercase tracking-wide">
                  {error}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="group">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">მომხმარებელი</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="user email"
                      className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-slate-900 focus:bg-white transition-all ring-0 focus:ring-4 focus:ring-slate-900/5"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors pointer-events-none scale-90">
                      <Icons.User />
                    </div>
                  </div>
                </div>

                <div className="group">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">პაროლი</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-slate-900 focus:bg-white transition-all ring-0 focus:ring-4 focus:ring-slate-900/5"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors pointer-events-none scale-90">
                      <Icons.Admin />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isAnyLoading}
                className="w-full py-4.5 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 h-14"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span>შესვლა</span>
                )}
              </button>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[8px] font-black uppercase">
                <span className="bg-white px-4 text-slate-300 tracking-[0.4em]">ან</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isAnyLoading}
              className="w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:border-slate-400 hover:bg-slate-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 h-14"
            >
              {isSocialLoading ? (
                <div className="w-5 h-5 border-2 border-slate-900/10 border-t-slate-900 rounded-full animate-spin"></div>
              ) : (
                <><Icons.Google /> Google</>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center space-y-1">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            დაგავიწყდათ პაროლი? მიმართეთ ადმინისტრაციას
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;