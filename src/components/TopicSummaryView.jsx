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
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { getGeminiClient } from '../services/geminiClient';

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
      const genAI = getGeminiClient();
      const notesContext = topicNotes.map((n, i) => `Nota ${i+1} (${n.title}):\n${n.summary || n.content}`).join('\n\n');
      
      const prompt = `
Sei un assistente esperto in sintesi e mappatura concettuale.
Crea una macro-sintesi esaustiva e organizzata di tutti gli appunti relativi al tema: "${topic.name}".

Appunti nel tema:
"""
${notesContext}
"""

Fornisci una sintesi fluida, chiara e dettagliata che colleghi i concetti chiave, evidenzi i temi emergenti e le conclusioni principali.
`;

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const res = await model.generateContent(prompt);
      setSummary(res.response.text() || 'Nessuna sintesi disponibile.');
    } catch (e) {
      console.warn('Fallback generating summary:', e);
      setSummary(`Tema: ${topic.name}\n\nQuesto argomento contiene ${topicNotes.length} appunti:\n` + topicNotes.map(n => `• ${n.title}: ${n.summary || n.content}`).join('\n'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopicSummary();
  }, [topic?.name]);

  const handleDownloadDocx = async () => {
    setIsDownloading(true);
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: `Dossier Tematico: ${topic.name}`,
              heading: HeadingLevel.TITLE,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Numero di appunti: ${topicNotes.length} | Generato il: ${new Date().toLocaleDateString('it-IT')}`, italics: true, color: '666666' })
              ],
              spacing: { after: 300 }
            }),
            new Paragraph({
              text: 'Macro-Sintesi dell\'Argomento:',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              text: summary || 'Nessuna sintesi disponibile.',
              spacing: { after: 300 }
            }),
            new Paragraph({
              text: 'Appunti Inclusi nel Tema:',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 }
            }),
            ...topicNotes.flatMap(note => [
              new Paragraph({
                text: `• ${note.title || 'Appunto'}`,
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 150, after: 50 }
              }),
              new Paragraph({
                text: note.summary || note.content || '',
                spacing: { after: 150 }
              })
            ])
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Dossier_${topic.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading docx:', e);
    } finally {
      setIsDownloading(false);
    }
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
                <h2 className="text-base sm:text-lg font-bold text-slate-100">{topic.name}</h2>
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                  style={{ 
                    backgroundColor: `${topic.color || '#38bdf8'}15`, 
                    color: topic.color || '#38bdf8', 
                    borderColor: `${topic.color || '#38bdf8'}40` 
                  }}
                >
                  {topicNotes.length} {topicNotes.length === 1 ? 'appunto' : 'appunti'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Hub tematico della costellazione</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleFontSize}
              title="Regola dimensione testo (Piccolo / Medio / Grande)"
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition flex items-center gap-1 text-xs font-semibold"
            >
              <Type className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px]">{fontSizeLevel === 0 ? 'S' : fontSizeLevel === 1 ? 'M' : 'L'}</span>
            </button>

            <button
              onClick={() => setIsExpandedModal(!isExpandedModal)}
              title={isExpandedModal ? 'Riduci finestra' : 'Schermo intero'}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition"
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          
          {/* AI Synthesis Section */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-space-800/80 to-space-800/40 border border-slate-700/80 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Macro-Sintesi dell'Argomento</span>
              </div>

              <button
                onClick={fetchTopicSummary}
                disabled={isLoading}
                className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-space-800 rounded-lg transition"
                title="Rigenera sintesi"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            <div className={`text-slate-200 whitespace-pre-line ${getFontSizeClass()}`}>
              {isLoading ? (
                <div className="flex items-center gap-3 py-6 justify-center text-xs text-cyan-300">
                  <Sparkles className="w-5 h-5 animate-spin text-cyan-400" />
                  <span>Gemini sta aggregando e sintetizzando tutti gli appunti del tema...</span>
                </div>
              ) : (
                summary || 'Nessuna sintesi disponibile.'
              )}
            </div>
          </div>

          {/* Connected Notes List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Appunti collegati a questo tema ({topicNotes.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topicNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note);
                    onClose();
                  }}
                  className="p-3.5 rounded-2xl bg-space-800/60 hover:bg-space-800 border border-slate-700/60 hover:border-cyan-500/50 cursor-pointer transition flex flex-col justify-between group shadow-sm hover:shadow-cyan-500/10"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                        {note.type === 'audio' ? <Mic className="w-3.5 h-3.5 text-amber-400" /> : <FileText className="w-3.5 h-3.5 text-cyan-400" />}
                        <span>{new Date(note.createdAt).toLocaleDateString('it-IT')}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition line-clamp-1">
                      {note.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {note.summary || note.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-800/80 bg-space-800/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Scarica un unico documento Word contenente tutti gli appunti e la sintesi
          </span>

          <button
            onClick={handleDownloadDocx}
            disabled={isDownloading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.4)] transition ml-auto"
          >
            <FileDown className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? 'Generazione Word in corso...' : 'Scarica Dossier Word (.docx)'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
