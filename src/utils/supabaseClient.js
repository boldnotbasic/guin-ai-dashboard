import { createClient } from '@supabase/supabase-js';

// Supabase configuratie
// Deze keys zijn publiek (ANON key) en veilig om te delen
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions voor database operaties
export const db = {
  // Apps
  apps: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    create: async (app) => {
      const { data, error } = await supabase
        .from('apps')
        .insert(app)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('apps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('apps')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Themes
  themes: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    create: async (theme) => {
      const { data, error } = await supabase
        .from('themes')
        .insert(theme)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('themes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('themes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Projects
  projects: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (project) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Branding Resources
  brandingResources: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('branding_resources')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (resource) => {
      const { data, error } = await supabase
        .from('branding_resources')
        .insert(resource)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('branding_resources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('branding_resources')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Sales/Quotes
  sales: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (sale) => {
      const { data, error } = await supabase
        .from('sales')
        .insert(sale)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // FAQs
  faqs: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (faq) => {
      const { data, error } = await supabase
        .from('faqs')
        .insert(faq)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('faqs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  }
  ,
  // Upsells
  upsells: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('upsells')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    create: async (upsell) => {
      const { data, error } = await supabase
        .from('upsells')
        .insert(upsell)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      const { data, error } = await supabase
        .from('upsells')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('upsells')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  }
};

// Festivals (Privé)
db.festivals = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('festivals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (festival) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('festivals')
      .insert([{ ...festival, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('festivals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('festivals')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Recipes (Koken)
db.recipes = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (recipe) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('recipes')
      .insert([{ ...recipe, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('recipes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Expenses (Kosten)
db.expenses = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (expense) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expense, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// File storage helper
export const storage = {
  // Upload file naar Supabase Storage
  upload: async (bucket, path, file) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });
    if (error) throw error;
    return data;
  },

  // Get public URL voor file
  getPublicUrl: (bucket, path) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  },

  // Delete file
  delete: async (bucket, paths) => {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(Array.isArray(paths) ? paths : [paths]);
    if (error) throw error;
  }
};

// Real-time subscriptions
export const subscribe = {
  // Subscribe to table changes
  toTable: (table, callback) => {
    const subscription = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table }, 
        callback
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }
};

// Auth helpers
export const auth = {
  // Sign in with email/password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  // Sign up new user
  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    return { data, error };
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get current session
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },

  // Get current user
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { data, error };
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  }
};

// User profiles
export const profiles = {
  // Get all profiles
  getAll: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Get profile by ID
  getById: async (id) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Update profile
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Aquarium Cleaning Logs
db.aquariumLogs = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('aquarium_cleaning_logs')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (log) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('aquarium_cleaning_logs')
      .insert([{ ...log, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('aquarium_cleaning_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('aquarium_cleaning_logs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Aquarium Notes
db.aquariumNotes = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('aquarium_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (note) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('aquarium_notes')
      .insert([{ ...note, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('aquarium_notes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Aquarium Fish/Creatures
db.aquariumFish = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('aquarium_fish')
      .select('*')
      .eq('user_id', user.id)
      .order('added_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (fish) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('aquarium_fish')
      .insert([{ ...fish, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('aquarium_fish')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('aquarium_fish')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Ideas (Idea Center)
db.ideas = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  updatePositions: async (ideas) => {
    // Update positions for all ideas
    const updates = ideas.map((idea, index) => ({
      id: idea.id,
      position: index
    }));
    
    for (const update of updates) {
      await supabase
        .from('ideas')
        .update({ position: update.position })
        .eq('id', update.id);
    }
  },
  create: async (idea) => {
    // Get user if authenticated, otherwise set to null
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user ? user.id : null;
    
    const { data, error } = await supabase
      .from('ideas')
      .insert([{ ...idea, user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('ideas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Idea Folders
db.ideaFolders = {
  getByIdea: async (ideaId) => {
    const { data, error } = await supabase
      .from('idea_folders')
      .select('*')
      .eq('idea_id', ideaId)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (folder) => {
    const { data, error } = await supabase
      .from('idea_folders')
      .insert([folder])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('idea_folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('idea_folders')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Idea Screenshots
db.ideaScreenshots = {
  getByFolder: async (folderId) => {
    const { data, error } = await supabase
      .from('idea_screenshots')
      .select('*')
      .eq('folder_id', folderId)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (screenshot) => {
    const { data, error } = await supabase
      .from('idea_screenshots')
      .insert([screenshot])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('idea_screenshots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('idea_screenshots')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Inspirations (Inspiration Center)
db.inspirations = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('inspirations')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  updatePositions: async (inspirations) => {
    const updates = inspirations.map((inspiration, index) => ({
      id: inspiration.id,
      position: index
    }));
    
    for (const update of updates) {
      await supabase
        .from('inspirations')
        .update({ position: update.position })
        .eq('id', update.id);
    }
  },
  create: async (inspiration) => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user ? user.id : null;
    
    const { data, error } = await supabase
      .from('inspirations')
      .insert([{ ...inspiration, user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('inspirations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('inspirations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Inspiration Folders
db.inspirationFolders = {
  getByInspiration: async (inspirationId) => {
    const { data, error } = await supabase
      .from('inspiration_folders')
      .select('*')
      .eq('inspiration_id', inspirationId)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  getGeneral: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('inspiration_folders')
      .select('*')
      .is('inspiration_id', null)
      .eq('user_id', user.id)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (folder) => {
    const { data, error } = await supabase
      .from('inspiration_folders')
      .insert([folder])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('inspiration_folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('inspiration_folders')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Inspiration Screenshots
db.inspirationScreenshots = {
  getByFolder: async (folderId) => {
    const { data, error } = await supabase
      .from('inspiration_screenshots')
      .select('*')
      .eq('folder_id', folderId)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (screenshot) => {
    const { data, error } = await supabase
      .from('inspiration_screenshots')
      .insert([screenshot])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('inspiration_screenshots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('inspiration_screenshots')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Autos
db.autos = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('autos')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  updatePositions: async (autos) => {
    const updates = autos.map((auto, index) => ({
      id: auto.id,
      position: index
    }));
    
    for (const update of updates) {
      await supabase
        .from('autos')
        .update({ position: update.position })
        .eq('id', update.id);
    }
  },
  create: async (auto) => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user ? user.id : null;
    
    const { data, error } = await supabase
      .from('autos')
      .insert([{ ...auto, user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('autos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('autos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Jerky Batches
db.jerky = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('jerky_batches')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (batch) => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user ? user.id : null;
    
    const { data, error } = await supabase
      .from('jerky_batches')
      .insert([{ ...batch, user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('jerky_batches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('jerky_batches')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Project Tasks (for agenda and kanban)
db.projectTasks = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('*, projects(name, client)')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  getByProject: async (projectId) => {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  getByDateRange: async (startDate, endDate) => {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('*, projects(name, client)')
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order('due_date', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (task) => {
    const { data, error } = await supabase
      .from('project_tasks')
      .insert([task])
      .select('*, projects(name, client)')
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('project_tasks')
      .update(updates)
      .eq('id', id)
      .select('*, projects(name, client)')
      .single();
    if (error) throw error;
    return data;
  },
  updatePosition: async (id, newPosition, newStatus) => {
    const updates = { position: newPosition };
    if (newStatus) updates.status = newStatus;
    
    const { data, error } = await supabase
      .from('project_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('project_tasks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Crab Cave Products
db.crabCaveProducts = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('crab_cave_products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (product) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('crab_cave_products')
      .insert([{ ...product, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('crab_cave_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('crab_cave_products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Crab Cave People
db.crabCavePeople = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('crab_cave_people')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (person) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('crab_cave_people')
      .insert([{ ...person, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Crab Cave Orders
db.crabCaveOrders = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('crab_cave_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (order) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('crab_cave_orders')
      .insert([{ ...order, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('crab_cave_orders')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  deleteByPerson: async (personId) => {
    const { error } = await supabase
      .from('crab_cave_orders')
      .delete()
      .eq('person_id', personId);
    if (error) throw error;
  }
};

// Quick Links
db.quickLinks = {
  getAll: async (platform) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      let query = supabase
        .from('quick_links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (platform) query = query.eq('platform', platform);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      // Backwards compat for databases where 'platform' column doesn't exist yet
      if (String(error?.message || '').includes('column') && String(error?.message || '').includes('platform')) {
        const { data, error: fallbackError } = await supabase
          .from('quick_links')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        return data || [];
      }
      throw error;
    }
  },
  create: async (link) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase
        .from('quick_links')
        .insert([{ ...link, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      // Backwards compat for databases where 'platform' column doesn't exist yet
      if (String(error?.message || '').includes('column') && String(error?.message || '').includes('platform')) {
        const { platform, ...linkWithoutPlatform } = link || {};
        const { data, error: fallbackError } = await supabase
          .from('quick_links')
          .insert([{ ...linkWithoutPlatform, user_id: user.id }])
          .select()
          .single();
        if (fallbackError) throw fallbackError;
        return data;
      }
      throw error;
    }
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('quick_links')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Stock Counts (Stoktelling)
db.stockCounts = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('stock_counts')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (stockCount) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('stock_counts')
      .insert([{ ...stockCount, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('stock_counts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('stock_counts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// 2DO Tickets
db.todoTickets = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('todo_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (ticket) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('todo_tickets')
      .insert([{ ...ticket, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('todo_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('todo_tickets')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Investments
db.investments = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('investments')
      .select(`
        *,
        investment_links (*)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (investment) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('investments')
      .insert([{ ...investment, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('investments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Investment Links
db.investmentLinks = {
  create: async (link) => {
    const { data, error } = await supabase
      .from('investment_links')
      .insert([link])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('investment_links')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Project Tiles
db.projectTiles = {
  getByProject: async (projectId) => {
    const { data, error } = await supabase
      .from('project_tiles')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (tile) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('project_tiles')
      .insert([{ ...tile, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('project_tiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('project_tiles')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Prospects
db.prospects = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (prospect) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('prospects')
      .insert([{ ...prospect, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('prospects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Tab Quick Links (per hoofdtab zoals Home, Sales, Projects, etc)
db.tabQuickLinks = {
  getByTab: async (tabName) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('tab_quick_links')
      .select('*')
      .eq('user_id', user.id)
      .eq('tab_name', tabName)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (link) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('tab_quick_links')
      .insert([{ ...link, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('tab_quick_links')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Reizen - Destinations
db.destinations = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (destination) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('destinations')
      .insert([{ ...destination, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('destinations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('destinations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Reizen - Hotels
db.hotels = {
  getByDestination: async (destinationId) => {
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('destination_id', destinationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (hotel) => {
    const { data, error } = await supabase
      .from('hotels')
      .insert([hotel])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('hotels')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('hotels')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Reizen - Flights
db.flights = {
  getByDestination: async (destinationId) => {
    const { data, error } = await supabase
      .from('flights')
      .select('*')
      .eq('destination_id', destinationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (flight) => {
    const { data, error } = await supabase
      .from('flights')
      .insert([flight])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('flights')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('flights')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Wandelingen - Hikes
db.hikes = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('hikes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (hike) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('hikes')
      .insert([{ ...hike, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('hikes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('hikes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

export default supabase;

// Project Colors
db.projectColors = {
  getByProject: async (projectId) => {
    const { data, error } = await supabase
      .from('project_colors')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (color) => {
    const { data, error } = await supabase
      .from('project_colors')
      .insert([color])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('project_colors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('project_colors')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Project Fonts
db.projectFonts = {
  getByProject: async (projectId) => {
    const { data, error } = await supabase
      .from('project_fonts')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (font) => {
    const { data, error } = await supabase
      .from('project_fonts')
      .insert([font])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('project_fonts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('project_fonts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Email Integration - Outlook Connections
db.outlookConnections = {
  get: async () => {
    const { data, error } = await supabase
      .from('outlook_connections')
      .select('*')
      .eq('is_active', true)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  create: async (connection) => {
    const { data, error } = await supabase
      .from('outlook_connections')
      .insert(connection)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('outlook_connections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('outlook_connections')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Email Filters per Project
db.emailFilters = {
  getByProject: async (projectId) => {
    const { data, error } = await supabase
      .from('project_email_filters')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (filter) => {
    const { data, error } = await supabase
      .from('project_email_filters')
      .insert(filter)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('project_email_filters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('project_email_filters')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Project Emails
db.projectEmails = {
  getByProject: async (projectId) => {
    const { data, error } = await supabase
      .from('project_emails')
      .select('*')
      .eq('project_id', projectId)
      .order('received_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (email) => {
    const { data, error } = await supabase
      .from('project_emails')
      .insert(email)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('project_emails')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  markAsRead: async (id) => {
    const { data, error } = await supabase
      .from('project_emails')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('project_emails')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Brand Colors
db.brandColors = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('brand_colors')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (color) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('brand_colors')
      .insert({ ...color, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('brand_colors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('brand_colors')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Brand Fonts
db.brandFonts = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('brand_fonts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  create: async (font) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('brand_fonts')
      .insert({ ...font, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('brand_fonts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('brand_fonts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Vouchers helpers
db.vouchers = {
  getAll: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  create: async (voucher) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('vouchers')
      .insert([{ ...voucher, user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('vouchers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('vouchers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
