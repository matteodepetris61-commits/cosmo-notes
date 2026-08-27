import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { DocxGeneratorService } from './services/docxGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspacePath = path.resolve(__dirname, '../workspace');

async function seed() {
  await fs.ensureDir(workspacePath);
  await fs.ensureDir(path.join(workspacePath, 'docx'));
  await fs.ensureDir(path.join(workspacePath, 'audio'));

  const sampleNotes = [
    {
      id: 'note-1',
      type: 'text',
      title: 'Architettura Knowledge Base a Costellazione',
      summary: 'Definizione della mappa a costellazione 2D e del sistema di nodi stellari collegati tramite relazioni semantiche.',
      content: 'Abbiamo stabilito che la visualizzazione 2D minimale e fluida è ideale sia su smartphone che su desktop. I nodi argomento fungono da centri di gravità, mentre le note orbitano e si collegano con linee luminose.',
      topic: 'Architettura & Design',
      topicColor: '#38bdf8',
      subtopics: ['costellazione', 'grafi', 'ux', 'mobile'],
      keyPoints: [
        'Canvas 2D interattivo ad alte prestazioni con D3 force',
        'Visualizzazione stellare con zoom e pan fluido',
        'Supporto nativo per PWA su mobile e PC'
      ],
      actionItems: [
        'Testare la fluidità del rendering su display touch',
        'Configurare il tema scuro profondo cosmico'
      ],
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
    },
    {
      id: 'note-2',
      type: 'audio',
      title: 'Integrazione Trascrizione Vocale & Gemini AI',
      summary: 'Note vocali registrate con microfono elaborate direttamente da Gemini per trascrizione italiana, estrazione tag e sintesi esecutiva.',
      rawTranscription: 'Oggi ho registrato questo appunto a voce: il motore AI deve essere capace di ascoltare la nota, trascriverla con punteggiatura perfetta in italiano e assegnare subito l\'argomento giusto e i punti chiave.',
      content: 'Oggi ho registrato questo appunto a voce: il motore AI deve essere capace di ascoltare la nota, trascriverla con punteggiatura perfetta in italiano e assegnare subito l\'argomento giusto e i punti chiave.',
      topic: 'Intelligenza Artificiale',
      topicColor: '#c084fc',
      subtopics: ['voce', 'trascrizione', 'gemini', 'sintesi'],
      keyPoints: [
        'Trascrizione multimodale automatica in italiano',
        'Estrazione entità e categorizzazione automatica',
        'Riconoscimento delle azioni e task da fare'
      ],
      actionItems: [
        'Abilitare il supporto per file audio .webm e .mp3'
      ],
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 18).toISOString()
    },
    {
      id: 'note-3',
      type: 'text',
      title: 'Esportazione Documenti Word & Dossier',
      summary: 'Generazione automatica di file Word .docx formattati con intestazioni, sintesi esecutive e lista note per argomento.',
      content: 'Tutte le note registrate vengono salvate istantaneamente in file Word (.docx) all\'interno della cartella workspace del PC, consentendo di archiviare e condividere dossier completi.',
      topic: 'Architettura & Design',
      topicColor: '#38bdf8',
      subtopics: ['word', 'docx', 'export', 'workspace'],
      keyPoints: [
        'Creazione automatica di file .docx per singola nota',
        'Dossier aggregato per intero argomento',
        'Archiviazione trasparente nel filesystem locale'
      ],
      actionItems: [
        'Verificare la compatibilità dei file .docx generati con Microsoft Word e LibreOffice'
      ],
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 6).toISOString()
    },
    {
      id: 'note-4',
      type: 'text',
      title: 'Sintesi d\'Argomento & Macro Connessioni',
      summary: 'L\'AI analizza tutte le note collegate a una stella cardine e redige un report unificato d\'insieme.',
      content: 'Quando l\'utente seleziona una stella d\'argomento, l\'applicazione interroga il modello linguistico aggregando tutte le note figlie per mostrare un quadro d\'insieme aggiornato.',
      topic: 'Intelligenza Artificiale',
      topicColor: '#c084fc',
      subtopics: ['sintesi', 'macro-sintesi', 'grafi', 'gemini'],
      keyPoints: [
        'Quadro d\'insieme sintetico per cluster tematico',
        'Mappatura dei ponti concettuali tra argomenti diversi'
      ],
      actionItems: [],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ];

  // Generate Docx files
  for (const n of sampleNotes) {
    const docxPath = path.join(workspacePath, 'docx', `${n.id}_${n.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.docx`);
    await DocxGeneratorService.generateNoteDocx(n, docxPath);
  }

  // Refresh topic map
  const topicMap = new Map();
  sampleNotes.forEach(note => {
    const topicName = note.topic;
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
    if (note.subtopics) {
      note.subtopics.forEach(st => t.subtopics.add(st));
    }
  });

  const topics = Array.from(topicMap.values()).map(t => ({
    ...t,
    subtopics: Array.from(t.subtopics)
  }));

  const initialData = {
    settings: {
      workspaceName: 'Il mio Workspace CosmoNotes',
      apiKey: '',
      customWorkspacePath: workspacePath,
      autoExportDocx: true,
      theme: 'dark'
    },
    notes: sampleNotes,
    topics: topics,
    lastUpdated: new Date().toISOString()
  };

  await fs.writeJson(path.join(workspacePath, 'knowledge_base.json'), initialData, { spaces: 2 });
  console.log('✅ Seed completato con successo!');
}

seed().catch(console.error);
