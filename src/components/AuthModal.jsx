import React, { useState } from 'react';
import { X, Mail, Sparkles, LogIn, Cloud, ShieldCheck } from 'lucide-react';
import { storageClient } from '../services/storageClient';

export default function AuthModal({ onClose, onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      storageClient.setActiveUser(cleanEmail);
      await storageClient.syncFromCloud(cleanEmail);
      onAuthSuccess(cleanEmail);
      onClose();
    } catch (err) {
      console.error(err);
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
                Sincronizza Cloud Personale
              </h2>
              <p className="text-xs text-slate-400">Accedi alle tue note da Cellulare (5G) & PC</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/50 text-cyan-200 text-xs flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>Inserisci la tua email per sincronizzare all'istante le note tra tutti i tuoi dispositivi.</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              La tua Email / Account
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="es. matteo.depetris61@gmail.com"
              className="w-full px-4 py-3 rounded-xl bg-space-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-[0_0_20px_rgba(56,189,248,0.4)] transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Sincronizzazione in corso...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Attiva Sincronizzazione Cloud</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-slate-500 pt-2 border-t border-slate-800 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Spazio Cloud 100% isolato e privato.
          </p>

        </form>

      </div>
    </div>
  );
}
