import React, { useState } from 'react';
import { Settings, Eye, EyeOff, CheckCircle, XCircle, Key } from 'lucide-react';

const AISettings = () => {
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState(localStorage.getItem('gemini_api_key') ? 'saved' : null);
  const [openaiStatus, setOpenaiStatus] = useState(localStorage.getItem('openai_api_key') ? 'saved' : null);

  const saveGeminiKey = () => {
    if (geminiKey.trim().length < 20) {
      setGeminiStatus('invalid');
      return;
    }
    localStorage.setItem('gemini_api_key', geminiKey);
    setGeminiStatus('saved');
    setTimeout(() => setGeminiStatus(null), 3000);
  };

  const saveOpenaiKey = () => {
    if (openaiKey.trim().length < 20) {
      setOpenaiStatus('invalid');
      return;
    }
    localStorage.setItem('openai_api_key', openaiKey);
    setOpenaiStatus('saved');
    setTimeout(() => setOpenaiStatus(null), 3000);
  };

  const removeGeminiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setGeminiKey('');
    setGeminiStatus(null);
  };

  const removeOpenaiKey = () => {
    localStorage.removeItem('openai_api_key');
    setOpenaiKey('');
    setOpenaiStatus(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl shadow-2xl p-6 w-96">
        <div className="flex items-center space-x-2 mb-6">
          <Settings className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold text-lg">AI API Keys</h3>
        </div>

        {/* Gemini API Key */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/80 text-sm font-medium flex items-center space-x-2">
              <Key className="w-4 h-4 text-blue-400" />
              <span>Gemini API Key</span>
            </label>
            {geminiStatus === 'saved' && (
              <CheckCircle className="w-4 h-4 text-green-400" />
            )}
            {geminiStatus === 'invalid' && (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className="relative">
            <input
              type={showGeminiKey ? 'text' : 'password'}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm pr-20 focus:outline-none focus:border-blue-500/50"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <button
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="p-1 hover:bg-white/10 rounded"
              >
                {showGeminiKey ? (
                  <EyeOff className="w-4 h-4 text-white/40" />
                ) : (
                  <Eye className="w-4 h-4 text-white/40" />
                )}
              </button>
            </div>
          </div>
          <div className="flex space-x-2 mt-2">
            <button
              onClick={saveGeminiKey}
              className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            >
              Opslaan
            </button>
            {geminiKey && (
              <button
                onClick={removeGeminiKey}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
              >
                Verwijder
              </button>
            )}
          </div>
          <p className="text-white/40 text-[10px] mt-1">
            Voor AI Chatbot & SEO Content Generator
          </p>
        </div>

        {/* OpenAI API Key */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/80 text-sm font-medium flex items-center space-x-2">
              <Key className="w-4 h-4 text-purple-400" />
              <span>OpenAI API Key</span>
            </label>
            {openaiStatus === 'saved' && (
              <CheckCircle className="w-4 h-4 text-green-400" />
            )}
            {openaiStatus === 'invalid' && (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div className="relative">
            <input
              type={showOpenaiKey ? 'text' : 'password'}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-proj-..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm pr-20 focus:outline-none focus:border-purple-500/50"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <button
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                className="p-1 hover:bg-white/10 rounded"
              >
                {showOpenaiKey ? (
                  <EyeOff className="w-4 h-4 text-white/40" />
                ) : (
                  <Eye className="w-4 h-4 text-white/40" />
                )}
              </button>
            </div>
          </div>
          <div className="flex space-x-2 mt-2">
            <button
              onClick={saveOpenaiKey}
              className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            >
              Opslaan
            </button>
            {openaiKey && (
              <button
                onClick={removeOpenaiKey}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
              >
                Verwijder
              </button>
            )}
          </div>
          <p className="text-white/40 text-[10px] mt-1">
            Voor AI Uitleg bij Analyst Data (goedkoper dan Gemini)
          </p>
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-4">
          <p className="text-blue-300 text-[11px] leading-relaxed">
            <strong>Gemini:</strong> Gratis tier beschikbaar<br/>
            <strong>OpenAI:</strong> $5 gratis credit, daarna ~$0.001 per uitleg
          </p>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
