'use client';

import React, { useState, useEffect } from 'react';
import { useFactory } from '@/lib/store/factory-store';
import { Mic, MicOff, X, Sparkles, CheckCircle2, AlertCircle, Volume2, ArrowRight } from 'lucide-react';

export function VoiceModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { executeVoiceCommand } = useFactory();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; actionTaken: string; error?: string } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsListening(false);
      setTranscript('');
      setResult(null);
    }
  }, [isOpen]);

  const startListening = () => {
    setResult(null);
    setTranscript('');
    
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition API is not supported in this browser. You can type the command below!');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English / Hindi-English mix

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const text = event.results[current][0].transcript;
        setTranscript(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleExecute = async (commandText: string) => {
    if (!commandText.trim()) return;
    setIsProcessing(true);
    try {
      const res = await executeVoiceCommand(commandText);
      setResult(res);
    } catch (err: unknown) {
      setResult({
        success: false,
        actionTaken: 'Error',
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Floor Voice Agent
              </h3>
              <p className="text-xs text-slate-500">
                Natural speech commands in English / Hinglish
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-center">
          {/* Big Mic Button */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <button
              onClick={isListening ? () => setIsListening(false) : startListening}
              className={`h-24 w-24 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-rose-600 text-white mic-active scale-110 shadow-xl shadow-rose-500/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isListening ? <Mic className="h-10 w-10 animate-pulse" /> : <MicOff className="h-10 w-10" />}
            </button>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {isListening ? 'Listening... Speak your command now' : 'Click to Speak (or Type Below)'}
            </p>
          </div>

          {/* Transcript Preview */}
          {(transcript || manualInput) && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Volume2 className="h-3.5 w-3.5" />
                <span>Transcript:</span>
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                &ldquo;{transcript || manualInput}&rdquo;
              </p>
            </div>
          )}

          {/* Quick Example Prompts */}
          <div className="space-y-1.5 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Example Phrases:
            </p>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <button
                onClick={() => {
                  setManualInput('Move batch 2601 to washing 248 pieces');
                  handleExecute('Move batch 2601 to washing 248 pieces');
                }}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left text-slate-700 dark:text-slate-300 transition"
              >
                &bull; &ldquo;Move batch 2601 to washing 248 pieces&rdquo;
              </button>
              <button
                onClick={() => {
                  setManualInput('Write off 2 pieces in cutting batch 2602 for fabric defects');
                  handleExecute('Write off 2 pieces in cutting batch 2602 for fabric defects');
                }}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left text-slate-700 dark:text-slate-300 transition"
              >
                &bull; &ldquo;Write off 2 pieces in cutting batch 2602 for fabric defects&rdquo;
              </button>
              <button
                onClick={() => {
                  setManualInput('Receive incoming transfer at Stitching');
                  handleExecute('Receive incoming transfer at Stitching');
                }}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left text-slate-700 dark:text-slate-300 transition"
              >
                &bull; &ldquo;Receive incoming transfer at Stitching&rdquo;
              </button>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Or type speech command here..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleExecute(manualInput || transcript);
              }}
            />
            <button
              onClick={() => handleExecute(manualInput || transcript)}
              disabled={isProcessing || (!transcript && !manualInput)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              {isProcessing ? 'Processing...' : 'Execute'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Execution Result Banner */}
          {result && (
            <div
              className={`p-3.5 rounded-xl text-left flex items-start gap-3 text-xs ${
                result.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">
                  {result.success ? 'Voice Action Executed' : 'Needs Review / Failed'}
                </p>
                <p className="mt-0.5">{result.actionTaken}</p>
                {result.error && <p className="mt-1 text-rose-600">{result.error}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
