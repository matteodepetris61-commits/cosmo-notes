import React, { useState } from 'react';
import { X, Mail, Lock, Sparkles, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  googleProvider 
} from '../services/firebase';

export default function AuthModal({ onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      let userCredential;
      if (isRegister) {
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      if (userCredential?.user) {
        onAuthSuccess(userCredential.user);
        onClose();
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('Email o password non corretti.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Questa email è già registrata. Prova ad accedere.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('La password deve contenere almeno 6 caratteri.');
      } else {
        setErrorMsg(err.message || 'Errore durante l\'autenticazione.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        onAuthSuccess(result.user);
        onClose();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Accesso con Google non riuscito.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md glass-panel rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-space-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-lg shadow-lg">
              🌌
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isRegister ? 'Crea il tuo Spazio Cloud' : 'Accedi a CosmoNotes'}
              </h2>
              <p className="text-xs text-slate-400">Sincronizzazione in tempo reale tra Cellulare & PC</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google 1-Click Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 shadow-md transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Accedi con Google (1 Clic)</span>
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[11px] text-slate-500 font-medium">oppure con email</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.com"
                className="w-full px-4 py-2.5 rounded-xl bg-space-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caratteri"
                className="w-full px-4 py-2.5 rounded-xl bg-space-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-[0_0_20px_rgba(56,189,248,0.4)] transition"
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Accesso in corso...</span>
                </>
              ) : isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Registrati</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Accedi</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setErrorMsg(null); }}
              className="text-xs text-cyan-400 hover:underline"
            >
              {isRegister ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati subito'}
            </button>
          </div>

          <p className="text-[10px] text-center text-slate-500 pt-2 border-t border-slate-800">
            🔒 I tuoi appunti sono isolati e sincronizzati in tempo reale sul tuo Cloud privato.
          </p>

        </div>

      </div>
    </div>
  );
}
