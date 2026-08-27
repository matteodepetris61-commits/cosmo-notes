import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType
} from 'docx';
import fs from 'fs-extra';
import path from 'path';

export class DocxGeneratorService {
  /**
   * Genera documento Word per una singola nota
   */
  static async generateNoteDocx(note, outputPath) {
    const doc = new Document({
      title: note.title || 'Nota CosmoNotes',
      description: 'Documento generato automaticamente da CosmoNotes',
      styles: {
        default: {
          document: {
            run: {
              font: 'Calibri',
              size: 24, // 12pt
              color: '2D3748'
            }
          }
        }
      },
      sections: [{
        properties: {},
        children: [
          // Titolo Principale
          new Paragraph({
            text: note.title || 'Senza Titolo',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
            alignment: AlignmentType.LEFT
          }),

          // Metadata badge / tabella info
          new Paragraph({
            children: [
              new TextRun({ text: '📁 Argomento: ', bold: true, color: '4A5568' }),
              new TextRun({ text: `${note.topic || 'Generale'}   |   `, color: '0284C7', bold: true }),
              new TextRun({ text: '🕒 Data: ', bold: true, color: '4A5568' }),
              new TextRun({ text: new Date(note.createdAt || Date.now()).toLocaleString('it-IT'), italics: true })
            ],
            spacing: { after: 300 }
          }),

          // Box Sintesi AI
          new Paragraph({
            text: '✨ Sintesi Esecutiva (AI)',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: note.summary || 'Nessuna sintesi disponibile.',
                size: 22,
                color: '1A202C'
              })
            ],
            spacing: { after: 250 }
          }),

          // Punti Chiave / Takeaways
          ...(note.keyPoints && note.keyPoints.length > 0 ? [
            new Paragraph({
              text: '📌 Punti Chiave & Concetti:',
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 150, after: 100 }
            }),
            ...note.keyPoints.map(point => new Paragraph({
              text: `• ${point}`,
              spacing: { after: 80 }
            }))
          ] : []),

          // Azioni da intraprendere (se presenti)
          ...(note.actionItems && note.actionItems.length > 0 ? [
            new Paragraph({
              text: '✅ Azioni / To-Do:',
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 }
            }),
            ...note.actionItems.map(item => new Paragraph({
              text: `[ ] ${item}`,
              spacing: { after: 80 }
            }))
          ] : []),

          // Tag e Connessioni
          ...(note.subtopics && note.subtopics.length > 0 ? [
            new Paragraph({
              text: '🔗 Collegamenti e Tag di Costellazione:',
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: note.subtopics.map(t => `#${t}`).join('  '),
                  color: '6366F1',
                  bold: true
                })
              ],
              spacing: { after: 300 }
            })
          ] : []),

          // Testo Completo / Trascrizione
          new Paragraph({
            text: '📝 Testo Integrale / Trascrizione Vocale',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 250, after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: note.content || note.rawTranscription || 'Nessun contenuto.',
                italics: note.type === 'audio'
              })
            ],
            spacing: { after: 200 }
          })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }

  /**
   * Genera documento Word aggregato per un Argomento (Topic Dossier)
   */
  static async generateTopicDocx(topicName, topicSummary, notes, outputPath) {
    const sortedNotes = [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const doc = new Document({
      title: `Dossier: ${topicName}`,
      description: `Rapporto completo per l'argomento ${topicName}`,
      sections: [{
        properties: {},
        children: [
          // Titolo Argomento
          new Paragraph({
            text: `🌌 Costellazione: ${topicName}`,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Report generato da CosmoNotes - Totale note collegate: ${notes.length}`, italics: true, color: '6B7280' })
            ],
            spacing: { after: 300 }
          }),

          // Macro-Sintesi AI
          new Paragraph({
            text: '📊 Sintesi Globale dell\'Argomento',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: topicSummary || 'Sintesi d\'argomento in fase di elaborazione.',
                size: 22,
                color: '1F2937'
              })
            ],
            spacing: { after: 350 }
          }),

          // Sezione Note Dettagliate
          new Paragraph({
            text: '📑 Note e Appunti Collegati',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 250, after: 200 }
          }),

          ...sortedNotes.flatMap((note, index) => [
            new Paragraph({
              text: `${index + 1}. ${note.title || 'Nota senza titolo'}`,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 80 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Data: ', bold: true }),
                new TextRun({ text: `${new Date(note.createdAt).toLocaleString('it-IT')}   |   Tipo: ${note.type === 'audio' ? '🎤 Vocale' : '✍️ Testuale'}`, color: '4B5563' })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Sintesi: ', bold: true, color: '0284C7' }),
                new TextRun({ text: note.summary || 'Nessuna sintesi' })
              ],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Testo integrale: ', bold: true, color: '374151' }),
                new TextRun({ text: note.content || note.rawTranscription || '' })
              ],
              spacing: { after: 250 }
            })
          ])
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }
}
