import React, { useState } from 'react';
import { Icons } from '../constants';
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

  const handleSyncProfile = async (firebaseUser: any) => {
    if (firebaseUser && firebaseUser.email) {
      const profile = await Database.syncUserWithAuth(firebaseUser.uid, firebaseUser.email);
      if (profile) {
        onLogin(profile);
        return true;
      }
    }
    setError('ავტორიზაცია წარმატებულია, თუმცა პროფილი სისტემაში არ მოიძებნა.');
    return false;
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
      const result = await AuthService.signInWithGoogle();
      
      if (result.user && result.user.email) {
        await handleSyncProfile(result.user);
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google ავტორიზაცია გაუქმდა.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('გთხოვთ დაუშვათ pop-up ფანჯრები ამ საიტისთვის.');
      } else {
        setError('Google ავტორიზაციის შეცდომა: ' + (err.message || 'უცნობი შეცდომა'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const input = identifier.trim();
    const isEmail = input.includes('@');
    
    try {
      // 1. Resolve User from Firestore
      let dbUser: User | null = null;
      if (isEmail) {
        dbUser = await Database.getUserByEmail(input);
      } else {
        dbUser = await Database.getUserByPersonalId(input);
      }

      if (!dbUser || !dbUser.email) {
        setError('მომხმარებელი ვერ მოიძებნა. გთხოვთ გადაამოწმოთ ელ-ფოსტა ან პირადი ID.');
        setIsLoading(false);
        return;
      }

      // 2. Validate Password
      if (!dbUser.password || password !== dbUser.password) {
        setError('პაროლი არასწორია.');
        setIsLoading(false);
        return;
      }

      const loginEmail = dbUser.email;

      // 3. Establish Firebase Auth session
      try {
        const authResult = await AuthService.signIn(loginEmail, password);
        await handleSyncProfile(authResult.user);
      } catch (err: any) {
        console.warn("Primary Auth sign-in failed, attempting recovery...", err.code);
        
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          try {
            const signupResult = await AuthService.signUp(loginEmail, password);
            const updatedUser = { ...dbUser, uid: signupResult.user.uid };
            await Database.setEmployees([updatedUser]);
            onLogin(updatedUser);
          } catch (signupErr: any) {
            if (signupErr.code === 'auth/email-already-in-use') {
              setError('ავტორიზაციის ხარვეზი: სისტემური პაროლი არ ემთხვევა. მიმართეთ IT მხარდაჭერას.');
            } else {
              setError('სესიის შექმნა ვერ მოხერხდა: ' + signupErr.message);
            }
            setIsLoading(false);
          }
        } else if (err.code === 'auth/wrong-password') {
          setError('ავტორიზაციის ხარვეზი: მონაცემთა ბაზის პაროლი არ ემთხვევა ავტორიზაციის სისტემას.');
          setIsLoading(false);
        } else {
          setError('ავტორიზაციის შეცდომა: ' + err.message);
          setIsLoading(false);
        }
      }
    } catch (err: any) {
      setError('დაფიქსირდა სისტემური შეცდომა: ' + err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[5px] shadow-3xl overflow-hidden border border-slate-200">
          {/* Header */}
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

          {/* Body */}
          <div className="p-10 space-y-8">
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-[5px] flex items-start gap-3 animate-in slide-in-from-top-2">
                <div className="text-rose-500 mt-0.5 flex-shrink-0"><Icons.Alert /></div>
                <p className="text-[11px] font-bold text-rose-700 leading-relaxed uppercase tracking-wide">
                  {error}
                </p>
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">ელ-ფოსტა ან პირადი ID</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Email / Personal ID"
                      disabled={isLoading}
                      className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-[5px] text-sm font-black text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-sm disabled:opacity-50"
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
                      disabled={isLoading}
                      className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-[5px] text-sm font-black text-slate-700 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-sm disabled:opacity-50"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
                      <Icons.Admin />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-slate-900 text-white rounded-[5px] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <><Icons.Check /> სისტემაში შესვლა</>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[10px] text-slate-400 font-black uppercase tracking-widest">ან</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-black py-4 rounded-[5px] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-xs uppercase tracking-widest"
            >
              <Icons.Google />
              Google-ით შესვლა
            </button>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                გამოიყენეთ პორტალზე რეგისტრირებული მონაცემები
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
