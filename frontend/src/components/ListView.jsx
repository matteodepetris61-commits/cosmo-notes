import React from 'react';
import { Mic, FileText, Calendar, Tag, FileDown, ArrowRight, Trash2 } from 'lucide-react';

export default function ListView({ notes, topics, onSelectNote, onSelectTopic, onDeleteNote, searchQuery, activeTopic }) {
  const filteredNotes = notes.filter(note => {
    if (activeTopic && activeTopic !== 'all' && (note.topic || 'Generale') !== activeTopic) {
      return false;
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (note.title || '').toLowerCase().includes(q) ||
        (note.summary || '').toLowerCase().includes(q) ||
        (note.content || '').toLowerCase().includes(q) ||
        (note.subtopics || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 overflow-y-auto h-full space-y-6">
      {/* Topics Summary Cards */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          🌌 Costellazioni & Argomenti Attivi ({topics.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {topics.map(t => (
            <div
              key={t.id || t.name}
              onClick={() => onSelectTopic(t)}
              className="p-3.5 rounded-2xl glass-panel border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <span 
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: t.color || '#38bdf8' }}
                />
                <span className="text-[11px] font-semibold text-slate-400">
                  {t.noteCount} {t.noteCount === 1 ? 'nota' : 'note'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-200 group-hover:text-cyan-300 transition line-clamp-1">
                {t.name}
              </h3>
            </div>
          ))}
        </div>
      </div>

      {/* Notes List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            📑 Registro Note ({filteredNotes.length})
          </h2>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            Nessuna nota trovata. Registra una nota vocale o scrivine una nuova!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="p-5 rounded-3xl glass-panel border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition flex flex-col justify-between group relative shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span 
                      className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-slate-700/50"
                      style={{ backgroundColor: `${note.topicColor || '#38bdf8'}20`, color: note.topicColor || '#38bdf8' }}
                    >
                      {note.topic || 'Generale'}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      {note.type === 'audio' ? <Mic className="w-3 h-3 text-indigo-400" /> : <FileText className="w-3 h-3 text-cyan-400" />}
                      {new Date(note.createdAt).toLocaleDateString('it-IT')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition line-clamp-1">
                    {note.title || 'Nota Senza Titolo'}
                  </h3>

                  <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                    {note.summary || note.content}
                  </p>

                  {note.subtopics && note.subtopics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {note.subtopics.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/40 text-purple-300 border border-purple-800/30">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-800/60">
                  <span className="text-xs text-cyan-400 flex items-center gap-1 group-hover:underline">
                    Dettagli & Word <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    title="Elimina Nota"
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
