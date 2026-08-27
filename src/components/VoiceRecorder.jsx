import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Pause, Play, Trash2, Send, Upload, Sparkles, AlertCircle } from 'lucide-react';

export default function VoiceRecorder({ onSaveAudio, isProcessing }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const fileInputRef = useRef(null);

  // Timer logic
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  // Clean audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [audioUrl]);

  // Waveform visualization
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = 3;
      const gap = 2;
      const totalBars = Math.floor(canvas.width / (barWidth + gap));
      const step = Math.floor(dataArray.length / totalBars);

      for (let i = 0; i < totalBars; i++) {
        const val = dataArray[i * step] || 0;
        const barHeight = Math.max(3, (val / 255) * canvas.height * 0.9);
        const x = i * (barWidth + gap);
        const y = (canvas.height - barHeight) / 2;

        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.5, '#818cf8');
        grad.addColorStop(1, '#c084fc');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    render();
  };

  const startRecording = async () => {
    setErrorMsg(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup AudioContext for waveform
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // Setup MediaRecorder with iOS / Safari & Android support
      let mimeType = '';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        }
      }
      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      drawWaveform();
    } catch (err) {
      console.error('Microphone access error:', err);
      setErrorMsg('Impossibile accedere al microfono. Assicurati di aver concesso i permessi nel browser.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const resetRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setIsRecording(false);
    setIsPaused(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    audioChunksRef.current = [];
  };

  const handleSend = () => {
    if (audioBlob) {
      onSaveAudio(audioBlob);
      resetRecording();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onSaveAudio(file);
      e.target.value = '';
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto p-5 glass-panel rounded-3xl glow-card border border-slate-700/60 transition-all">
      {errorMsg && (
        <div className="flex items-center gap-2 text-rose-400 bg-rose-950/40 border border-rose-800/60 px-4 py-2.5 rounded-2xl mb-4 text-xs w-full">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Waveform Canvas */}
      <div className="w-full h-20 bg-space-800/80 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border border-slate-800/80 relative">
        <canvas ref={canvasRef} width={400} height={80} className="w-full h-full" />
        {!isRecording && !audioUrl && (
          <span className="absolute text-xs text-slate-500 font-medium tracking-wide">
            Tocca il microfono per registrare la tua voce
          </span>
        )}
        {isRecording && (
          <div className="absolute top-2 right-3 flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] text-red-300 font-bold uppercase tracking-wider">REC</span>
          </div>
        )}
      </div>

      {/* Timer Display */}
      <div className="text-2xl font-bold font-mono text-slate-200 tracking-wider mb-5">
        {formatTime(duration)}
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-center gap-4 w-full">
        {!isRecording && !audioBlob && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Carica file audio esistente"
              disabled={isProcessing}
              className="p-3.5 rounded-2xl bg-space-800 hover:bg-space-700 text-slate-300 hover:text-cyan-300 transition border border-slate-700/50"
            >
              <Upload className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              className="hidden"
            />

            {/* Main Record Button */}
            <button
              onClick={startRecording}
              disabled={isProcessing}
              className="relative group p-6 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:shadow-[0_0_35px_rgba(56,189,248,0.65)] hover:scale-105 transition-all duration-300"
            >
              <Mic className="w-8 h-8" />
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-cyan-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
                Dettagli vocali
              </span>
            </button>
          </>
        )}

        {isRecording && (
          <>
            <button
              onClick={resetRecording}
              title="Annulla registrazione"
              className="p-3.5 rounded-2xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 transition border border-rose-800/40"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {isPaused ? (
              <button
                onClick={resumeRecording}
                title="Riprendi"
                className="p-4 rounded-full bg-amber-500 hover:bg-amber-400 text-space-900 transition shadow-lg"
              >
                <Play className="w-6 h-6 fill-current" />
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                title="Pausa"
                className="p-4 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
              >
                <Pause className="w-6 h-6" />
              </button>
            )}

            <button
              onClick={stopRecording}
              title="Termina e ascolta"
              className="p-5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(56,189,248,0.5)] hover:scale-105 transition"
            >
              <Square className="w-6 h-6 fill-current" />
            </button>
          </>
        )}

        {audioBlob && !isRecording && (
          <div className="flex flex-col items-center gap-4 w-full">
            <audio src={audioUrl} controls className="w-full h-10 rounded-xl" />
            
            <div className="flex items-center justify-between w-full gap-3">
              <button
                onClick={resetRecording}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                Rifai
              </button>

              <button
                onClick={handleSend}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.4)] hover:brightness-110 transition"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-cyan-200" />
                    <span>Elaborazione Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Inserisci in Costellazione & Word</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
