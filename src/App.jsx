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
  LogIn,
  LogOut,
  ShieldCheck,
  Cloud,
  CloudCheck
} from 'lucide-react';

import Constellation2D from './components/Constellation2D';
import VoiceRecorder from './components/VoiceRecorder';
import NoteDetailModal from './components/NoteDetailModal';
import TopicSummaryView from './components/TopicSummaryView';
import TextNoteModal from './components/TextNoteModal';
import SettingsModal from './components/SettingsModal';
import ListView from './components/ListView';
import AuthModal from './components/AuthModal';

import { storageClient } from './services/storageClient';
import { processTextNoteClient, processAudioNoteClient } from './services/geminiClient';
import { auth, onAuthStateChanged, signOut } from './services/firebase';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [notes, setNotes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [viewMode, setViewMode] = useState('graph');

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

  const refreshData = useCallback(async () => {
    if (currentUser) {
      await storageClient.syncFromCloud(currentUser.uid);
    }
    const graph = storageClient.getGraphData();
    const notesList = storageClient.getAllNotes();
    setGraphData(graph);
    setTopics(graph.topics || []);
    setNotes(notesList);
  }, [currentUser]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        storageClient.syncFromCloud(user.uid).then(() => {
          const graph = storageClient.getGraphData();
          const notesList = storageClient.getAllNotes();
          setGraphData(graph);
          setTopics(graph.topics || []);
          setNotes(notesList);
        });
      } else {
        const graph = storageClient.getGraphData();
        const notesList = storageClient.getAllNotes();
        setGraphData(graph);
        setTopics(graph.topics || []);
        setNotes(notesList);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setShowUserMenu(false);
    showToast('🚪 Disconnesso dal Cloud');
    refreshData();
  };

  // Handle Save Voice Note
  const handleSaveAudio = async (audioBlob) => {
    setIsProcessing(true);
    try {
      const existingTopics = topics.map(t => t.name);
      const aiAnalysis = await processAudioNoteClient(audioBlob, existingTopics);
      
      const newNote = {
        id: `note-${Date.now()}`,
        type: 'audio',
        content: aiAnalysis.transcription || 'Registrazione vocale',
        title: aiAnalysis.title || 'Nuovo Appunto Vocale',
        summary: aiAnalysis.summary || aiAnalysis.transcription,
        topic: aiAnalysis.topic || 'Generale',
        topicColor: aiAnalysis.topicColor || '#38bdf8',
        subtopics: aiAnalysis.subtopics || [],
        keyPoints: aiAnalysis.keyPoints || [],
        actionItems: aiAnalysis.actionItems || [],
        createdAt: new Date().toISOString()
      };

      await storageClient.saveNote(newNote, currentUser?.uid);
      showToast('✨ Appunto vocale elaborato e sincronizzato!');
      setShowVoiceModal(false);
      await refreshData();
      setSelectedNote(newNote);
    } catch (e) {
      showToast(`❌ Errore AI: ${e.message || 'Errore durante l\'elaborazione'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Save Text Note
  const handleSaveText = async (content, manualTopic) => {
    setIsProcessing(true);
    try {
      const existingTopics = topics.map(t => t.name);
      const aiAnalysis = await processTextNoteClient(content, existingTopics);
      
      const newNote = {
        id: `note-${Date.now()}`,
        type: 'text',
        content: content.trim(),
        title: aiAnalysis.title || 'Nuovo Appunto',
        summary: aiAnalysis.summary || content,
        topic: manualTopic || aiAnalysis.topic || 'Generale',
        topicColor: aiAnalysis.topicColor || '#38bdf8',
        subtopics: aiAnalysis.subtopics || [],
        keyPoints: aiAnalysis.keyPoints || [],
        actionItems: aiAnalysis.actionItems || [],
        createdAt: new Date().toISOString()
      };

      await storageClient.saveNote(newNote, currentUser?.uid);
      showToast('✨ Appunto inserito e sincronizzato!');
      setShowTextModal(false);
      await refreshData();
      setSelectedNote(newNote);
    } catch (e) {
      showToast(`❌ Errore AI: ${e.message || 'Errore durante l\'elaborazione'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Delete Note
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo appunto?')) return;
    await storageClient.deleteNote(noteId, currentUser?.uid);
    showToast('🗑️ Appunto eliminato');
    if (selectedNote?.id === noteId) setSelectedNote(null);
    await refreshData();
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
            <p className="text-[10px] text-slate-400 hidden md:block">Costellazione di Appunti & Sintesi AI</p>
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

        {/* Actions & User Sync */}
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

          {/* User Account / Cloud Sync Pill */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-xs font-semibold transition"
              >
                <div className="w-5 h-5 rounded-full bg-cyan-400/20 flex items-center justify-center text-[10px] font-bold text-cyan-300">
                  {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>
                <span className="max-w-[80px] sm:max-w-[120px] truncate hidden sm:inline">{currentUser.displayName || currentUser.email}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-11 w-60 glass-panel rounded-2xl border border-slate-700 shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-[11px] text-slate-400">Account Cloud attivo:</p>
                    <p className="text-xs font-bold text-cyan-300 truncate">{currentUser.email}</p>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                      <ShieldCheck className="w-3 h-3" /> Sincronizzato con Cellulare & PC
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-space-800 hover:bg-space-700 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sincronizza Cloud</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Impostazioni & Chiave Gemini"
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
            showToast(`👋 Benvenuto, ${user.displayName || user.email}! I tuoi appunti sono sincronizzati.`);
            refreshData();
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
            await storageClient.saveNote(updated, currentUser?.uid);
            setSelectedNote(updated);
            await refreshData();
            showToast('💾 Appunto aggiornato e sincronizzato!');
          }}
          onDownloadDocx={() => storageClient.downloadDocx(selectedNote)}
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
