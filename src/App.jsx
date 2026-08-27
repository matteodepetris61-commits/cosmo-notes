import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Mic, 
  Plus, 
  Settings, 
  LayoutGrid, 
  Compass, 
  Search, 
  X, 
  User,
  LogIn,
  LogOut,
  ShieldCheck
} from 'lucide-react';

import Constellation2D from './components/Constellation2D';
import VoiceRecorder from './components/VoiceRecorder';
import NoteDetailModal from './components/NoteDetailModal';
import TopicSummaryView from './components/TopicSummaryView';
import TextNoteModal from './components/TextNoteModal';
import SettingsModal from './components/SettingsModal';
import ListView from './components/ListView';
import AuthModal from './components/AuthModal';

export default function App() {
  const [notes, setNotes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [viewMode, setViewMode] = useState('graph'); // 'graph' | 'list'
  
  // Auth state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cosmonotes_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Modals & Panels
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTopic, setActiveFilterTopic] = useState('all');

  // Loading / Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper per chiamate API autenticate
  const authFetch = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('cosmonotes_token');
    const headers = {
      ...(options.headers || {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers });
  }, []);

  // Fetch Graph and Data from Backend
  const refreshData = useCallback(async () => {
    try {
      const [graphRes, notesRes] = await Promise.all([
        authFetch('/api/graph'),
        authFetch('/api/notes')
      ]);
      const graph = await graphRes.json();
      const notesList = await notesRes.json();

      setGraphData(graph);
      setTopics(graph.topics || []);
      setNotes(Array.isArray(notesList) ? notesList : []);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    refreshData();
  }, [refreshData, currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('cosmonotes_token');
    localStorage.removeItem('cosmonotes_user');
    setCurrentUser(null);
    setShowUserMenu(false);
    showToast('🚪 Disconnesso dal tuo spazio privato');
  };

  // Handle Save Voice Note
  const handleSaveAudio = async (audioBlobOrFile) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('audio', audioBlobOrFile, 'recording.webm');

    try {
      const res = await authFetch('/api/notes/audio', {
        method: 'POST',
        body: formData
      });
      const newNote = await res.json();
      if (res.ok) {
        showToast('✨ Nota vocale salvata nel tuo spazio privato!');
        setShowVoiceModal(false);
        await refreshData();
        setSelectedNote(newNote);
      } else {
        showToast(`❌ Errore: ${newNote.error || 'Impossibile elaborare nota vocale'}`);
      }
    } catch (e) {
      showToast('❌ Errore di connessione');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Save Text Note
  const handleSaveText = async (content, manualTopic) => {
    setIsProcessing(true);
    try {
      const res = await authFetch('/api/notes/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, manualTopic })
      });
      const newNote = await res.json();
      if (res.ok) {
        showToast('✨ Nota testuale inserita nel tuo spazio!');
        setShowTextModal(false);
        await refreshData();
        setSelectedNote(newNote);
      } else {
        showToast(`❌ Errore: ${newNote.error || 'Impossibile salvare la nota'}`);
      }
    } catch (e) {
      showToast('❌ Errore di connessione');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Delete Note
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa nota?')) return;
    try {
      const res = await authFetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('🗑️ Nota eliminata con successo');
        if (selectedNote?.id === noteId) setSelectedNote(null);
        await refreshData();
      }
    } catch (e) {
      showToast('Errore durante l\'eliminazione');
    }
  };

  // Handle Node selection from Graph
  const handleSelectNode = (node) => {
    if (node.type === 'topic') {
      const foundTopic = topics.find(t => t.name === node.name) || { name: node.name, color: node.color };
      setSelectedTopic(foundTopic);
    } else if (node.type === 'note') {
      const full = notes.find(n => n.id === node.id) || node.fullData || node;
      setSelectedNote(full);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-space-900 text-slate-100 overflow-hidden relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 glass-panel border border-cyan-500/40 text-cyan-200 px-5 py-3 rounded-2xl shadow-[0_0_20px_rgba(56,189,248,0.3)] text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800/80 bg-space-900/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-30 shrink-0">
        
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-lg sm:text-xl shadow-[0_0_15px_rgba(56,189,248,0.4)] shrink-0">
            🌌
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              CosmoNotes
              <span className="text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                PRO
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 hidden md:block">Knowledge Base a Costellazione</p>
          </div>
        </div>

        {/* Search Bar & Filters */}
        <div className="flex-1 max-w-md mx-3 hidden md:flex items-center gap-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca argomenti, note o tag..."
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-space-800/90 border border-slate-700/60 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {topics.length > 0 && (
            <select
              value={activeFilterTopic}
              onChange={(e) => setActiveFilterTopic(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-space-800 border border-slate-700/60 text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Tutti i temi ({topics.length})</option>
              {topics.map(t => (
                <option key={t.id || t.name} value={t.name}>{t.name} ({t.noteCount})</option>
              ))}
            </select>
          )}
        </div>

        {/* Actions & User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          
          {/* View Toggle */}
          <div className="flex items-center bg-space-800 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setViewMode('graph')}
              title="Vista Costellazione 2D"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${viewMode === 'graph' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Mappa</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Vista Elenco"
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Elenco</span>
            </button>
          </div>

          {/* New Text Note Button */}
          <button
            onClick={() => setShowTextModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-space-800 hover:bg-space-700 border border-slate-700/70 text-slate-200 hover:text-white text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
            <span className="hidden sm:inline">Scrivi</span>
          </button>

          {/* Record Voice Button */}
          <button
            onClick={() => setShowVoiceModal(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.4)] transition"
          >
            <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Voce</span>
          </button>

          {/* User Account / Login Button */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-xs font-semibold transition"
              >
                <div className="w-5 h-5 rounded-full bg-cyan-400/20 flex items-center justify-center text-[10px] font-bold text-cyan-300">
                  {currentUser.email.slice(0, 1).toUpperCase()}
                </div>
                <span className="max-w-[90px] sm:max-w-[120px] truncate hidden sm:inline">{currentUser.email}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-11 w-56 glass-panel rounded-2xl border border-slate-700 shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-[11px] text-slate-400">Accesso effettuato con:</p>
                    <p className="text-xs font-bold text-cyan-300 truncate">{currentUser.email}</p>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                      <ShieldCheck className="w-3 h-3" /> Spazio 100% Privato
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-300 hover:bg-rose-950/40 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Esci dall'account</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-space-800 hover:bg-space-700 border border-slate-700 text-cyan-300 text-xs font-bold transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Accedi con Gmail</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Impostazioni Workspace & API"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-space-800 transition border border-transparent hover:border-slate-700/60"
          >
            <Settings className="w-4 h-4" />
          </button>

        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 relative w-full h-[calc(100vh-4rem)] overflow-hidden">
        {viewMode === 'graph' ? (
          <Constellation2D
            graphData={graphData}
            onSelectNode={handleSelectNode}
            selectedTopic={selectedTopic}
            searchQuery={searchQuery}
            activeFilterTopic={activeFilterTopic}
          />
        ) : (
          <ListView
            notes={notes}
            topics={topics}
            onSelectNote={(note) => setSelectedNote(note)}
            onSelectTopic={(topic) => setSelectedTopic(topic)}
            onDeleteNote={handleDeleteNote}
            searchQuery={searchQuery}
            activeTopic={activeFilterTopic}
          />
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            showToast(`👋 Benvenuto nel tuo spazio privato, ${user.name || user.email}!`);
          }}
        />
      )}

      {/* Voice Recorder Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowVoiceModal(false)}
              className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white bg-space-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
            <VoiceRecorder
              onSaveAudio={handleSaveAudio}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      )}

      {/* Text Note Modal */}
      {showTextModal && (
        <TextNoteModal
          onClose={() => setShowTextModal(false)}
          onSaveText={handleSaveText}
          isProcessing={isProcessing}
          existingTopics={topics}
        />
      )}

      {/* Note Detail Modal */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onDelete={handleDeleteNote}
          existingTopics={topics}
          onUpdate={async (updated) => {
            setSelectedNote(updated);
            await refreshData();
            showToast('💾 Nota aggiornata e file Word sincronizzato!');
          }}
        />
      )}

      {/* Topic Summary Modal */}
      {selectedTopic && (
        <TopicSummaryView
          topic={selectedTopic}
          notes={notes}
          onClose={() => setSelectedTopic(null)}
          onSelectNote={(note) => setSelectedNote(note)}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSettingsUpdated={refreshData}
        />
      )}

    </div>
  );
}
