import React, { useState, useEffect } from 'react';
import { Play, Square, Clock, Folder, Tag, DollarSign, ChevronDown, X } from 'lucide-react';
import togglApi from '../utils/togglApi';

const TogglWidget = () => {
  const [currentEntry, setCurrentEntry] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [description, setDescription] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [billable, setBillable] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Poll for current time entry every 5 seconds
  useEffect(() => {
    fetchCurrentEntry();
    const interval = setInterval(fetchCurrentEntry, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadProjects = async () => {
    try {
      console.log('Loading Toggl projects...');
      const projectList = await togglApi.getProjects();
      console.log('Toggl projects loaded:', projectList);
      setProjects(projectList || []);
    } catch (err) {
      console.error('Error loading Toggl projects:', err);
    }
  };

  // Update duration every second when timer is running
  useEffect(() => {
    let interval;
    if (isRunning && currentEntry) {
      interval = setInterval(() => {
        const newDuration = togglApi.getCurrentDuration(currentEntry.start);
        setDuration(newDuration);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, currentEntry]);

  const fetchCurrentEntry = async () => {
    try {
      const entry = await togglApi.getCurrentTimeEntry();
      console.log('Current entry:', entry);
      if (entry) {
        setCurrentEntry(entry);
        setIsRunning(true);
        setDescription(entry.description || '');
        // Match project after projects are loaded
        if (entry.project_id && projects.length > 0) {
          const matchedProject = projects.find(p => p.id === entry.project_id);
          console.log('Matched project:', matchedProject);
          setSelectedProject(matchedProject || null);
        } else {
          setSelectedProject(null);
        }
        setTags(entry.tags || []);
        setBillable(entry.billable || false);
        const currentDuration = togglApi.getCurrentDuration(entry.start);
        setDuration(currentDuration);
      } else {
        setCurrentEntry(null);
        setIsRunning(false);
        setDuration(0);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching Toggl entry:', err);
      // Only show token error for 401/403 status codes
      if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
        setError('API token niet geldig');
      }
      // Otherwise silently fail - timer might just not be running
    }
  };

  const handleStart = async () => {
    if (!description.trim()) {
      setShowInput(true);
      return;
    }

    setLoading(true);
    try {
      await togglApi.startTimeEntry(
        description,
        selectedProject?.id || null,
        tags,
        billable
      );
      await fetchCurrentEntry();
      setShowInput(false);
      setShowProjectDropdown(false);
      setError(null);
    } catch (err) {
      console.error('Error starting timer:', err);
      setError('Kon timer niet starten');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!currentEntry) return;

    setLoading(true);
    try {
      await togglApi.stopTimeEntry(currentEntry.id);
      await fetchCurrentEntry();
      setDescription('');
      setSelectedProject(null);
      setTags([]);
      setBillable(false);
      setError(null);
    } catch (err) {
      console.error('Error stopping timer:', err);
      setError('Kon timer niet stoppen');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleStart();
    } else if (e.key === 'Escape') {
      setShowInput(false);
      setDescription('');
      setShowProjectDropdown(false);
    }
  };

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (error && (error.includes('niet geldig') || error.includes('vereist'))) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
        <Clock className="w-4 h-4 text-red-400" />
        <span className="text-red-400 text-xs">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Timer Display */}
      {isRunning ? (
        <div className="flex items-center space-x-2 px-3 py-2 bg-[#e57373]/10 border border-[#e57373]/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-[#e57373] rounded-full animate-pulse"></div>
            <span className="text-white font-mono text-sm font-medium">
              {togglApi.formatDuration(duration)}
            </span>
          </div>
          <span className="text-white/70 text-sm max-w-[150px] truncate">
            {currentEntry?.description || 'No description'}
          </span>
          <button
            onClick={handleStop}
            disabled={loading}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Stop timer"
          >
            <Square className="w-4 h-4 text-[#e57373] fill-[#e57373]" />
          </button>
        </div>
      ) : (
        <>
          {showInput ? (
            <div className="flex flex-col bg-white/5 border border-white/20 rounded-lg p-2 min-w-[400px]">
              {/* Main input row */}
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Wat ben je aan het doen?"
                  className="bg-transparent text-white text-sm outline-none flex-1 placeholder-white/40"
                  autoFocus
                />
                <button
                  onClick={handleStart}
                  disabled={loading || !description.trim()}
                  className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                  title="Start timer"
                >
                  <Play className="w-4 h-4 text-[#4caf50] fill-[#4caf50]" />
                </button>
              </div>

              {/* Project, Tags, Billable row */}
              <div className="flex items-center space-x-2 border-t border-white/10 pt-2">
                {/* Project selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                    className="flex items-center space-x-1 px-2 py-1 hover:bg-white/10 rounded text-xs transition-colors"
                    title="Project"
                  >
                    <Folder className="w-3.5 h-3.5 text-white/60" />
                    {selectedProject ? (
                      <span className="text-white/80" style={{ color: selectedProject.color }}>
                        {selectedProject.name}
                      </span>
                    ) : (
                      <span className="text-white/40">Project</span>
                    )}
                    <ChevronDown className="w-3 h-3 text-white/40" />
                  </button>
                  
                  {showProjectDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-white/20 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                      <div className="px-3 py-2 border-b border-white/10 text-white/40 text-xs">
                        {projects.length} projecten geladen
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProject(null);
                          setShowProjectDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/60 text-xs"
                      >
                        Geen project
                      </button>
                      {projects.length === 0 ? (
                        <div className="px-3 py-2 text-white/40 text-xs">
                          Geen projecten gevonden. Check console voor errors.
                        </div>
                      ) : (
                        projects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => {
                              setSelectedProject(project);
                              setShowProjectDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-white/10 text-white text-xs flex items-center space-x-2"
                          >
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: project.color || '#999' }}
                            />
                            <span>{project.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="flex items-center space-x-1 flex-1">
                  <Tag className="w-3.5 h-3.5 text-white/60" />
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 bg-white/10 rounded text-xs text-white/80"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyPress}
                    placeholder={tags.length === 0 ? "Tags toevoegen" : ""}
                    className="bg-transparent text-white text-xs outline-none flex-1 placeholder-white/40 min-w-[60px]"
                  />
                </div>

                {/* Billable toggle */}
                <button
                  onClick={() => setBillable(!billable)}
                  className={`p-1 rounded transition-colors ${
                    billable ? 'bg-green-500/20 text-green-400' : 'text-white/40 hover:bg-white/10'
                  }`}
                  title={billable ? "Billable" : "Not billable"}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg transition-colors"
              title="Start nieuwe timer"
            >
              <Play className="w-4 h-4 text-[#4caf50]" />
              <span className="text-white/70 text-sm">Start timer</span>
            </button>
          )}
        </>
      )}

      {/* Error Message */}
      {error && !error.includes('API token') && (
        <span className="text-red-400 text-xs">{error}</span>
      )}
    </div>
  );
};

export default TogglWidget;
