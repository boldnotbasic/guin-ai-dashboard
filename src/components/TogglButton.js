import React, { useState, useEffect, useRef } from 'react';
import { Clock, Square } from 'lucide-react';
import togglApi from '../utils/togglApi';

const TogglButton = () => {
  const [currentEntry, setCurrentEntry] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isFetchingRef = useRef(false);

  // Fetch current Toggl entry
  const fetchCurrentEntry = async (isInitialLoad = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    
    try {
      setError(null);
      console.log('Fetching Toggl entry...');
      const entry = await togglApi.getCurrentTimeEntry();
      console.log('Toggl entry response:', entry);
      
      if (entry) {
        // Timer is running - update state
        console.log('Timer is RUNNING:', entry);
        setCurrentEntry(entry);
        setIsRunning(true);
        const currentDuration = togglApi.getCurrentDuration(entry.start);
        setDuration(currentDuration);
        console.log('Duration:', currentDuration, 'Project:', entry.project_name, 'Client:', entry.client_name);
      } else {
        // No timer running - only clear if we're sure
        console.log('No timer running');
        setCurrentEntry(null);
        setIsRunning(false);
        setDuration(0);
      }
      
      if (isInitialLoad) {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching Toggl entry:', err);
      console.error('Error details:', err.message, err.stack);
      // Don't show error or clear state on fetch errors - keep last known state
      if (isInitialLoad) {
        setLoading(false);
        setError(err.message);
      }
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchCurrentEntry(true);
    const interval = setInterval(fetchCurrentEntry, 10000); // Reduced from 5s to 10s to prevent flickering
    return () => clearInterval(interval);
  }, []);

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

  const openToggl = () => {
    const screenHeight = window.screen.height;
    const width = 450;
    const height = screenHeight - 100; // Full height minus some margin
    const left = window.screen.width - width - 50;
    const top = 50;
    
    window.open(
      'https://track.toggl.com/timer', 
      'toggl', 
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  const stopTimer = async () => {
    try {
      await togglApi.stopTimeEntry(currentEntry.id);
      await fetchCurrentEntry();
    } catch (err) {
      console.error('Error stopping timer:', err);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Toggl Button */}
      <button
        onClick={openToggl}
        className="p-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
        title="Open Toggl Track"
      >
        <Clock className="w-5 h-5 text-red-400" />
      </button>

      {/* Timer Status - Only show if no error or if timer is running */}
      {!error && (
        <div className="flex items-center space-x-2">
          {loading ? (
            <>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
              <span className="text-white/50 text-xs">Loading...</span>
            </>
          ) : isRunning ? (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <div className="flex items-center space-x-2">
                <span className="text-white/80 text-xs font-medium">
                  {togglApi.formatDuration(duration)}
                </span>
                {currentEntry.project_name && (
                  <span className="text-white/60 text-xs truncate max-w-[120px]">
                    {currentEntry.project_name}
                  </span>
                )}
                {currentEntry.client_name && (
                  <>
                    <span className="text-white/40 text-xs">•</span>
                    <span className="text-white/60 text-xs truncate max-w-[100px]">
                      {currentEntry.client_name}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={stopTimer}
                className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
                title="Stop Timer"
              >
                <Square className="w-3 h-3 text-red-400" />
              </button>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span className="text-white/50 text-xs">No timer</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TogglButton;
