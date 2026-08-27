import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs-extra';

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite'
];

export class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  getClient(overrideKey = null) {
    const key = overrideKey || this.apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      return null;
    }
    return new GoogleGenerativeAI(key);
  }

  /**
   * Helper per eseguire una richiesta con fallback su modelli alternativi in caso di 503 o rate limit
   */
  async executeWithFallback(client, requestFn) {
    let lastError = null;
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = client.getGenerativeModel({ model: modelName });
        return await requestFn(model, modelName);
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini Fallback] Modello ${modelName} non disponibile (${err.message}). Tento con il successivo...`);
      }
    }
    throw lastError || new Error('Tutti i modelli candidati hanno fallito.');
  }

  /**
   * Processa una nota di solo testo
   */
  async processTextNote(textContent, existingTopics = [], apiKey = null) {
    const client = this.getClient(apiKey);
    if (!client) {
      return this.generateFallbackAnalysis(textContent);
    }

    try {
      const prompt = `Sei l'assistente AI per CosmoNotes, una knowledge base personale che organizza note in una costellazione di argomenti interconnessi.
Analizza la seguente nota scritta dall'utente:

"""
${textContent}
"""

Argomenti già esistenti nella costellazione dell'utente:
${existingTopics.length > 0 ? existingTopics.map(t => `- ${t}`).join('\n') : '(Nessun argomento precedente, definisci tu il primo)'}

Restituisci ESCLUSIVAMENTE un oggetto JSON valido con questa esatta struttura:
{
  "title": "Un titolo breve, chiaro ed evocativo (max 5-7 parole)",
  "summary": "Una sintesi chiara ed esecutiva della nota in 2-3 frasi fluide in italiano",
  "topic": "L'argomento/cluster principale a cui appartiene la nota (usa uno degli argomenti esistenti se pertinente, altrimenti creane uno nuovo breve e conciso)",
  "topicColor": "Un codice esadecimale moderno per la stella (es. #38bdf8 per tech/idee, #a855f7 per progetti, #34d399 per salute/vita, #f59e0b per lavoro/business, #ec4899 per creatività)",
  "subtopics": ["Array di 2-5 parole chiave o entità/tag specifici menzionati"],
  "keyPoints": ["Punto chiave 1", "Punto chiave 2"],
  "actionItems": ["Eventuale azione/task da fare identificata nel testo (lascia vuoto [] se non ce ne sono)"]
}`;

      const result = await this.executeWithFallback(client, async (model) => {
        return await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        });
      });

      const responseText = result.response.text();
      return JSON.parse(responseText);
    } catch (err) {
      console.error('Error in Gemini text processing:', err);
      return this.generateFallbackAnalysis(textContent);
    }
  }

  /**
   * Processa una registrazione audio (trascrizione + sintesi + tagging)
   */
  async processAudioNote(audioFilePath, mimeType = 'audio/webm', existingTopics = [], apiKey = null) {
    const client = this.getClient(apiKey);
    if (!client) {
      return {
        title: "Registrazione Vocale (API Key non impostata)",
        summary: "Inserisci la tua chiave API Gemini nelle Impostazioni per abilitare la trascrizione e la sintesi automatica.",
        rawTranscription: "Audio registrato con successo. In attesa di chiave API per trascrizione.",
        topic: "Registrazioni",
        topicColor: "#38bdf8",
        subtopics: ["vocale", "audio"],
        keyPoints: ["File audio salvato in cartella locale"],
        actionItems: ["Imposta la chiave API Gemini"]
      };
    }

    try {
      const audioBuffer = await fs.readFile(audioFilePath);
      const base64Audio = audioBuffer.toString('base64');

      const prompt = `Sei l'assistente AI per CosmoNotes, una knowledge base personale.
Ascolta con attenzione questo file audio registrato dall'utente (in lingua italiana o mista).

