// Toggl Track API Integration
// API Documentation: https://developers.track.toggl.com/docs/

const TOGGL_API_BASE = 'https://api.track.toggl.com/api/v9';

// BELANGRIJK: Vervang dit door je eigen Toggl API token
// Verkrijg je token via: https://track.toggl.com/profile (scroll naar beneden)
const TOGGL_API_TOKEN = 'a4fb1890c726f65b9d497800ee5afec8';

// Helper function voor API calls met Basic Auth
const togglFetch = async (endpoint, options = {}) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${TOGGL_API_TOKEN}:api_token`)}`,
      ...options.headers
    };

    const response = await fetch(`${TOGGL_API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Toggl API Error Response:', errorText);
      throw new Error(`Toggl API Error: ${response.status} ${response.statusText}`);
    }

    // Handle empty responses (204 No Content)
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error('Toggl API Fetch Error:', error);
    // Check if it's a CORS error
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('CORS Error: Toggl API blocked by browser. Use browser extension or proxy.');
    }
    throw error;
  }
};

export const togglApi = {
  // Get current user info
  getCurrentUser: async () => {
    return await togglFetch('/me');
  },

  // Get current running time entry
  getCurrentTimeEntry: async () => {
    return await togglFetch('/me/time_entries/current');
  },

  // Get time entries for a date range
  getTimeEntries: async (startDate, endDate) => {
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    return await togglFetch(`/me/time_entries?start_date=${start}&end_date=${end}`);
  },

  // Start a new time entry
  startTimeEntry: async (description, projectId = null, tags = [], billable = false) => {
    const user = await togglApi.getCurrentUser();
    const workspaceId = user.default_workspace_id;

    const timeEntry = {
      description: description || 'New time entry',
      workspace_id: workspaceId,
      duration: -1, // -1 means running
      start: new Date().toISOString(),
      created_with: 'Guin.ai Dashboard',
      billable: billable
    };

    if (projectId) {
      timeEntry.project_id = projectId;
    }

    if (tags.length > 0) {
      timeEntry.tags = tags;
    }

    return await togglFetch(`/workspaces/${workspaceId}/time_entries`, {
      method: 'POST',
      body: JSON.stringify(timeEntry)
    });
  },

  // Stop current time entry
  stopTimeEntry: async (timeEntryId) => {
    const user = await togglApi.getCurrentUser();
    const workspaceId = user.default_workspace_id;

    return await togglFetch(`/workspaces/${workspaceId}/time_entries/${timeEntryId}/stop`, {
      method: 'PATCH'
    });
  },

  // Get user's projects
  getProjects: async () => {
    const user = await togglApi.getCurrentUser();
    const workspaceId = user.default_workspace_id;
    return await togglFetch(`/workspaces/${workspaceId}/projects`);
  },

  // Format duration from seconds to HH:MM:SS
  formatDuration: (seconds) => {
    const hours = Math.floor(Math.abs(seconds) / 3600);
    const minutes = Math.floor((Math.abs(seconds) % 3600) / 60);
    const secs = Math.floor(Math.abs(seconds) % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  // Calculate current duration for running entry
  getCurrentDuration: (startTime) => {
    const start = new Date(startTime);
    const now = new Date();
    return Math.floor((now - start) / 1000);
  }
};

export default togglApi;
