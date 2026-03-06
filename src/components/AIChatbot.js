import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MessageSquare, Send, X, Minimize2, Maximize2, Sparkles, Loader2, Mic, MicOff } from 'lucide-react';
import { db } from '../utils/supabaseClient';

const AIChatbot = ({ onClose, isMinimized, setIsMinimized }) => {
  const STORAGE_KEY = 'guin_ai_chat_history';
  
  // Load messages from localStorage or use default welcome message
  const loadMessages = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
    return [
      {
        role: 'assistant',
        content: 'Hallo! Ik ben je AI assistent. Ik kan je helpen met:\n\n• Taken beheren (bijv. "Zet offerte maken naar done bij Heevis")\n• SEO content genereren\n• Algemene vragen beantwoorden\n• Project informatie opzoeken\n\nWaar kan ik je mee helpen?'
      }
    ];
  };
  
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    console.log('AIChatbot Component Mounted - Version v4.0 (Correcte Models)');
    scrollToBottom();
  }, [messages]);
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }, [messages]);
  
  const clearHistory = () => {
    const confirmClear = window.confirm('Weet je zeker dat je de chat geschiedenis wilt wissen?');
    if (confirmClear) {
      const welcomeMessage = [
        {
          role: 'assistant',
          content: 'Hallo! Ik ben je AI assistent. Ik kan je helpen met:\n\n• Taken beheren (bijv. "Zet offerte maken naar done bij Heevis")\n• SEO content genereren\n• Algemene vragen beantwoorden\n• Project informatie opzoeken\n\nWaar kan ik je mee helpen?'
        }
      ];
      setMessages(welcomeMessage);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const parseCommand = async (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Command: Update task status (flexible patterns)
    // Supports: "zet X naar done", "zet X op done", "X klaar", "X is klaar", "zet X naar in progress", etc.
    const statusKeywords = {
      done: ['done', 'klaar', 'af', 'voltooid', 'gedaan'],
      in_progress: ['in progress', 'bezig', 'aan het werk', 'progress', 'doing'],
      review: ['review', 'nakijken', 'controleren', 'checken'],
      to_start: ['to start', 'te starten', 'todo', 'to do', 'nog doen']
    };
    
    // Check if message contains status update keywords
    let targetStatus = null;
    let statusText = '';
    for (const [status, keywords] of Object.entries(statusKeywords)) {
      if (keywords.some(kw => lowerMessage.includes(kw))) {
        targetStatus = status;
        statusText = keywords[0];
        break;
      }
    }
    
    if (targetStatus && (lowerMessage.includes('zet') || lowerMessage.includes('klaar') || lowerMessage.includes('naar') || lowerMessage.includes('op'))) {
      try {
        // Extract project name - prioritize 'bij' over 'in' and capture multiple words
        let projectMatch = lowerMessage.match(/bij\s+([\w\s]+?)(?:\s+naar|\s+op|$)/i);
        if (!projectMatch) projectMatch = lowerMessage.match(/(?:in|voor)\s+([\w]+)(?:\s+naar|\s+op|$)/i);
        
        // Try multiple task extraction patterns
        let taskMatch = lowerMessage.match(/zet\s+(.+?)\s+(?:in|bij|voor|naar|op)/i);
        if (!taskMatch) taskMatch = lowerMessage.match(/^(.+?)\s+(?:klaar|done|af)/i);
        if (!taskMatch) taskMatch = lowerMessage.match(/^(.+?)\s+(?:naar|op)/i);
        
        if (projectMatch && taskMatch) {
          const projectName = projectMatch[1].trim();
          const taskName = taskMatch[1].replace(/^(zet|maak|doe)\s+/i, '').trim();
          
          // Find project
          const projects = await db.projects.getAll();
          const project = projects.find(p => 
            p.name.toLowerCase().includes(projectName.toLowerCase())
          );
          
          if (project) {
            // Find task
            const tasks = await db.projectTasks.getByProject(project.id);
            const task = tasks.find(t => 
              t.title.toLowerCase().includes(taskName.toLowerCase())
            );
            
            if (task) {
              // Update task status
              await db.projectTasks.updatePosition(task.id, task.position, targetStatus);
              const statusEmoji = targetStatus === 'done' ? '✅' : targetStatus === 'in_progress' ? '🔄' : targetStatus === 'review' ? '👀' : '📋';
              
              // Dispatch event to notify other components to refresh
              window.dispatchEvent(new CustomEvent('taskUpdated', { 
                detail: { projectId: project.id, taskId: task.id } 
              }));
              
              return {
                success: true,
                message: `${statusEmoji} Perfect! Ik heb "${task.title}" bij ${project.name} naar ${statusText} gezet.`
              };
            } else {
              return {
                success: false,
                message: `Ik kon de taak "${taskName}" niet vinden bij ${project.name}. Controleer de naam en probeer opnieuw.`
              };
            }
          } else {
            return {
              success: false,
              message: `Ik kon het project "${projectName}" niet vinden. Controleer de naam en probeer opnieuw.`
            };
          }
        }
      } catch (error) {
        console.error('Command execution error:', error);
        return {
          success: false,
          message: 'Er ging iets mis bij het uitvoeren van het commando. Probeer het opnieuw.'
        };
      }
    }
    
    // Command: Create new task
    // Supports: "maak taak X in project Y", "nieuwe taak X bij Y", "voeg X toe aan Y"
    if ((lowerMessage.includes('maak') || lowerMessage.includes('nieuwe') || lowerMessage.includes('voeg') || lowerMessage.includes('creëer')) && 
        (lowerMessage.includes('taak') || lowerMessage.includes('task'))) {
      try {
        // Prioritize 'bij' and capture full project name
        let projectMatch = lowerMessage.match(/(?:bij|aan)\s+([\w\s]+?)(?:\s*$)/i);
        if (!projectMatch) projectMatch = lowerMessage.match(/(?:in|voor)\s+([\w]+)/i);
        const taskMatch = lowerMessage.match(/(?:taak|task)\s+(.+?)\s+(?:bij|in|voor|aan)/i);
        
        if (projectMatch && taskMatch) {
          const projectName = projectMatch[1];
          const taskTitle = taskMatch[1].trim();
          
          // Find project
          const projects = await db.projects.getAll();
          const project = projects.find(p => 
            p.name.toLowerCase().includes(projectName.toLowerCase())
          );
          
          if (project) {
            // Get existing tasks to determine position
            const tasks = await db.projectTasks.getByProject(project.id);
            const maxPosition = tasks.length > 0 ? Math.max(...tasks.map(t => t.position)) : 0;
            
            // Create new task
            const newTask = await db.projectTasks.create({
              project_id: project.id,
              title: taskTitle,
              status: 'to_start',
              position: maxPosition + 1
            });
            
            return {
              success: true,
              message: `✨ Nieuwe taak "${taskTitle}" toegevoegd aan ${project.name}!`
            };
          } else {
            return {
              success: false,
              message: `Ik kon het project "${projectName}" niet vinden. Controleer de naam en probeer opnieuw.`
            };
          }
        }
      } catch (error) {
        console.error('Command execution error:', error);
        return {
          success: false,
          message: 'Er ging iets mis bij het aanmaken van de taak. Probeer het opnieuw.'
        };
      }
    }
    
    // Command: Show project info
    if (lowerMessage.includes('project') && (lowerMessage.includes('info') || lowerMessage.includes('status'))) {
      try {
        const projectMatch = lowerMessage.match(/project\s+(\w+)/i);
        if (projectMatch) {
          const projectName = projectMatch[1];
          const projects = await db.projects.getAll();
          const project = projects.find(p => 
            p.name.toLowerCase().includes(projectName.toLowerCase())
          );
          
          if (project) {
            const tasks = await db.projectTasks.getByProject(project.id);
            const tasksByStatus = {
              to_start: tasks.filter(t => t.status === 'to_start').length,
              in_progress: tasks.filter(t => t.status === 'in_progress').length,
              review: tasks.filter(t => t.status === 'review').length,
              done: tasks.filter(t => t.status === 'done').length
            };
            
            return {
              success: true,
              message: `📊 **${project.name}**\n\nStatus: ${project.status}\nVoortgang: ${project.progress}%\nDeadline: ${project.deadline || 'Niet ingesteld'}\n\n**Taken:**\n• Te Starten: ${tasksByStatus.to_start}\n• Bezig: ${tasksByStatus.in_progress}\n• Review: ${tasksByStatus.review}\n• Done: ${tasksByStatus.done}\n\nTotaal: ${tasks.length} taken`
            };
          }
        }
      } catch (error) {
        console.error('Command execution error:', error);
      }
    }
    
    return null;
  };

  const generateWithFallback = async (genAI, prompt) => {
    const models = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-flash-latest"];
    let lastError = null;

    for (const modelName of models) {
      try {
        console.log(`[v4.0 Chatbot] Attempting generation with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log(`✅ Chatbot success with model: ${modelName}`);
        return { text: response.text(), model: modelName };
      } catch (error) {
        console.warn(`❌ Chatbot model ${modelName} failed:`, error.message);
        lastError = error;
      }
    }
    throw lastError;
  };

  const callGeminiAPI = async (userMessage, conversationHistory) => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      return 'Ik heb een Gemini API key nodig. Ga naar Guin.AI pagina → API Settings om je key in te stellen.';
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      const prompt = `Je bent een behulpzame AI assistent voor een project management dashboard genaamd Guin.AI. Je helpt gebruikers met:
- Project en taak management
- SEO content generatie in het Nederlands
- Algemene vragen beantwoorden
- Productiviteit tips

Antwoord altijd in het Nederlands, tenzij anders gevraagd. Wees vriendelijk, professioneel en to-the-point.

Gebruiker vraag: ${userMessage}`;

      console.log('[v4.0 Chatbot] Generating content with CORRECT model names...');
      const { text, model } = await generateWithFallback(genAI, prompt);
      
      console.log(`✅ Chatbot successfully generated with model: ${model}`);
      
      return text;

    } catch (error) {
      console.error('Gemini SDK error (Chatbot):', error);
      return `Fout bij het verbinden met de AI: ${error.message}`;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // First, try to parse as command
      const commandResult = await parseCommand(userMessage);
      
      if (commandResult) {
        // It's a command
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: commandResult.message,
          isCommand: true
        }]);
      } else {
        // It's a general question - use Gemini
        const aiResponse = await callGeminiAPI(userMessage, messages);
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, er ging iets mis. Probeer het opnieuw.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'nl-NL';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + ' ' + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input wordt niet ondersteund in deze browser. Gebruik Chrome of Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-blue-purple text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] glass-effect rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/20">
      {/* Header */}
      <div className="bg-gradient-blue-purple p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-white" />
          <h3 className="text-white font-semibold">AI Assistent</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearHistory}
            className="text-white/60 hover:text-white transition-colors text-xs px-2 py-1 rounded hover:bg-white/10"
            title="Wis chat geschiedenis"
          >
            Wis
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-blue-purple text-white'
                  : message.isCommand
                  ? 'bg-green-500/20 text-green-100 border border-green-500/30'
                  : 'bg-white/10 text-white border border-white/20'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-end space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Stel een vraag of geef een commando..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400 resize-none"
            rows="2"
            disabled={isLoading}
          />
          <button
            onClick={toggleVoiceInput}
            disabled={isLoading}
            className={`text-white p-3 rounded-xl transition-all ${
              isListening 
                ? 'bg-red-500 animate-pulse' 
                : 'bg-white/10 hover:bg-white/20'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isListening ? 'Stop opnemen' : 'Spraak invoer'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-blue-purple text-white p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-white/40 text-xs mt-2">
          {isListening ? '🎤 Luisteren... Spreek nu!' : 'Tip: Gebruik de microfoon of typ een commando'}
        </p>
      </div>
    </div>
  );
};

export default AIChatbot;