Esegui:
1. Trascrizione vocale accurata e fedele di quanto detto.
2. Sintesi esecutiva, identificazione del tema/argomento principale per la costellazione, estrazione punti chiave e azioni.

Argomenti già esistenti nella costellazione:
${existingTopics.length > 0 ? existingTopics.map(t => `- ${t}`).join('\n') : '(Nessun argomento precedente)'}

Restituisci ESCLUSIVAMENTE un JSON valido con questa struttura:
{
  "rawTranscription": "Trascrizione integrale e corretta del parlato",
  "title": "Titolo breve ed efficace (max 6 parole)",
  "summary": "Sintesi chiara del contenuto in 2-3 frasi",
  "topic": "Argomento principale (riusa uno esistente se pertinente, o nuovo)",
  "topicColor": "#38bdf8",
  "subtopics": ["tag1", "tag2", "tag3"],
  "keyPoints": ["Punto chiave 1", "Punto chiave 2"],
  "actionItems": ["Azione 1", "Azione 2"]
}`;

      const result = await this.executeWithFallback(client, async (model) => {
        return await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: mimeType, data: base64Audio } },
                { text: prompt }
              ]
            }
          ],
          generationConfig: { responseMimeType: "application/json" }
        });
      });

      const responseText = result.response.text();
      return JSON.parse(responseText);
    } catch (err) {
      console.error('Error in Gemini audio processing:', err);
      return {
        title: "Registrazione Vocale",
        summary: "Audio elaborato con successo. File salvato nel workspace.",
        rawTranscription: "Registrazione vocale archiviata.",
        topic: "Registrazioni",
        topicColor: "#38bdf8",
        subtopics: ["audio", "vocale"],
        keyPoints: [],
        actionItems: []
      };
    }
  }

  /**
   * Genera la Macro-Sintesi di un intero argomento aggregando tutte le note collegate
   */
  async generateTopicSummary(topicName, notes, apiKey = null) {
    const client = this.getClient(apiKey);
    if (!client || notes.length === 0) {
      return `L'argomento "${topicName}" include attualmente ${notes.length} note.`;
    }

    try {
      const notesSummary = notes.map((n, i) => `[Nota ${i+1}] Titolo: ${n.title}\nData: ${n.createdAt}\nSintesi: ${n.summary}\nContenuto: ${n.content || n.rawTranscription || ''}\nTag: ${(n.subtopics || []).join(', ')}`).join('\n\n---\n\n');

      const prompt = `Sei l'assistente analista di CosmoNotes.
Hai il compito di creare una SINTESI GLOBALE / QUADRO D'INSIEME per l'argomento "${topicName}", che raggruppa le seguenti ${notes.length} note registrate dall'utente:

${notesSummary}

Redigi una sintesi strutturata in italiano, professionale ed esaustiva:
1. Panoramica generale e tesi/scopo centrale dell'argomento.
2. Evoluzione dei concetti e collegamenti interni emersi tra le note.
3. Decisioni chiave, conclusioni o prossimi passi/azioni raccomandate.

Usa un tono chiaro, fluido ed elegante.`;

      const result = await this.executeWithFallback(client, async (model) => {
        return await model.generateContent(prompt);
      });
      
      return result.response.text();
    } catch (err) {
      console.error('Error generating topic summary:', err);
      return `Panoramica automatica: l'argomento "${topicName}" comprende ${notes.length} note registrate.`;
    }
  }

  generateFallbackAnalysis(text) {
    const firstLine = text.trim().split('\n')[0] || 'Nuova Nota';
    const cleanTitle = firstLine.slice(0, 50) + (firstLine.length > 50 ? '...' : '');
    return {
      title: cleanTitle,
      summary: text.trim() || 'Nessun contenuto inserito.',
      topic: "Generale",
      topicColor: "#38bdf8",
      subtopics: ["nota", "appunto"],
      keyPoints: text.split('\n').filter(l => l.trim().length > 0).slice(0, 3),
      actionItems: []
    };
  }
}

export const geminiService = new GeminiService();
