import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';

const STORAGE_KEY = 'cosmonotes_data_v1';
const DEFAULT_ENCODED = 'QVEuQWI4Uk42SzZQdGxLWDBvanlRdWR4MG5iSG9MNmhVYVZzOFFLdXdWdkNDX1VManhZMXc=';

export const storageClient = {
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

  saveNote: (note) => {
    const data = storageClient.getData();
    const index = data.notes.findIndex(n => n.id === note.id);
    if (index >= 0) {
      data.notes[index] = { ...data.notes[index], ...note, updatedAt: new Date().toISOString() };
    } else {
      data.notes.unshift({ ...note, createdAt: note.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
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
    return note;
  },

  deleteNote: (noteId) => {
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
            text: 'Sintesi & Concetti Chiave:',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            text: note.summary || 'Nessuna sintesi disponibile',
            spacing: { after: 300 }
          }),
          ...(note.content ? [
            new Paragraph({
              text: 'Trascrizione / Testo Completo:',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 }
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
