import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Sparkles, FileText, Search, Zap, Copy, Check, Settings as SettingsIcon, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

const AICenterPage = () => {
  const [activeTab, setActiveTab] = useState('seo');
  const [seoInput, setSeoInput] = useState({
    keyword: '',
    tone: 'professional',
    length: 'medium',
    type: 'blog'
  });
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem('gemini_api_key'));
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyValidationStatus, setKeyValidationStatus] = useState(null); // 'valid', 'invalid', or null
  const [validationError, setValidationError] = useState('');
  const [usedModel, setUsedModel] = useState('');

  const generateWithFallback = async (genAI, prompt, isValidation = false) => {
    const models = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-flash-latest"];
    let lastError = null;

    for (const modelName of models) {
      try {
        console.log(`[v4.0] Attempting generation with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log(`✅ Success with model: ${modelName}`);
        return { text: response.text(), model: modelName };
      } catch (error) {
        console.warn(`❌ Model ${modelName} failed:`, error.message);
        lastError = error;
      }
    }
    throw lastError;
  };

  const validateApiKey = async (keyToValidate) => {
    if (!keyToValidate || keyToValidate.trim().length < 20) {
      setKeyValidationStatus('invalid');
      setValidationError('API key is te kort');
      return false;
    }
    setIsValidatingKey(true);
    setKeyValidationStatus(null);
    setValidationError('');
    try {
      console.log('[v4.0] Validating API key with CORRECT model names (gemini-3-flash-preview, gemini-2.5-flash, gemini-flash-latest)...');
      const genAI = new GoogleGenerativeAI(keyToValidate);
      await generateWithFallback(genAI, "test", true);
      console.log('✅ API key is valid!');
      setKeyValidationStatus('valid');
      return true;
    } catch (error) {
      console.error('❌ API key validation failed:', error);
      setKeyValidationStatus('invalid');
      setValidationError(error.message || 'Validatie mislukt');
      return false;
    } finally {
      setIsValidatingKey(false);
    }
  };

  const saveApiKey = async () => {
    const isValid = await validateApiKey(apiKey);
    if (isValid) {
      localStorage.setItem('gemini_api_key', apiKey);
      setTimeout(() => setShowApiKeyInput(false), 1000);
    }
  };

  const generateSEOContent = async () => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (!savedApiKey) {
      alert('Stel eerst je Gemini API key in via de Settings knop.');
      setShowApiKeyInput(true);
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setUsedModel('');

    try {
      const prompt = `Genereer ${seoInput.type === 'blog' ? 'een blog artikel' : 
                      seoInput.type === 'product' ? 'een product beschrijving' :
                      seoInput.type === 'meta' ? 'meta beschrijving en title' :
                      'social media content'} in het Nederlands.

Keyword: ${seoInput.keyword}
Toon: ${seoInput.tone === 'professional' ? 'Professioneel' : 
       seoInput.tone === 'casual' ? 'Casual en vriendelijk' :
       seoInput.tone === 'technical' ? 'Technisch en gedetailleerd' : 'Enthousiast en energiek'}
Lengte: ${seoInput.length === 'short' ? 'Kort (150-300 woorden)' :
         seoInput.length === 'medium' ? 'Gemiddeld (500-800 woorden)' : 'Lang (1000+ woorden)'}

Maak de content SEO-geoptimaliseerd met:
- Natuurlijk gebruik van het keyword
- Goede structuur met headers
- Leesbare paragrafen
- Call-to-action waar relevant

${seoInput.type === 'meta' ? 'Geef zowel een meta title (max 60 karakters) als meta description (max 160 karakters).' : ''}`;

      const genAI = new GoogleGenerativeAI(savedApiKey);
      
      console.log('[v4.0] Generating content with CORRECT model names...');
      const { text, model } = await generateWithFallback(genAI, prompt);

      setGeneratedContent(text);
      setUsedModel(model);

    } catch (error) {
      console.error('Gemini SDK error:', error);
      setGeneratedContent(`Fout bij het genereren van content: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-3">
            <Sparkles className="w-8 h-8 text-blue-400" />
            <span>AI Center</span>
          </h1>
          <p className="text-white/70">Genereer SEO content, stel vragen en automatiseer taken</p>
        </div>
        <button
          onClick={() => setShowApiKeyInput(!showApiKeyInput)}
          className="glass-effect px-4 py-2 rounded-lg text-white flex items-center space-x-2 hover:bg-white/20 transition-colors"
        >
          <SettingsIcon className="w-5 h-5" />
          <span>API Settings</span>
        </button>
      </div>

      {/* API Key Input */}
      {showApiKeyInput && (
        <div className="gradient-card rounded-xl p-6">
          <h3 className="text-white text-lg font-semibold mb-4">Gemini API Key <span className="text-xs text-white/40 ml-2">(v4.0 - Correcte Models)</span></h3>
          <p className="text-white/70 text-sm mb-4">
            Haal je gratis API key op bij{' '}
            <a 
              href="https://makersuite.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Google AI Studio
            </a>
          </p>
          <div className="space-y-3">
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setKeyValidationStatus(null);
                  }}
                  placeholder="Plak je Gemini API key hier..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 pr-24 text-white focus:outline-none focus:border-blue-400"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                  {isValidatingKey && (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {!isValidatingKey && keyValidationStatus === 'valid' && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                  {!isValidatingKey && keyValidationStatus === 'invalid' && (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-white/60 hover:text-white transition-colors"
                    type="button"
                  >
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                onClick={saveApiKey}
                disabled={isValidatingKey || !apiKey}
                className="btn-primary px-6 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidatingKey ? 'Valideren...' : 'Opslaan'}
              </button>
            </div>
            {keyValidationStatus === 'valid' && (
              <p className="text-green-400 text-sm flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>API key is geldig en werkt correct!</span>
              </p>
            )}
            {keyValidationStatus === 'invalid' && (
              <div className="text-red-400 text-sm">
                <div className="flex items-center space-x-2 mb-1">
                  <XCircle className="w-4 h-4" />
                  <span>API key is ongeldig. Controleer je key en probeer opnieuw.</span>
                </div>
                {validationError && <div className="ml-6 text-xs opacity-75 text-red-300">{validationError}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('seo')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'seo'
              ? 'text-white border-b-2 border-blue-400'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <FileText className="w-5 h-5 inline mr-2" />
          SEO Content
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'chat'
              ? 'text-white border-b-2 border-blue-400'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Sparkles className="w-5 h-5 inline mr-2" />
          AI Chat
        </button>
      </div>

      {/* SEO Content Generator */}
      {activeTab === 'seo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="gradient-card rounded-xl p-6 space-y-6">
            <h2 className="text-white text-xl font-semibold">Content Instellingen</h2>
            
            <div>
              <label className="block text-white/70 text-sm mb-2">Keyword / Onderwerp</label>
              <input
                type="text"
                value={seoInput.keyword}
                onChange={(e) => setSeoInput({...seoInput, keyword: e.target.value})}
                placeholder="Bijv. 'Shopify webshop ontwikkeling'"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Content Type</label>
              <select
                value={seoInput.type}
                onChange={(e) => setSeoInput({...seoInput, type: e.target.value})}
                className="w-full input-plain rounded-lg px-4 py-3"
              >
                <option value="blog">Blog Artikel</option>
                <option value="product">Product Beschrijving</option>
                <option value="meta">Meta Title & Description</option>
                <option value="social">Social Media Post</option>
              </select>
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Toon</label>
              <select
                value={seoInput.tone}
                onChange={(e) => setSeoInput({...seoInput, tone: e.target.value})}
                className="w-full input-plain rounded-lg px-4 py-3"
              >
                <option value="professional">Professioneel</option>
                <option value="casual">Casual & Vriendelijk</option>
                <option value="technical">Technisch</option>
                <option value="enthusiastic">Enthousiast</option>
              </select>
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Lengte</label>
              <select
                value={seoInput.length}
                onChange={(e) => setSeoInput({...seoInput, length: e.target.value})}
                className="w-full input-plain rounded-lg px-4 py-3"
              >
                <option value="short">Kort (150-300 woorden)</option>
                <option value="medium">Gemiddeld (500-800 woorden)</option>
                <option value="long">Lang (1000+ woorden)</option>
              </select>
            </div>

            <button
              onClick={generateSEOContent}
              disabled={!seoInput.keyword || isGenerating}
              className="w-full btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Genereren...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Genereer Content</span>
                </>
              )}
            </button>
          </div>

          {/* Output Panel */}
          <div className="gradient-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h2 className="text-white text-xl font-semibold">Gegenereerde Content</h2>
                {usedModel && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Model: {usedModel}
                  </span>
                )}
              </div>
              {generatedContent && (
                <button
                  onClick={copyToClipboard}
                  className="glass-effect px-4 py-2 rounded-lg text-white text-sm flex items-center space-x-2 hover:bg-white/20 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Gekopieerd!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Kopieer</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 min-h-[500px] max-h-[600px] overflow-y-auto">
              {generatedContent ? (
                <div className="text-white whitespace-pre-wrap">{generatedContent}</div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/50">
                  <FileText className="w-16 h-16 mb-4" />
                  <p className="text-center">
                    Vul de instellingen in en klik op "Genereer Content"<br />
                    om SEO-geoptimaliseerde content te maken
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Tab */}
      {activeTab === 'chat' && (
        <div className="gradient-card rounded-xl p-6">
          <div className="text-center py-12 text-white/70">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-blue-400" />
            <h3 className="text-xl font-semibold text-white mb-2">AI Chat</h3>
            <p className="mb-4">
              Gebruik de floating chatbot rechtsonder voor snelle vragen en commando's.
            </p>
            <p className="text-sm">
              Je kunt bijvoorbeeld vragen:<br />
              • "Zet offerte maken naar done bij Heevis"<br />
              • "Geef me project info over Degalux"<br />
              • "Wat zijn de beste SEO praktijken?"
            </p>
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="gradient-card rounded-xl p-6">
        <h3 className="text-white text-lg font-semibold mb-4 flex items-center space-x-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span>Tips & Voorbeelden</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">SEO Content</h4>
            <p className="text-white/70 text-sm">
              Gebruik specifieke keywords en kies de juiste toon voor je doelgroep. 
              De AI optimaliseert automatisch voor zoekmachines.
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Commando's</h4>
            <p className="text-white/70 text-sm">
              Gebruik natuurlijke taal zoals "Zet [taak] naar done bij [project]" 
              of "Geef project info over [project naam]".
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">API Key</h4>
            <p className="text-white/70 text-sm">
              Je Gemini API key wordt lokaal opgeslagen in je browser en 
              nooit naar onze servers gestuurd.
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Gratis Tier</h4>
            <p className="text-white/70 text-sm">
              Gemini biedt een genereuze gratis tier. Perfect voor dagelijks gebruik 
              zonder extra kosten.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICenterPage;
