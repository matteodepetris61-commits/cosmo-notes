import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileDown, 
  Sparkles, 
  Layers, 
  RefreshCw, 
  Mic, 
  FileText, 
  ArrowRight,
  Maximize2,
  Minimize2,
  Type
} from 'lucide-react';

export default function TopicSummaryView({ topic, notes, onClose, onSelectNote }) {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExpandedModal, setIsExpandedModal] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState(1);

  const topicNotes = notes.filter(n => (n.topic || 'Generale').toLowerCase() === (topic.name || '').toLowerCase());

  const fetchTopicSummary = async () => {
    if (!topic || !topic.name) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/topics/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicName: topic.name })
      });
      const data = await res.json();
      setSummary(data.summary || 'Nessuna sintesi disponibile.');
    } catch (e) {
      console.error('Error fetching topic summary:', e);
      setSummary('Impossibile generare la sintesi al momento. Verifica la connessione o la chiave API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopicSummary();
  }, [topic?.name]);

  const handleDownloadDocx = () => {
    setIsDownloading(true);
    window.location.href = `/api/topics/${encodeURIComponent(topic.name)}/docx`;
    setTimeout(() => setIsDownloading(false), 2000);
  };

  const toggleFontSize = () => {
    setFontSizeLevel((prev) => (prev + 1) % 3);
  };

  const getFontSizeClass = () => {
    if (fontSizeLevel === 0) return 'text-xs leading-normal';
    if (fontSizeLevel === 1) return 'text-sm leading-relaxed';
    return 'text-base leading-loose';
  };

  if (!topic) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className={`relative w-full ${isExpandedModal ? 'max-w-5xl h-[94vh]' : 'max-w-3xl max-h-[90vh]'} glass-panel rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-scaleUp`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800/80 bg-space-800/60">
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-lg shrink-0"
              style={{ backgroundColor: `${topic.color || '#38bdf8'}25`, color: topic.color || '#38bdf8' }}
            >
              🌌
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Stella Cardine d'Argomento</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 font-semibold">
                  {topicNotes.length} note collegate
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 mt-0.5">
                {topic.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFontSize}
              title="Cambia dimensione testo"
              className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-space-800 rounded-xl transition flex items-center gap-1 text-xs"
            >
              <Type className="w-4 h-4" />
              <span className="text-[10px] font-bold">{fontSizeLevel === 0 ? 'S' : fontSizeLevel === 1 ? 'M' : 'L'}</span>
            </button>

            <button
              onClick={() => setIsExpandedModal(!isExpandedModal)}
              title={isExpandedModal ? "Riduci Finestra" : "Espandi a Schermo Intero"}
              className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-space-800 rounded-xl transition hidden sm:flex"
            >
              {isExpandedModal ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* AI Macro Synthesis */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-space-800/70 to-cyan-950/40 border border-indigo-700/40 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                Sintesi Globale & Connessioni AI
              </div>
              <button
                onClick={fetchTopicSummary}
                disabled={isLoading}
                title="Rigenera Sintesi"
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Aggiorna</span>
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
                <Sparkles className="w-6 h-6 text-cyan-400 animate-bounce" />
                <span>Analisi delle note e sintesi in corso...</span>
              </div>
            ) : (
              <div className={`${getFontSizeClass()} text-slate-100 font-normal whitespace-pre-wrap select-text`}>
                {summary}
              </div>
            )}
          </div>

          {/* List of Notes in this Topic */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              Note che compongono questa costellazione ({topicNotes.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topicNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className="p-4 rounded-2xl bg-space-800/60 hover:bg-space-700/70 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition flex flex-col justify-between group shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        {note.type === 'audio' ? <Mic className="w-3 h-3 text-indigo-400" /> : <FileText className="w-3 h-3 text-cyan-400" />}
                        {new Date(note.createdAt).toLocaleDateString('it-IT')}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-200 group-hover:text-cyan-300 transition line-clamp-1">
                      {note.title || 'Nota'}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {note.summary || note.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-800/80 bg-space-800/70">
          <span className="text-xs text-slate-400">
            Dossier pronto per l'esportazione
          </span>

          <button
            onClick={handleDownloadDocx}
            disabled={isDownloading || topicNotes.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.35)] transition"
          >
            <FileDown className="w-4 h-4" />
            <span>{isDownloading ? 'Generazione Dossier...' : `Scarica Dossier Word d'Argomento (.docx)`}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
