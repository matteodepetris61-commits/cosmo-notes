import React, { useState } from 'react';
import { X, Send, Sparkles, FileText, Tag } from 'lucide-react';

export default function TextNoteModal({ onClose, onSaveText, isProcessing, existingTopics = [] }) {
  const [content, setContent] = useState('');
  const [manualTopic, setManualTopic] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSaveText(content, manualTopic);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl glass-panel rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-space-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Nuova Nota Testuale</h2>
              <p className="text-xs text-slate-400">Scrivi o incolla i tuoi appunti, l'AI organizzerà la costellazione</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <textarea
              autoFocus
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Scrivi qui i tuoi pensieri, appunti, idee di progetto, verbali di riunione..."
              className="w-full p-4 rounded-2xl bg-space-800/90 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition leading-relaxed resize-none"
            />
          </div>

          {/* Optional Topic selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-1.5">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              Argomento (Opzionale - se vuoto lo dedurrà l'AI con Gemini):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualTopic}
                onChange={(e) => setManualTopic(e.target.value)}
                placeholder="Es. Progetto X, Marketing, Idee, Personale..."
                className="flex-1 px-4 py-2 rounded-xl bg-space-800 border border-slate-700/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
              {existingTopics.length > 0 && (
                <select
                  onChange={(e) => setManualTopic(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-space-800 border border-slate-700/80 text-xs text-slate-300 focus:outline-none cursor-pointer"
                  value=""
                >
                  <option value="" disabled>Scegli esistente...</option>
                  {existingTopics.map(t => (
                    <option key={t.id || t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Action Buttons */}
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
              disabled={isProcessing || !content.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.35)] disabled:opacity-50 transition"
            >
              {isProcessing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Elaborazione AI...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Crea Nota & Inserisci in Costellazione</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
