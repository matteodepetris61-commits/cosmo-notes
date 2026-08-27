import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_ENCODED = 'QVEuQWI4Uk42SzZQdGxLWDBvanlRdWR4MG5iSG9MNmhVYVZzOFFLdXdWdkNDX1VManhZMXc=';

export const getGeminiClient = (customKey) => {
  const savedKey = localStorage.getItem('cosmonotes_apikey');
  const defaultKey = typeof atob !== 'undefined' ? atob(DEFAULT_ENCODED) : '';
  const key = customKey || savedKey || import.meta.env.VITE_GEMINI_API_KEY || defaultKey;
  return new GoogleGenerativeAI(key);
};

export const processTextNoteClient = async (content, existingTopics = [], apiKey) => {
  const genAI = getGeminiClient(apiKey);
  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
  
  const prompt = `
Sei il motore di intelligenza artificiale per CosmoNotes.
Analizza accuratamente il seguente appunto fornito dall'utente.
Elenco dei temi/argomenti già presenti nella mappa: ${existingTopics.join(', ') || 'Nessuno'}.

Appunto dell'utente:
"""
${content}
"""

Compiti obbligatori:
1. Crea un titolo accattivante e conciso (max 5-6 parole).
2. Assegna l'appunto all'argomento tematico più pertinente (se coerente con uno già esistente riutilizzalo, altrimenti creane uno nuovo).
3. Elabora una vera e propria "Sintesi Esecutiva Intelligente": non fare una semplice copia del testo, ma rielabora, estrai i concetti cardine, organizza il ragionamento in modo chiaro e approfondito.
4. Estrai 2-4 punti chiave (keyPoints).
5. Estrai 2-4 tag tematici (subtopics).

Rispondi ESCLUSIVAMENTE con un JSON valido (senza markdown o delimitatori):
{
  "title": "Titolo dell'appunto",
  "topic": "Nome Argomento",
  "topicColor": "#38bdf8",
  "subtopics": ["tag1", "tag2"],
  "summary": "Sintesi esecutiva approfondita ed elaborata dall'AI",
  "keyPoints": ["Punto chiave 1", "Punto chiave 2"],
  "actionItems": []
}
`;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && parsed.title && parsed.summary) {
        return parsed;
      }
    } catch (e) {
      console.warn(`Model ${modelName} fallback attempt:`, e.message);
    }
  }
  
  return {
    title: content.slice(0, 35) + '...',
    topic: existingTopics[0] || 'Generale',
    topicColor: '#38bdf8',
    subtopics: ['appunto'],
    summary: `Sintesi: ${content}`,
    keyPoints: [],
    actionItems: []
  };
};

export const processAudioNoteClient = async (audioBlob, existingTopics = [], apiKey) => {
  const genAI = getGeminiClient(apiKey);
  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];

  // Convert Blob to Base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  
  const mimeType = audioBlob.type || 'audio/webm';

  const prompt = `
Sei il motore di intelligenza artificiale per CosmoNotes.
Trascrivi accuratamente questa registrazione vocale in italiano ed esegui un'analisi strutturata.
Argomenti esistenti: ${existingTopics.join(', ') || 'Nessuno'}.

Compiti:
1. Trascrivi fedelmente tutto il testo pronunciato nell'audio.
2. Crea un titolo sintetico (max 5-6 parole).
3. Assegna l'argomento tematico principale.
4. Genera una sintesi esecutiva dettagliata e intelligente che riassuma le decisioni, i concetti e le intenzioni espresse a voce.
5. Estrai i punti chiave.

Rispondi ESCLUSIVAMENTE con un JSON valido:
{
  "transcription": "Trascrizione fedele dell'audio",
  "title": "Titolo sintetico",
  "topic": "Argomento Principale",
  "topicColor": "#38bdf8",
  "subtopics": ["tag1", "tag2"],
  "summary": "Sintesi esecutiva accurata generata da Gemini",
  "keyPoints": ["Punto 1", "Punto 2"],
  "actionItems": []
}
`;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: mimeType.split(';')[0],
            data: base64Audio
          }
        }
      ]);
      const text = result.response.text();
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && parsed.title) {
        return parsed;
      }
    } catch (e) {
      console.warn(`Audio model ${modelName} fallback attempt:`, e.message);
    }
  }

  throw new Error('Impossibile elaborare l\'audio con Gemini.');
};
