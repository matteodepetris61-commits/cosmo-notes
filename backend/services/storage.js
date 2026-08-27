import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_WORKSPACE = path.resolve(__dirname, '../../workspace');

class StorageService {
  constructor() {
    this.rootWorkspace = ROOT_WORKSPACE;
  }

  getUserWorkspacePath(userId = 'default') {
    if (!userId || userId === 'default') {
      return this.rootWorkspace;
    }
    return path.join(this.rootWorkspace, 'users', userId);
  }

  async initUserWorkspace(userId = 'default') {
    const userPath = this.getUserWorkspacePath(userId);
    await fs.ensureDir(userPath);
    await fs.ensureDir(path.join(userPath, 'audio'));
    await fs.ensureDir(path.join(userPath, 'docx'));

    const dbFile = path.join(userPath, 'knowledge_base.json');
    if (!await fs.pathExists(dbFile)) {
      // Se esiste un default db e stiamo creando il primo utente, possiamo copiare o creare pulito
      const initialData = {
        settings: {
          workspaceName: 'Spazio Personale',
          apiKey: process.env.GEMINI_API_KEY || '',
          autoExportDocx: true,
          theme: 'dark'
        },
        notes: [],
        topics: [],
        lastUpdated: new Date().toISOString()
      };
      await fs.writeJson(dbFile, initialData, { spaces: 2 });
    }
  }

  getDbPath(userId = 'default') {
    return path.join(this.getUserWorkspacePath(userId), 'knowledge_base.json');
  }

  getAudioDir(userId = 'default') {
    return path.join(this.getUserWorkspacePath(userId), 'audio');
  }

  getDocxDir(userId = 'default') {
    return path.join(this.getUserWorkspacePath(userId), 'docx');
  }

  async readData(userId = 'default') {
    await this.initUserWorkspace(userId);
    const dbPath = this.getDbPath(userId);
    try {
      return await fs.readJson(dbPath);
    } catch (e) {
      console.error(`Error reading JSON db for user ${userId}:`, e);
      return { settings: {}, notes: [], topics: [], lastUpdated: new Date().toISOString() };
    }
  }

  async writeData(data, userId = 'default') {
    await this.initUserWorkspace(userId);
    const dbPath = this.getDbPath(userId);
    data.lastUpdated = new Date().toISOString();
    await fs.writeJson(dbPath, data, { spaces: 2 });
  }

  async getSettings(userId = 'default') {
    const data = await this.readData(userId);
    return data.settings || {};
  }

  async updateSettings(newSettings, userId = 'default') {
    const data = await this.readData(userId);
    data.settings = { ...data.settings, ...newSettings };
    await this.writeData(data, userId);
    return data.settings;
  }

  async getAllNotes(userId = 'default') {
    const data = await this.readData(userId);
    return data.notes || [];
  }

  async getNoteById(id, userId = 'default') {
    const notes = await this.getAllNotes(userId);
    return notes.find(n => n.id === id);
  }

  async saveNote(note, userId = 'default') {
    const data = await this.readData(userId);
    const existingIndex = data.notes.findIndex(n => n.id === note.id);
    
    if (existingIndex >= 0) {
      data.notes[existingIndex] = { ...data.notes[existingIndex], ...note, updatedAt: new Date().toISOString() };
    } else {
      data.notes.unshift({
        ...note,
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    this.refreshTopics(data);
    await this.writeData(data, userId);
    return note;
  }

  async deleteNote(id, userId = 'default') {
    const data = await this.readData(userId);
    const noteToDelete = data.notes.find(n => n.id === id);
    if (noteToDelete && noteToDelete.audioFilename) {
      const audioPath = path.join(this.getAudioDir(userId), noteToDelete.audioFilename);
      if (await fs.pathExists(audioPath)) {
        await fs.remove(audioPath).catch(() => {});
      }
    }
    data.notes = data.notes.filter(n => n.id !== id);
    this.refreshTopics(data);
    await this.writeData(data, userId);
    return true;
  }

  refreshTopics(data) {
    const topicMap = new Map();
    data.notes.forEach(note => {
      const topicName = note.topic || 'Generale';
      if (!topicMap.has(topicName)) {
        topicMap.set(topicName, {
          id: `topic-${topicName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: topicName,
          noteCount: 0,
          color: note.topicColor || '#38bdf8',
          subtopics: new Set(),
          lastUpdated: note.updatedAt || note.createdAt
        });
      }
      const t = topicMap.get(topicName);
      t.noteCount += 1;
      if (note.subtopics && Array.isArray(note.subtopics)) {
        note.subtopics.forEach(st => t.subtopics.add(st));
      }
      if (new Date(note.updatedAt || note.createdAt) > new Date(t.lastUpdated)) {
        t.lastUpdated = note.updatedAt || note.createdAt;
      }
    });

    data.topics = Array.from(topicMap.values()).map(t => ({
      ...t,
      subtopics: Array.from(t.subtopics)
    }));
  }
}

export const storageService = new StorageService();
