import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

import { storageService } from '../backend/services/storage.js';
import { geminiService } from '../backend/services/gemini.js';
import { DocxGeneratorService } from '../backend/services/docxGenerator.js';
import { authService } from '../backend/services/auth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
  
  req.userId = 'default';
  req.userEmail = 'ospite@cosmonotes.local';
  next();
};

app.use(authMiddleware);

// Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e password obbligatorie' });
    const result = await authService.register(email, password, name);
    await storageService.initUserWorkspace(result.user.id);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.get('/api/notes', async (req, res) => {
  try {
    const notes = await storageService.getAllNotes(req.userId);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notes/text', async (req, res) => {
  try {
    const { content, manualTopic } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Contenuto vuoto' });

    const settings = await storageService.getSettings(req.userId);
    const existingNotes = await storageService.getAllNotes(req.userId);
    const existingTopics = [...new Set(existingNotes.map(n => n.topic).filter(Boolean))];

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

    await storageService.saveNote(note, req.userId);
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/graph', async (req, res) => {
  try {
    const data = await storageService.readData(req.userId);
    const notes = data.notes || [];
    const topics = data.topics || [];
    const nodes = [];
    const links = [];

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

    notes.forEach(note => {
      nodes.push({
        id: note.id,
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

      links.push({
        source: `topic-${note.topic || 'Generale'}`,
        target: note.id,
        strength: 0.9,
        type: 'topic-link'
      });
    });

    res.json({ nodes, links, topics, notesCount: notes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/topics/summary', async (req, res) => {
  try {
    const { topicName } = req.body;
    const notes = await storageService.getAllNotes(req.userId);
    const topicNotes = notes.filter(n => (n.topic || 'Generale').toLowerCase() === (topicName || '').toLowerCase());
    const settings = await storageService.getSettings(req.userId);
    const summary = await geminiService.generateTopicSummary(topicName, topicNotes, settings.apiKey);
    res.json({ topicName, noteCount: topicNotes.length, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
