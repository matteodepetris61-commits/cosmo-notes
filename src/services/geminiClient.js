import { GoogleGenerativeAI } from '@google/generative-ai';

// Chiave pre-configurata automatica (nessun inserimento manuale richiesto)
const DEFAULT_ENCODED = 'QVEuQWI4Uk42SzZQdGxLWDBvanlRdWR4MG5iSG9MNmhVYVZzOFFLdXdWdkNDX1VManhZMXc=';

export const getGeminiClient = (customKey) => {
  const savedKey = localStorage.getItem('cosmonotes_apikey');
  const defaultKey = typeof atob !== 'undefined' ? atob(DEFAULT_ENCODED) : '';
  const key = customKey || savedKey || import.meta.env.VITE_GEMINI_API_KEY || defaultKey;
  return new GoogleGenerativeAI(key);
};

export const processTextNoteClient = async (content, existingTopics = [], apiKey) => {
  const genAI = getGeminiClient(apiKey);
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  
  const prompt = `
Sei il motore di intelligenza artificiale per CosmoNotes.
Analizza il seguente appunto fornito dall'utente.
Elenco dei temi/argomenti già esistenti nella mappa: ${existingTopics.join(', ') || 'Nessuno'}.

Appunto da analizzare:
"""
${content}
"""

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido (senza markdown o backtick):
{
  "title": "Titolo breve (max 5-6 parole)",
  "topic": "Nome dell'argomento principale",
  "topicColor": "#38bdf8",
  "subtopics": ["sottotema1", "sottotema2"],
  "summary": "Riassunto chiaro e completo di tutte le informazioni chiave dell'appunto",
  "keyPoints": ["Punto chiave 1", "Punto chiave 2"],
  "actionItems": ["Azione da fare 1"]
}
`;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn(`Model ${modelName} fallback:`, e.message);
    }
  }
  
  return {
    title: content.slice(0, 30) + '...',
    topic: existingTopics[0] || 'Generale',
    topicColor: '#38bdf8',
    subtopics: [],
    summary: content,
    keyPoints: [],
    actionItems: []
  };
};

export const processAudioNoteClient = async (audioBlob, existingTopics = [], apiKey) => {
  const genAI = getGeminiClient(apiKey);
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  // Convert Blob to Base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  
  const mimeType = audioBlob.type || 'audio/webm';

  const prompt = `
Trascrivi accuratamente questa registrazione vocale in italiano ed estrai un'analisi strutturata.
Argomenti esistenti: ${existingTopics.join(', ') || 'Nessuno'}.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido:
{
  "transcription": "Trascrizione testuale completa e fedele",
  "title": "Titolo breve (max 5-6 parole)",
  "topic": "Argomento principale",
  "topicColor": "#38bdf8",
  "subtopics": ["sottotema1", "sottotema2"],
  "summary": "Sintesi chiara ed esaustiva dell'audio",
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
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn(`Audio model ${modelName} fallback:`, e.message);
    }
  }

  throw new Error('Impossibile elaborare l\'audio con Gemini.');
};
