import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Save, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export default function SettingsModal({ onClose, onSettingsUpdated }) {
  const [apiKey, setApiKey] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('cosmonotes_apikey') || DEFAULT_KEY;
    setApiKey(saved);
  }, []);

  const handleTestKey = async () => {
    const keyToTest = apiKey.trim() || DEFAULT_KEY;
    setIsTesting(true);
    setTestResult(null);
    try {
      const genAI = new GoogleGenerativeAI(keyToTest);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const res = await model.generateContent('Rispondi semplicemente OK');
      if (res && res.response.text()) {
        setTestResult({ success: true, message: '✨ Chiave API Gemini perfettamente valida e funzionante!' });
      }
    } catch (e) {
      setTestResult({ success: false, message: 'Errore verifica: ' + (e.message || 'Chiave non valida') });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('cosmonotes_apikey', apiKey.trim());
    setStatusMsg({ type: 'success', text: 'Impostazioni salvate con successo sul tuo dispositivo!' });
    if (onSettingsUpdated) onSettingsUpdated();
    setTimeout(() => onClose(), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-space-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Impostazioni & Gemini AI</h2>
              <p className="text-xs text-slate-400">Configurazione della chiave e preferenze</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-140px)] custom-scrollbar">
          
          {/* Status Message */}
          {statusMsg && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold ${
              statusMsg.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
            }`}>
              {statusMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Gemini API Key Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Chiave API Google Gemini
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition"
              >
                Ottieni chiave gratuita <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AQ.Ab8RN..."
                className="w-full px-4 py-3 rounded-2xl bg-space-800 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTesting}
                className="px-3.5 py-1.5 rounded-xl bg-space-800 hover:bg-space-700 border border-slate-700 text-xs text-slate-200 font-semibold transition flex items-center gap-1.5"
              >
                {isTesting ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    <span>Verifica in corso...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Verifica Chiave</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-slate-400">
                Usa i modelli Gemini 2.5 Flash
              </span>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testResult.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
              }`}>
                {testResult.success ? <Check className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-space-800/40 border border-slate-800 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              🔒 Privacy sul dispositivo
            </p>
            <p className="text-[11px]">
              Tutti i tuoi appunti e le costellazioni sono salvati localmente nella memoria del tuo browser: nessun altro utente o collega può accedere ai tuoi dati.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-space-800 transition"
            >
              Chiudi
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.4)] transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Salva Impostazioni</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
