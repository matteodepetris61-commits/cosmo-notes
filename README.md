# 🌌 CosmoNotes - Constellation Knowledge Base

Piattaforma intelligente per la cattura di note vocali e testuali da **PC e Smartphone**, organizzazione automatica in **mappa 2D a costellazione interattiva**, **sintesi AI gerarchica** e generazione automatica di **documenti Word (.docx)** nel tuo workspace locale.

---

## 🚀 Avvio Rapido

### 1. Avviare l'applicazione
Nella cartella `cosmo-notes`:
```bash
npm run dev
```

### 2. Accedere da PC Desktop
Apri nel browser: **http://localhost:3000**

### 3. Accedere da Telefono (iPhone o Android)
Assicurati che il telefono sia connesso alla stessa rete Wi-Fi del PC e apri l'indirizzo di rete locale (es. `http://192.168.1.16:3000` visualizzato nel terminale).
- **iPhone (Safari)**: Clicca su *Condividi* -> *Aggiungi alla schermata Home*.
- **Android (Chrome)**: Clicca sul menu 3 puntini -> *Aggiungi a schermata Home* / *Installa*.

---

## 📁 Struttura Workspace Locale
Tutti i tuoi file sono salvati sul tuo computer nella cartella `workspace/`:
- `workspace/docx/`: Documenti Word (.docx) generati automaticamente per ciascuna nota e per ciascun argomento.
- `workspace/audio/`: Registrazioni vocali audio (.webm/.mp3).
- `workspace/knowledge_base.json`: Database locale delle note, tag e relazioni della costellazione.

---

## 🔑 Configurazione Chiave Gemini AI
1. Apri l'app e clicca su **⚙️ (Impostazioni)** in alto a destra.
2. Inserisci la tua chiave API di Google AI Studio (formato `AIzaSy...`).
3. Clicca **"Testa"** e poi **"Salva Impostazioni"**.
