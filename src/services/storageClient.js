import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';

const STORAGE_KEY = 'cosmonotes_data_v1';
const USER_KEY = 'cosmonotes_active_user';
const DEFAULT_ENCODED = 'QVEuQWI4Uk42SzZQdGxLWDBvanlRdWR4MG5iSG9MNmhVYVZzOFFLdXdWdkNDX1VManhZMXc=';

// Connessione Diretta Cloud Database Neon (HTTP REST API)
const DB_CONN = 'postgresql://neondb_owner:npg_WNRz2nw4GPCY@ep-quiet-king-a6datcmc-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require';
const ENDPOINT = 'https://ep-quiet-king-a6datcmc-pooler.us-west-2.aws.neon.tech/sql';

async function runNeonQuery(query, params = []) {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': DB_CONN
      },
      body: JSON.stringify({ query, params })
    });
    if (!res.ok) {
      console.warn('Neon HTTP query status:', res.status);
      return [];
    }
    const data = await res.json();
    return data.rows || [];
  } catch (err) {
    console.warn('Neon query network error:', err.message);
    return [];
  }
}

export const storageClient = {
  getActiveUser: () => {
    return localStorage.getItem(USER_KEY) || null;
  },

  setActiveUser: (email) => {
    if (email) {
      localStorage.setItem(USER_KEY, email.trim().toLowerCase());
    } else {
      localStorage.removeItem(USER_KEY);
    }
  },

  getData: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading storage:', e);
    }
    return {
      notes: [],
      topics: [],
      settings: {
        apiKey: typeof atob !== 'undefined' ? atob(DEFAULT_ENCODED) : ''
      }
    };
  },

  saveData: (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving storage:', e);
    }
  },

  getAllNotes: () => {
    return storageClient.getData().notes || [];
  },

  // Sincronizza note dal Cloud per l'utente attivo
  syncFromCloud: async (userEmail = null) => {
    const user = userEmail || storageClient.getActiveUser();
    if (!user) return storageClient.getAllNotes();

    try {
      const userId = user.trim().toLowerCase();
      const rows = await runNeonQuery(
        'SELECT data FROM notes WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );

      if (rows && rows.length > 0) {
        const cloudNotes = rows.map(r => r.data).filter(Boolean);
        const data = storageClient.getData();
        data.notes = cloudNotes;

        // Ricalcola argomenti tematici
        const topicMap = {};
        data.notes.forEach(n => {
          const t = n.topic || 'Generale';
          if (!topicMap[t]) {
            topicMap[t] = { name: t, color: n.topicColor || '#38bdf8', noteCount: 0, subtopics: new Set() };
          }
          topicMap[t].noteCount++;
          (n.subtopics || []).forEach(st => topicMap[t].subtopics.add(st));
        });

        data.topics = Object.values(topicMap).map(t => ({
          name: t.name,
          color: t.color,
          noteCount: t.noteCount,
          subtopics: Array.from(t.subtopics)
        }));

        storageClient.saveData(data);
        return cloudNotes;
      }
    } catch (e) {
      console.warn('Cloud sync error:', e.message);
    }
    return storageClient.getAllNotes();
  },

  saveNote: async (note, userEmail = null) => {
    const user = userEmail || storageClient.getActiveUser();
    const data = storageClient.getData();
    const index = data.notes.findIndex(n => n.id === note.id);
    const updatedNote = {
      ...note,
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      data.notes[index] = { ...data.notes[index], ...updatedNote };
    } else {
      data.notes.unshift(updatedNote);
    }

    // Aggiorna topics
    const topicMap = {};
    data.notes.forEach(n => {
      const t = n.topic || 'Generale';
      if (!topicMap[t]) {
        topicMap[t] = { name: t, color: n.topicColor || '#38bdf8', noteCount: 0, subtopics: new Set() };
      }
      topicMap[t].noteCount++;
      (n.subtopics || []).forEach(st => topicMap[t].subtopics.add(st));
    });

    data.topics = Object.values(topicMap).map(t => ({
      name: t.name,
      color: t.color,
      noteCount: t.noteCount,
      subtopics: Array.from(t.subtopics)
    }));

    storageClient.saveData(data);

    // Salva nel Cloud Database Neon istantaneamente
    if (user) {
      const userId = user.trim().toLowerCase();
      await runNeonQuery(
        `INSERT INTO notes (id, user_id, data, updated_at) 
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (id) DO UPDATE SET data = $3, updated_at = NOW()`,
        [note.id, userId, JSON.stringify(updatedNote)]
      );
    }

    return updatedNote;
  },

  deleteNote: async (noteId, userEmail = null) => {
    const user = userEmail || storageClient.getActiveUser();
    const data = storageClient.getData();
    data.notes = data.notes.filter(n => n.id !== noteId);
    
    // Ricalcola topics
    const topicMap = {};
    data.notes.forEach(n => {
      const t = n.topic || 'Generale';
      if (!topicMap[t]) {
        topicMap[t] = { name: t, color: n.topicColor || '#38bdf8', noteCount: 0, subtopics: new Set() };
      }
      topicMap[t].noteCount++;
      (n.subtopics || []).forEach(st => topicMap[t].subtopics.add(st));
    });

    data.topics = Object.values(topicMap).map(t => ({
      name: t.name,
      color: t.color,
      noteCount: t.noteCount,
      subtopics: Array.from(t.subtopics)
    }));

    storageClient.saveData(data);

    if (user) {
      const userId = user.trim().toLowerCase();
      await runNeonQuery('DELETE FROM notes WHERE id = $1 AND user_id = $2', [noteId, userId]);
    }
  },

  getGraphData: () => {
    const data = storageClient.getData();
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

    return { nodes, links, topics, notesCount: notes.length };
  },

  downloadDocx: async (note) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: note.title || 'Appunto CosmoNotes',
            heading: HeadingLevel.TITLE,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Argomento: ${note.topic || 'Generale'} | Data: ${new Date(note.createdAt).toLocaleString('it-IT')}`, italics: true, color: '666666' })
            ],
            spacing: { after: 300 }
          }),
          new Paragraph({
            text: 'Sintesi Esecutiva (AI):',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            text: note.summary || 'Nessuna sintesi disponibile',
            spacing: { after: 300 }
          }),
          ...(note.keyPoints && note.keyPoints.length > 0 ? [
            new Paragraph({
              text: 'Punti Chiave:',
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 150, after: 80 }
            }),
            ...note.keyPoints.map(p => new Paragraph({ text: `• ${p}`, spacing: { after: 80 } }))
          ] : []),
          ...(note.content ? [
            new Paragraph({
              text: 'Trascrizione / Testo Completo:',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 250, after: 100 }
            }),
            new Paragraph({
              text: note.content,
              spacing: { after: 300 }
            })
          ] : [])
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(note.title || 'appunto').replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
