import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

import { storageService } from './services/storage.js';
import { geminiService } from './services/gemini.js';
import { DocxGeneratorService } from './services/docxGenerator.js';
import { authService } from './services/auth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware per estrarre utente autenticato dal token
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : (req.query.token || null);

  if (token) {
    const verified = authService.verifyToken(token);
    if (verified) {
      req.userId = verified.id;
      req.userEmail = verified.email;
      return next();
    }
  }
  
  // Se non c'è token, assegniamo 'default' o richiediamo login
  req.userId = 'default';
  req.userEmail = 'ospite@cosmonotes.local';
  next();
};

app.use(authMiddleware);

// Multer storage per registrazioni audio (per utente)
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const audioDir = storageService.getAudioDir(req.userId);
    fs.ensureDirSync(audioDir);
    cb(null, audioDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    const filename = `voice_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;
    cb(null, filename);
  }
});
const upload = multer({ storage: audioStorage });

// Servizio file audio statici protetti per utente
app.use('/api/audio-file', (req, res) => {
  const filePath = path.join(storageService.getAudioDir(req.userId), req.query.file || '');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  // Fallback cartella root se nota legacy
  const fallbackPath = path.join(storageService.getAudioDir('default'), req.query.file || '');
  if (fs.existsSync(fallbackPath)) {
    return res.sendFile(fallbackPath);
  }
  res.status(404).json({ error: 'File audio non trovato' });
});

// ==================== ENDPOINT AUTENTICAZIONE ====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatorie.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La password deve avere almeno 6 caratteri.' });
    }

    const result = await authService.register(email, password, name);
    // Inizializza workspace privato per il nuovo utente
    await storageService.initUserWorkspace(result.user.id);

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatorie.' });
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  if (req.userId && req.userId !== 'default') {
    res.json({ id: req.userId, email: req.userEmail });
  } else {
    res.json(null);
  }
});

// ==================== ENDPOINTS NOTE (ISOLATE PER UTENTE) ====================

// Lista tutte le note dell'utente
app.get('/api/notes', async (req, res) => {
  try {
    const notes = await storageService.getAllNotes(req.userId);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crea nota testuale
app.post('/api/notes/text', async (req, res) => {
  try {
    const { content, manualTopic } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Il contenuto della nota non può essere vuoto.' });
    }

    const settings = await storageService.getSettings(req.userId);
    const existingNotes = await storageService.getAllNotes(req.userId);
    const existingTopics = [...new Set(existingNotes.map(n => n.topic).filter(Boolean))];

    // Analisi AI con Gemini
    const aiAnalysis = await geminiService.processTextNote(content, existingTopics, settings.apiKey);

    const noteId = `note-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const note = {
      id: noteId,
      userId: req.userId,
      type: 'text',
      content: content.trim(),
      title: aiAnalysis.title || 'Nuova Nota',
      summary: aiAnalysis.summary || content.slice(0, 100),
      topic: manualTopic || aiAnalysis.topic || 'Generale',
      topicColor: aiAnalysis.topicColor || '#38bdf8',
      subtopics: aiAnalysis.subtopics || [],
      keyPoints: aiAnalysis.keyPoints || [],
      actionItems: aiAnalysis.actionItems || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (settings.autoExportDocx !== false) {
      const docxFilename = `${note.id}_${note.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.docx`;
      const docxPath = path.join(storageService.getDocxDir(req.userId), docxFilename);
      await DocxGeneratorService.generateNoteDocx(note, docxPath);
      note.docxFilename = docxFilename;
    }

    await storageService.saveNote(note, req.userId);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating text note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crea nota vocale
app.post('/api/notes/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file audio inviato.' });
    }

    const settings = await storageService.getSettings(req.userId);
    const existingNotes = await storageService.getAllNotes(req.userId);
    const existingTopics = [...new Set(existingNotes.map(n => n.topic).filter(Boolean))];

    const audioPath = req.file.path;
    const mimeType = req.file.mimetype || 'audio/webm';

    // Trascrizione e analisi AI con Gemini
    const aiAnalysis = await geminiService.processAudioNote(audioPath, mimeType, existingTopics, settings.apiKey);

    const noteId = `note-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const note = {
      id: noteId,
      userId: req.userId,
      type: 'audio',
      audioFilename: req.file.filename,
      audioMimeType: mimeType,
      rawTranscription: aiAnalysis.rawTranscription || '',
      content: aiAnalysis.rawTranscription || '',
      title: aiAnalysis.title || 'Registrazione Vocale',
      summary: aiAnalysis.summary || 'Nessuna sintesi disponibile.',
      topic: aiAnalysis.topic || 'Generale',
      topicColor: aiAnalysis.topicColor || '#38bdf8',
      subtopics: aiAnalysis.subtopics || [],
      keyPoints: aiAnalysis.keyPoints || [],
      actionItems: aiAnalysis.actionItems || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (settings.autoExportDocx !== false) {
      const docxFilename = `${note.id}_${note.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.docx`;
      const docxPath = path.join(storageService.getDocxDir(req.userId), docxFilename);
      await DocxGeneratorService.generateNoteDocx(note, docxPath);
      note.docxFilename = docxFilename;
    }

    await storageService.saveNote(note, req.userId);
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating audio note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Aggiorna / Modifica nota
app.put('/api/notes/:id', async (req, res) => {
  try {
    const existingNote = await storageService.getNoteById(req.params.id, req.userId);
    if (!existingNote) {
      return res.status(404).json({ error: 'Nota non trovata' });
    }

    const {
      title,
      topic,
      topicColor,
      summary,
      content,
      subtopics,
      keyPoints,
      actionItems
    } = req.body;

    const updatedNote = {
      ...existingNote,
      title: title !== undefined ? title : existingNote.title,
      topic: topic !== undefined ? topic : existingNote.topic,
      topicColor: topicColor !== undefined ? topicColor : existingNote.topicColor,
      summary: summary !== undefined ? summary : existingNote.summary,
      content: content !== undefined ? content : existingNote.content,
      subtopics: Array.isArray(subtopics) ? subtopics : existingNote.subtopics,
      keyPoints: Array.isArray(keyPoints) ? keyPoints : existingNote.keyPoints,
      actionItems: Array.isArray(actionItems) ? actionItems : existingNote.actionItems,
      updatedAt: new Date().toISOString()
    };

    const settings = await storageService.getSettings(req.userId);
    if (settings.autoExportDocx !== false) {
      const docxFilename = `${updatedNote.id}_${(updatedNote.title || 'nota').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.docx`;
      const docxPath = path.join(storageService.getDocxDir(req.userId), docxFilename);
      await DocxGeneratorService.generateNoteDocx(updatedNote, docxPath);
      updatedNote.docxFilename = docxFilename;
    }

    await storageService.saveNote(updatedNote, req.userId);
    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ri-analizza una nota con AI dopo modifiche
app.post('/api/notes/:id/reanalyze', async (req, res) => {
  try {
    const existingNote = await storageService.getNoteById(req.params.id, req.userId);
    if (!existingNote) {
      return res.status(404).json({ error: 'Nota non trovata' });
    }

    const settings = await storageService.getSettings(req.userId);
    const existingNotes = await storageService.getAllNotes(req.userId);
    const existingTopics = [...new Set(existingNotes.map(n => n.topic).filter(Boolean))];

    const contentToAnalyze = req.body.content || existingNote.content || existingNote.rawTranscription || '';
    const aiAnalysis = await geminiService.processTextNote(contentToAnalyze, existingTopics, settings.apiKey);

    const updatedNote = {
      ...existingNote,
      content: contentToAnalyze,
      title: aiAnalysis.title || existingNote.title,
      summary: aiAnalysis.summary || existingNote.summary,
      topic: aiAnalysis.topic || existingNote.topic,
      topicColor: aiAnalysis.topicColor || existingNote.topicColor,
      subtopics: aiAnalysis.subtopics || existingNote.subtopics,
      keyPoints: aiAnalysis.keyPoints || existingNote.keyPoints,
      actionItems: aiAnalysis.actionItems || existingNote.actionItems,
      updatedAt: new Date().toISOString()
    };

    if (settings.autoExportDocx !== false) {
      const docxFilename = `${updatedNote.id}_${(updatedNote.title || 'nota').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.docx`;
      const docxPath = path.join(storageService.getDocxDir(req.userId), docxFilename);
      await DocxGeneratorService.generateNoteDocx(updatedNote, docxPath);
      updatedNote.docxFilename = docxFilename;
    }

    await storageService.saveNote(updatedNote, req.userId);
    res.json(updatedNote);
  } catch (error) {
    console.error('Error reanalyzing note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Elimina nota
app.delete('/api/notes/:id', async (req, res) => {
  try {
    await storageService.deleteNote(req.params.id, req.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENDPOINT COSTELLAZIONE / GRAFO ====================

app.get('/api/graph', async (req, res) => {
  try {
    const data = await storageService.readData(req.userId);
    const notes = data.notes || [];
    const topics = data.topics || [];

    const nodes = [];
    const links = [];

    // 1. Nodi Argomento
    topics.forEach(topic => {
      nodes.push({
        id: `topic-${topic.name}`,
        name: topic.name,
        type: 'topic',
        color: topic.color || '#38bdf8',
        size: Math.max(22, 16 + (topic.noteCount || 1) * 3),
        noteCount: topic.noteCount || 0,
        subtopics: topic.subtopics || []
      });
    });

    // 2. Nodi Nota
    notes.forEach(note => {
      const noteNodeId = note.id;
      nodes.push({
        id: noteNodeId,
        name: note.title,
        type: 'note',
        noteType: note.type,
        summary: note.summary,
        topic: note.topic || 'Generale',
        color: note.topicColor || '#38bdf8',
        size: 12,
        createdAt: note.createdAt,
        subtopics: note.subtopics || [],
        fullData: note
      });

      const topicNodeId = `topic-${note.topic || 'Generale'}`;
      links.push({
        source: topicNodeId,
        target: noteNodeId,
        strength: 0.9,
        type: 'topic-link'
      });
    });

    // 3. Link Semantici Inter-Note
    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const nA = notes[i];
        const nB = notes[j];
        const tagsA = new Set(nA.subtopics || []);
        const tagsB = new Set(nB.subtopics || []);
        
        const commonTags = [...tagsA].filter(t => tagsB.has(t));
        if (commonTags.length > 0) {
          links.push({
            source: nA.id,
            target: nB.id,
            strength: 0.4 + (commonTags.length * 0.15),
            type: 'semantic-link',
            label: commonTags.join(', ')
          });
        }
      }
    }

    res.json({ nodes, links, topics, notesCount: notes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENDPOINT SINTESI ARGOMENTO ====================

app.post('/api/topics/summary', async (req, res) => {
  try {
    const { topicName } = req.body;
    if (!topicName) return res.status(400).json({ error: 'topicName richiesto' });

    const notes = await storageService.getAllNotes(req.userId);
    const topicNotes = notes.filter(n => (n.topic || 'Generale').toLowerCase() === topicName.toLowerCase());
    const settings = await storageService.getSettings(req.userId);

    const summary = await geminiService.generateTopicSummary(topicName, topicNotes, settings.apiKey);
    res.json({ topicName, noteCount: topicNotes.length, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DOWNLOAD FILE WORD (.DOCX) ====================

app.get('/api/notes/:id/docx', async (req, res) => {
  try {
    const note = await storageService.getNoteById(req.params.id, req.userId);
    if (!note) return res.status(404).json({ error: 'Nota non trovata' });

    const fileName = `${note.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.docx`;
    const tempPath = path.join(storageService.getDocxDir(req.userId), `export_${note.id}.docx`);
    
    await DocxGeneratorService.generateNoteDocx(note, tempPath);
    res.download(tempPath, fileName);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/topics/:topicName/docx', async (req, res) => {
  try {
    const { topicName } = req.params;
    const notes = await storageService.getAllNotes(req.userId);
    const topicNotes = notes.filter(n => (n.topic || 'Generale').toLowerCase() === topicName.toLowerCase());
    const settings = await storageService.getSettings(req.userId);

    const summary = await geminiService.generateTopicSummary(topicName, topicNotes, settings.apiKey);
    const fileName = `Costellazione_${topicName.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
    const tempPath = path.join(storageService.getDocxDir(req.userId), `topic_${Date.now()}.docx`);

    await DocxGeneratorService.generateTopicDocx(topicName, summary, topicNotes, tempPath);
    res.download(tempPath, fileName);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== IMPOSTAZIONI E TEST ====================

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await storageService.getSettings(req.userId);
    res.json({
      ...settings,
      hasApiKey: Boolean(settings.apiKey || process.env.GEMINI_API_KEY),
      workspacePath: storageService.getUserWorkspacePath(req.userId)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updated = await storageService.updateSettings(req.body, req.userId);
    if (req.body.apiKey) {
      geminiService.setApiKey(req.body.apiKey);
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const client = geminiService.getClient(apiKey);
    if (!client) {
      return res.status(400).json({ success: false, message: 'Nessuna chiave fornita.' });
    }
    const model = client.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const testRes = await model.generateContent('Rispondi con una sola parola: OK');
    res.json({ success: true, response: testRes.response.text().trim() });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== STATIC FRONTEND SERVING ====================
const frontendDist = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CosmoNotes Multi-User Server attivo su http://0.0.0.0:${PORT}`);
});
