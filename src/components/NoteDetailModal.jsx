import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileDown, 
  Mic, 
  FileText, 
  Calendar, 
  Tag, 
  Sparkles, 
  CheckSquare, 
  Copy, 
  Check, 
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Plus,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Type,
  BookOpen
} from 'lucide-react';
import { storageClient } from '../services/storageClient';
import { processTextNoteClient } from '../services/geminiClient';

export default function NoteDetailModal({ note, onClose, onDelete, onUpdate, existingTopics = [] }) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  
  // UI Expansion / Reading Mode states
  const [isExpandedModal, setIsExpandedModal] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [fontSizeLevel, setFontSizeLevel] = useState(1); // 0 = standard, 1 = medium, 2 = large

  // Form State for editing
  const fullData = note?.fullData || note || {};
  const [title, setTitle] = useState(fullData.title || '');
  const [topic, setTopic] = useState(fullData.topic || 'Generale');
  const [summary, setSummary] = useState(fullData.summary || '');
  const [content, setContent] = useState(fullData.content || fullData.rawTranscription || '');
  const [subtopics, setSubtopics] = useState(fullData.subtopics || []);
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    if (note) {
      const data = note.fullData || note;
      setTitle(data.title || '');
      setTopic(data.topic || 'Generale');
      setSummary(data.summary || '');
      setContent(data.content || data.rawTranscription || '');
      setSubtopics(data.subtopics || []);
      setIsEditing(false);
    }
  }, [note]);

  if (!note) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadDocx = async () => {
    setIsDownloading(true);
    try {
      await storageClient.downloadDocx(fullData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAddTag = () => {
    const cleanTag = newTagInput.trim().replace(/^#/, '');
    if (cleanTag && !subtopics.includes(cleanTag)) {
      setSubtopics([...subtopics, cleanTag]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setSubtopics(subtopics.filter(t => t !== tagToRemove));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      const updated = {
        ...fullData,
        title,
        topic,
        summary,
        content,
        subtopics
      };
      storageClient.saveNote(updated);
      onUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      const existing = existingTopics.map(t => t.name || t);
      const re = await processTextNoteClient(content, existing);
      setTitle(re.title || title);
      setTopic(re.topic || topic);
      setSummary(re.summary || summary);
      if (re.subtopics && re.subtopics.length > 0) {
        setSubtopics(re.subtopics);
      }
    } catch (e) {
      alert('Errore durante la ri-analisi AI: ' + e.message);
    } finally {
      setIsReanalyzing(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className={`relative w-full ${isExpandedModal ? 'max-w-5xl h-[94vh]' : 'max-w-2xl max-h-[90vh]'} glass-panel rounded-3xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-scaleUp`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800/80 bg-space-800/60">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-2.5 rounded-2xl shrink-0 ${fullData.type === 'audio' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
              {fullData.type === 'audio' ? <Mic className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                {!isEditing ? (
                  <span 
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-700 shadow-sm"
                    style={{ backgroundColor: `${fullData.topicColor || '#38bdf8'}20`, color: fullData.topicColor || '#38bdf8' }}
                  >
                    {topic}
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Argomento"
                      className="px-2 py-0.5 rounded-lg bg-space-900 border border-cyan-500/60 text-xs text-cyan-300 focus:outline-none"
                    />
                  </div>
                )}
                
                <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                  <Calendar className="w-3 h-3" />
                  {new Date(fullData.createdAt || Date.now()).toLocaleDateString('it-IT')}
                </span>
              </div>

              {!isEditing ? (
                <h2 className="text-base sm:text-lg font-bold text-slate-100 mt-1 line-clamp-1">
                  {title}
                </h2>
              ) : (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titolo della nota"
                  className="w-full mt-1 px-3 py-1 rounded-xl bg-space-900 border border-slate-700 text-sm font-bold text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Font Size Toggle Button */}
            <button
              onClick={toggleFontSize}
              title="Cambia dimensione testo (Standard / Medio / Grande)"
              className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-space-800 rounded-xl transition flex items-center gap-1 text-xs"
            >
              <Type className="w-4 h-4" />
              <span className="text-[10px] font-bold">{fontSizeLevel === 0 ? 'S' : fontSizeLevel === 1 ? 'M' : 'L'}</span>
            </button>

            {/* Expand / Maximize Modal Button */}
            <button
              onClick={() => setIsExpandedModal(!isExpandedModal)}
              title={isExpandedModal ? "Riduci Finestra" : "Espandi a Schermo Intero"}
              className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-space-800 rounded-xl transition hidden sm:flex"
            >
              {isExpandedModal ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                title="Modifica questa nota"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-space-800 hover:bg-space-700 text-cyan-300 text-xs font-semibold border border-slate-700/80 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modifica</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                title="Annulla modifiche"
                className="p-2 text-slate-400 hover:text-slate-200 bg-space-800 rounded-xl transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          
          {/* Audio Player if present */}
          {fullData.type === 'audio' && fullData.audioFilename && (
            <div className="p-4 rounded-2xl bg-space-800/80 border border-slate-700/60 flex flex-col gap-2">
              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" /> Registrazione Audio Originale
              </span>
              <audio 
                controls 
                src={`/api/audio-file?file=${encodeURIComponent(fullData.audioFilename)}`} 
                className="w-full h-10 rounded-xl mt-1" 
              />
            </div>
          )}

          {/* AI Executive Summary Card (Expandable & Readable) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-space-800/70 to-indigo-950/40 border border-cyan-800/50 shadow-inner">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Sintesi Esecutiva (AI)</span>
              </div>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <button
                    type="button"
                    onClick={handleReanalyze}
                    disabled={isReanalyzing}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-semibold border border-cyan-500/40 transition"
                  >
                    <Sparkles className={`w-3 h-3 ${isReanalyzing ? 'animate-spin' : ''}`} />
                    <span>{isReanalyzing ? 'Rielaborazione...' : 'Rigenera con AI'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                    title={isSummaryExpanded ? "Comprimi sintesi" : "Espandi sintesi"}
                    className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-200 px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 transition"
                  >
                    {isSummaryExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Vista Compatta</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Espandi Sintesi Completa</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {!isEditing ? (
              <div 
                className={`${getFontSizeClass()} text-slate-100 font-normal select-text whitespace-pre-wrap ${!isSummaryExpanded ? 'line-clamp-3' : ''} transition-all`}
              >
                {summary || 'Nessuna sintesi disponibile.'}
              </div>
            ) : (
              <textarea
                rows={5}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Modifica o scrivi la sintesi..."
                className="w-full p-3 rounded-xl bg-space-900 border border-slate-700 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-y leading-relaxed"
              />
            )}
          </div>

          {/* Full Content / Transcription */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                {fullData.type === 'audio' ? 'Trascrizione Vocale / Testo Integrale' : 'Contenuto Completo'}
              </h3>
              {!isEditing && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-space-800 hover:bg-space-700 px-2.5 py-1 rounded-lg transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiato!' : 'Copia'}
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className={`p-4 rounded-2xl bg-space-800/60 border border-slate-800/90 text-slate-200 font-normal whitespace-pre-wrap select-text ${getFontSizeClass()}`}>
                {content || 'Nessun testo presente.'}
              </div>
            ) : (
              <textarea
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Modifica il testo o trascrizione..."
                className="w-full p-4 rounded-2xl bg-space-900 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed resize-y"
              />
            )}
          </div>

          {/* Tags & Connected Entities */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              🔗 Nodi & Tag di Collegamento
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              {subtopics.map((t, idx) => (
                <span 
                  key={idx} 
                  className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300 font-medium"
                >
                  <Tag className="w-3 h-3" />
                  #{t}
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveTag(t)}
                      className="ml-1 text-rose-400 hover:text-rose-200"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}

              {isEditing && (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Nuovo tag..."
                    className="px-2.5 py-1 rounded-xl bg-space-900 border border-slate-700 text-xs text-purple-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="p-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-800/80 bg-space-800/70">
          <button
            onClick={() => onDelete(fullData.id)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-semibold transition"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Elimina Nota</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)] transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Salvataggio...' : 'Salva Modifiche & Word'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleDownloadDocx}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.35)] transition"
              >
                <FileDown className="w-4 h-4" />
                <span>{isDownloading ? 'Generazione...' : 'Scarica Word (.docx)'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
