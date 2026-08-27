import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Folder, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Save, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function SettingsModal({ onClose, onSettingsUpdated }) {
  const [apiKey, setApiKey] = useState('');
  const [workspacePath, setWorkspacePath] = useState('');
  const [autoExportDocx, setAutoExportDocx] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setApiKey(data.apiKey || '');
        setWorkspacePath(data.workspacePath || '');
        setAutoExportDocx(data.autoExportDocx !== false);
      })
      .catch(e => console.error('Error loading settings:', e));
  }, []);

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Inserisci prima una chiave API.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: 'Chiave API Gemini valida e connessa con successo!' });
      } else {
        setTestResult({ success: false, message: data.message || 'Chiave API non valida o errore di connessione.' });
      }
    } catch (e) {
      setTestResult({ success: false, message: 'Errore durante la verifica della chiave.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          customWorkspacePath: workspacePath.trim(),
          autoExportDocx
        })
      });
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Impostazioni salvate con successo!' });
        if (onSettingsUpdated) onSettingsUpdated();
        setTimeout(() => onClose(), 1200);
      } else {
        setStatusMsg({ type: 'error', text: 'Errore nel salvataggio delle impostazioni.' });
      }
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Errore di connessione con il backend.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl glass-panel rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-space-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Impostazioni & Intelligenza Artificiale</h2>
              <p className="text-xs text-slate-400">Configura la chiave Gemini e il workspace locale</p>
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
        <form onSubmit={handleSave} className="p-6 space-y-5">
          
          {statusMsg && (
            <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-emerald-950/50 border border-emerald-800/60 text-emerald-300' : 'bg-rose-950/50 border border-rose-800/60 text-rose-300'}`}>
              {statusMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Gemini API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Chiave API Google Gemini (AI Studio)
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                Ottieni chiave gratuita <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Incolla qui la chiave (es. AIzaSy...)"
                className="flex-1 px-4 py-2.5 rounded-xl bg-space-800 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-mono"
              />
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTesting || !apiKey}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-slate-700 transition"
              >
                {isTesting ? 'Verifica...' : 'Testa'}
              </button>
            </div>

            {testResult && (
              <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 ${testResult.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50' : 'bg-rose-950/40 text-rose-300 border border-rose-800/50'}`}>
                {testResult.success ? <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Local Workspace Path */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
              Percorso Cartella Workspace sul tuo PC
            </label>
            <input
              type="text"
              value={workspacePath}
              onChange={(e) => setWorkspacePath(e.target.value)}
              placeholder="Percorso cartella locale (es. /Users/nome/CosmoNotes)"
              className="w-full px-4 py-2.5 rounded-xl bg-space-800 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              In questa cartella vengono salvati i file JSON del database, gli audio registrati e i documenti Word (.docx).
            </p>
          </div>

          {/* Auto export Docx Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-space-800/60 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-200">Generazione Automatica File Word (.docx)</div>
              <div className="text-[11px] text-slate-400">Salva un file Word nella cartella ad ogni nuova nota registrata</div>
            </div>
            <input
              type="checkbox"
              checked={autoExportDocx}
              onChange={(e) => setAutoExportDocx(e.target.checked)}
              className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.35)] transition"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvataggio...' : 'Salva Impostazioni'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
