import React, { useState, useEffect } from 'react';
import { db } from '../utils/supabaseClient';
import { 
  ArrowLeft, 
  Plus,
  Edit, 
  Trash2, 
  ExternalLink,
  X,
  Circle,
  CheckCircle,
  GripVertical,
  Calendar,
  Instagram,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download
} from 'lucide-react';
import ProjectEmailFilters from './ProjectEmailFilters';
import ProjectEmailList from './ProjectEmailList';

const ProjectDetailPage = ({ projectId, setActiveTab, setSelectedProject }) => {
  const [project, setProject] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [draggedTask, setDraggedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddTileModal, setShowAddTileModal] = useState(false);
  const [editingTile, setEditingTile] = useState(null);
  const [newTile, setNewTile] = useState({
    title: '',
    description: '',
    url: '',
    image_url: '',
    is_external: false
  });
  const [addingTaskToColumn, setAddingTaskToColumn] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskType, setNewTaskType] = useState('task');
  const [currentAgendaDate, setCurrentAgendaDate] = useState(new Date());
  const [showAgenda, setShowAgenda] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [modalTask, setModalTask] = useState({ title: '', due_date: '', status: 'to_start', task_type: 'task' });
  const [copyToast, setCopyToast] = useState('');
  const [projectColors, setProjectColors] = useState([]);
  const [projectFonts, setProjectFonts] = useState([]);
  const [showAddColorModal, setShowAddColorModal] = useState(false);
  const [showAddFontModal, setShowAddFontModal] = useState(false);
  const [editingColor, setEditingColor] = useState(null);
  const [editingFont, setEditingFont] = useState(null);
  const [newColor, setNewColor] = useState({ hex: '#000000', name: '' });
  const [newFont, setNewFont] = useState({ name: '', font_type: 'heading', font_family: '', font_url: '', example_text: '' });

  const brandingColors = [
    { hex: '#59BAFF', rgb: '89 186 255', cmyk: '54 14 0 0' },
    { hex: '#02002D', rgb: '2 0 45', cmyk: '90 85 48 69' },
    { hex: '#3B4862', rgb: '59 72 98', cmyk: '82 70 40 26' },
    { hex: '#6E6D89', rgb: '110 109 137', cmyk: '62 56 50 6' },
    { hex: '#191360', rgb: '25 19 96', cmyk: '100 100 27 28' },
    { hex: '#D2F3FE', rgb: '210 243 254', cmyk: '16 0 1 0' },
    { hex: '#6F6F6F', rgb: '111 111 111', cmyk: '57 49 48 15' },
    { hex: '#FAFAFA', rgb: '239 239 239', cmyk: '5 3 3 0' }
  ];

  const handleCopyColor = async (hex) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(hex);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = hex;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyToast(`${hex} gekopieerd!`);
      setTimeout(() => setCopyToast(''), 2000);
    } catch (e) {
      setCopyToast('Kopiëren mislukt');
      setTimeout(() => setCopyToast(''), 2000);
    }
  };

  const handleDownloadFont = (fontName) => {
    const link = document.createElement('a');
    if (fontName === 'Acherus') {
      link.href = '/Acherus Grotesque.zip';
      link.download = 'Acherus Grotesque.zip';
    } else {
      link.href = `/${fontName}.zip`;
      link.download = `${fontName}.zip`;
    }
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Helpers to derive RGB and CMYK from HEX
  const normalizeHex = (hex) => {
    if (!hex) return '';
    let h = hex.trim();
    if (h[0] !== '#') h = `#${h}`;
    if (h.length === 4) {
      const r = h[1], g = h[2], b = h[3];
      h = `#${r}${r}${g}${g}${b}${b}`;
    }
    return h.toUpperCase();
  };

  const hexToRgb = (hex) => {
    const h = normalizeHex(hex);
    const match = /^#([0-9A-F]{6})$/i.exec(h);
    if (!match) return null;
    const intVal = parseInt(match[1], 16);
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;
    return { r, g, b };
  };

  const hexToRgbString = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return '';
    return `${rgb.r} ${rgb.g} ${rgb.b}`;
  };

  const rgbToCmykString = (r, g, b) => {
    const rf = r / 255, gf = g / 255, bf = b / 255;
    const k = 1 - Math.max(rf, gf, bf);
    if (k >= 1) return '0 0 0 100';
    const c = (1 - rf - k) / (1 - k);
    const m = (1 - gf - k) / (1 - k);
    const y = (1 - bf - k) / (1 - k);
    const toPct = (v) => Math.round(v * 100);
    return `${toPct(c)} ${toPct(m)} ${toPct(y)} ${toPct(k)}`;
  };

  const hexToCmykString = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return '';
    return rgbToCmykString(rgb.r, rgb.g, rgb.b);
  };

  // Color CRUD functions
  const addColor = async () => {
    if (!newColor.hex) {
      alert('Vul een HEX kleur in');
      return;
    }
    try {
      const colorData = {
        project_id: parseInt(projectId),
        hex: newColor.hex,
        rgb: hexToRgbString(newColor.hex),
        cmyk: hexToCmykString(newColor.hex),
        name: newColor.name || null,
        position: projectColors.length
      };
      const created = await db.projectColors.create(colorData);
      setProjectColors([...projectColors, created]);
      setNewColor({ hex: '#000000', name: '' });
      setShowAddColorModal(false);
    } catch (error) {
      console.error('Error adding color:', error);
      alert('Fout bij toevoegen kleur');
    }
  };

  const updateColor = async () => {
    if (!editingColor || !editingColor.hex) {
      alert('Vul een HEX kleur in');
      return;
    }
    try {
      const updates = {
        hex: editingColor.hex,
        rgb: hexToRgbString(editingColor.hex),
        cmyk: hexToCmykString(editingColor.hex),
        name: editingColor.name || null
      };
      await db.projectColors.update(editingColor.id, updates);
      setProjectColors(projectColors.map(c => c.id === editingColor.id ? { ...editingColor, ...updates } : c));
      setEditingColor(null);
      setShowAddColorModal(false);
    } catch (error) {
      console.error('Error updating color:', error);
      alert('Fout bij updaten kleur');
    }
  };

  const deleteColor = async (id) => {
    if (!window.confirm('Deze kleur verwijderen?')) return;
    try {
      await db.projectColors.delete(id);
      setProjectColors(projectColors.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting color:', error);
      alert('Fout bij verwijderen kleur');
    }
  };

  const startEditColor = (color) => {
    setEditingColor(color);
    setShowAddColorModal(true);
  };

  // Font CRUD functions
  const addFont = async () => {
    if (!newFont.name || !newFont.font_family) {
      alert('Vul minimaal naam en font family in');
      return;
    }
    try {
      const fontData = {
        project_id: parseInt(projectId),
        name: newFont.name,
        font_type: newFont.font_type,
        font_family: newFont.font_family,
        font_url: newFont.font_url || null,
        example_text: newFont.example_text || null,
        position: projectFonts.length
      };
      const created = await db.projectFonts.create(fontData);
      setProjectFonts([...projectFonts, created]);
      setNewFont({ name: '', font_type: 'heading', font_family: '', font_url: '', example_text: '' });
      setShowAddFontModal(false);
    } catch (error) {
      console.error('Error adding font:', error);
      alert('Fout bij toevoegen font');
    }
  };

  const updateFont = async () => {
    if (!editingFont || !editingFont.name || !editingFont.font_family) {
      alert('Vul minimaal naam en font family in');
      return;
    }
    try {
      const updates = {
        name: editingFont.name,
        font_type: editingFont.font_type,
        font_family: editingFont.font_family,
        font_url: editingFont.font_url || null,
        example_text: editingFont.example_text || null
      };
      await db.projectFonts.update(editingFont.id, updates);
      setProjectFonts(projectFonts.map(f => f.id === editingFont.id ? { ...editingFont, ...updates } : f));
      setEditingFont(null);
      setShowAddFontModal(false);
    } catch (error) {
      console.error('Error updating font:', error);
      alert('Fout bij updaten font');
    }
  };

  const deleteFont = async (id) => {
    if (!window.confirm('Dit font verwijderen?')) return;
    try {
      await db.projectFonts.delete(id);
      setProjectFonts(projectFonts.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error deleting font:', error);
      alert('Fout bij verwijderen font');
    }
  };

  const startEditFont = (font) => {
    setEditingFont(font);
    setShowAddFontModal(true);
  };

  const resetColorForm = () => {
    setNewColor({ hex: '#000000', name: '' });
    setEditingColor(null);
    setShowAddColorModal(false);
  };

  const resetFontForm = () => {
    setNewFont({ name: '', font_type: 'heading', font_family: '', font_url: '', example_text: '' });
    setEditingFont(null);
    setShowAddFontModal(false);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load project from Supabase
        const rows = await db.projects.getAll();
        const row = rows.find(r => Number(r.id) === parseInt(projectId));
        
        if (row) {
          const tags = row.tags || [];
          const team = tags.filter(t => String(t).startsWith('team:')).map(t => t.slice(5));
          const foundProject = {
            id: row.id,
            name: row.name,
            client: row.client,
            status: row.status,
            description: row.description || '',
            logo: row.logo || '',
            url: row.url || ''
          };
          setProject(foundProject);
          
          // Load tiles for this project
          const tilesData = await db.projectTiles.getByProject(projectId);
          setTiles(tilesData);
          
          // Load tasks for this project
          const tasksData = await db.projectTasks.getByProject(projectId);
          setTasks(tasksData || []);

          // Load colors for this project
          const colorsData = await db.projectColors.getByProject(projectId);
          setProjectColors(colorsData);

          // Load fonts for this project
          const fontsData = await db.projectFonts.getByProject(projectId);
          setProjectFonts(fontsData);
        }
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    
    // Listen for task updates from chatbot
    const handleTaskUpdate = async (event) => {
      if (event.detail.projectId === parseInt(projectId)) {
        // Reload tasks for this project
        try {
          const tasksData = await db.projectTasks.getByProject(projectId);
          setTasks(tasksData || []);
        } catch (error) {
          console.error('Error reloading tasks:', error);
        }
      }
    };
    
    window.addEventListener('taskUpdated', handleTaskUpdate);
    
    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
    };
  }, [projectId]);

  const addTile = async () => {
    if (!newTile.title || !newTile.url) return;
    try {
      const tile = {
        project_id: parseInt(projectId),
        title: newTile.title,
        description: newTile.description,
        url: newTile.url,
        image_url: newTile.image_url,
        is_external: newTile.is_external,
        order_index: tiles.length
      };
      const created = await db.projectTiles.create(tile);
      setTiles([...tiles, created]);
      resetTileForm();
    } catch (error) {
      console.error('Error adding tile:', error);
      alert('Fout bij toevoegen tile');
    }
  };

  const updateTile = async () => {
    if (!editingTile || !editingTile.title || !editingTile.url) return;
    try {
      const updates = {
        title: editingTile.title,
        description: editingTile.description,
        url: editingTile.url,
        image_url: editingTile.image_url,
        is_external: editingTile.is_external
      };
      await db.projectTiles.update(editingTile.id, updates);
      setTiles(tiles.map(t => t.id === editingTile.id ? { ...editingTile, ...updates } : t));
      resetTileForm();
    } catch (error) {
      console.error('Error updating tile:', error);
      alert('Fout bij updaten tile');
    }
  };

  const deleteTile = async (id) => {
    if (!window.confirm('Deze tile verwijderen?')) return;
    try {
      await db.projectTiles.delete(id);
      setTiles(tiles.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting tile:', error);
      alert('Fout bij verwijderen tile');
    }
  };

  const resetTileForm = () => {
    setShowAddTileModal(false);
    setEditingTile(null);
    setNewTile({
      title: '',
      description: '',
      url: '',
      image_url: '',
      is_external: false
    });
  };

  const startEditTile = (tile) => {
    setEditingTile(tile);
    setShowAddTileModal(true);
  };

  // Kanban functions
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    if (!draggedTask) return;

    try {
      await db.projectTasks.update(draggedTask.id, { status: targetStatus });
      setTasks(tasks.map(t => 
        t.id === draggedTask.id ? { ...t, status: targetStatus } : t
      ));
      setDraggedTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Fout bij verplaatsen taak');
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Deze taak verwijderen?')) return;
    try {
      await db.projectTasks.delete(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Fout bij verwijderen taak');
    }
  };
  
  const addTask = async (status) => {
    if (!newTaskTitle.trim()) return;
    
    try {
      const maxPosition = tasks.length > 0 ? Math.max(...tasks.map(t => t.position || 0)) : 0;
      const newTask = {
        title: newTaskTitle.trim(),
        status: status,
        position: maxPosition + 1,
        due_date: newTaskDueDate || null,
        task_type: newTaskType || 'task'
      };
      
      // Only add project_id if we have a projectId (not "No Client")
      if (projectId && projectId !== 'no-client') {
        newTask.project_id = parseInt(projectId);
      }
      
      const createdTask = await db.projectTasks.create(newTask);
      setTasks([...tasks, createdTask]);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setNewTaskType('task');
      setAddingTaskToColumn(null);
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Fout bij toevoegen taak');
    }
  };

  const kanbanColumns = [
    { id: 'to_start', label: 'To Start', icon: Circle, color: 'from-gray-500 to-gray-600' },
    { id: 'in_progress', label: 'In Progress', icon: Circle, color: 'from-blue-500 to-cyan-500' },
    { id: 'done', label: 'Done', icon: CheckCircle, color: 'from-green-500 to-emerald-500' }
  ];

  const handleBack = () => {
    setSelectedProject(null);
    setActiveTab('projecten');
  };

  const formatLocalDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getTasksForDate = (date) => {
    if (!date) return [];
    const dateStr = formatLocalDate(date);
    return tasks.filter(task => task.due_date === dateStr);
  };

  const getDaysInMonth = () => {
    const year = currentAgendaDate.getFullYear();
    const month = currentAgendaDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const renderProjectAgenda = () => {
    const dayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
    const days = getDaysInMonth();

    return (
      <div>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {dayNames.map(day => (
            <div key={day} className="text-center text-white/60 font-medium text-sm py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((date, index) => {
            const dayTasks = date ? getTasksForDate(date) : [];
            const isToday = date && date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`min-h-24 p-2 rounded-lg border-2 ${
                  date ? 'bg-white/5 border-white/10'
                    : 'border-transparent'
                } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                onClick={() => {
                  if (!date) return;
                  setEditingTask(null);
                  setModalTask({ title: '', due_date: formatLocalDate(date), status: 'to_start', task_type: 'task' });
                  setShowTaskModal(true);
                }}
              >
                {date && (
                  <>
                    <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-400' : 'text-white/80'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map(task => {
                        const TaskIcon = task.task_type === 'social_post' ? Instagram : CheckSquare;
                        return (
                          <div
                            key={task.id}
                            className="text-xs rounded px-2 py-1.5 truncate flex items-center space-x-1 bg-white/5 hover:bg-white/10 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTask(task);
                              setModalTask({
                                title: task.title || '',
                                due_date: task.due_date || '',
                                status: task.status || 'to_start',
                                task_type: task.task_type || 'task'
                              });
                              setShowTaskModal(true);
                            }}
                          >
                            <TaskIcon className="w-3 h-3 text-white/60 flex-shrink-0" />
                            <span className="text-white flex-1 truncate">{task.title}</span>
                            {task.status === 'done' && (
                              <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                      {dayTasks.length > 2 && (
                        <div className="text-xs text-white/60">
                          +{dayTasks.length - 2} meer
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

    );
  };

  const saveModalTask = async () => {
    if (!modalTask.title.trim()) return;
    try {
      if (editingTask) {
        const updates = {
          title: modalTask.title.trim(),
          due_date: modalTask.due_date || null,
          status: modalTask.status,
          task_type: modalTask.task_type || 'task'
        };
        await db.projectTasks.update(editingTask.id, updates);
        setTasks(tasks.map(t => (t.id === editingTask.id ? { ...t, ...updates } : t)));
      } else {
        const maxPosition = tasks.length > 0 ? Math.max(...tasks.map(t => t.position || 0)) : 0;
        const taskData = {
          title: modalTask.title.trim(),
          status: modalTask.status || 'to_start',
          position: maxPosition + 1,
          due_date: modalTask.due_date || null,
          task_type: modalTask.task_type || 'task'
        };
        
        // Only add project_id if we have a projectId (not "No Client")
        if (projectId && projectId !== 'no-client') {
          taskData.project_id = parseInt(projectId);
        }
        
        const created = await db.projectTasks.create(taskData);
        setTasks([...tasks, created]);
      }
      setShowTaskModal(false);
      setEditingTask(null);
      setModalTask({ title: '', due_date: '', status: 'to_start', task_type: 'task' });
    } catch (e) {
      console.error('Error saving task from modal:', e);
      alert('Fout bij opslaan taak');
    }
  };

  const deleteModalTask = async () => {
    if (!editingTask) return;
    if (!window.confirm('Deze taak verwijderen?')) return;
    try {
      await db.projectTasks.delete(editingTask.id);
      setTasks(tasks.filter(t => t.id !== editingTask.id));
      setShowTaskModal(false);
      setEditingTask(null);
    } catch (e) {
      console.error('Error deleting task from modal:', e);
      alert('Fout bij verwijderen taak');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <button 
          onClick={handleBack}
          className="flex items-center text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Terug naar Projecten
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Project niet gevonden</h1>
          <p className="text-white/70">Het project dat je zoekt bestaat niet meer.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={handleBack}
          className="flex items-center text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Terug naar Projecten
        </button>
        
        <button
          onClick={() => {
            setEditingTile(null);
            setShowAddTileModal(true);
          }}
          className="btn-primary px-6 py-3 rounded-lg text-white font-medium flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Tile Toevoegen</span>
        </button>
      </div>

      {/* Add/Edit Task Modal for Agenda */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121325] border border-white/10 rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">
                {editingTask ? 'Taak bewerken' : 'Nieuwe taak'}
              </h3>
              <button onClick={() => { setShowTaskModal(false); setEditingTask(null); }} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Titel</label>
                <input
                  type="text"
                  value={modalTask.title}
                  onChange={(e) => setModalTask({ ...modalTask, title: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Taak titel..."
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Deadline</label>
                <input
                  type="date"
                  value={modalTask.due_date || ''}
                  onChange={(e) => setModalTask({ ...modalTask, due_date: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Status</label>
                <select
                  value={modalTask.status}
                  onChange={(e) => setModalTask({ ...modalTask, status: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="to_start">To Start</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Type</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalTask({ ...modalTask, task_type: 'task' })}
                    className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded text-sm transition-colors ${
                      modalTask.task_type === 'task' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Taak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTask({ ...modalTask, task_type: 'social_post' })}
                    className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded text-sm transition-colors ${
                      modalTask.task_type === 'social_post' ? 'bg-pink-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    <Instagram className="w-4 h-4" />
                    <span>Social Post</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 mt-6">
              {editingTask && (
                <button onClick={deleteModalTask} className="px-4 py-2 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">
                  <Trash2 className="w-4 h-4 inline mr-1" /> Verwijderen
                </button>
              )}
              <div className="flex-1" />
              <button onClick={() => { setShowTaskModal(false); setEditingTask(null); }} className="px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20">Annuleren</button>
              <button onClick={saveModalTask} className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600">Opslaan</button>
            </div>
          </div>
        </div>
      )}
      {/* Project Header */}
      <div className="gradient-card rounded-xl p-8">
        <div className="flex items-center mb-4">
          {project.logo ? (
            <img 
              src={project.logo} 
              alt={project.name}
              className="w-20 h-20 rounded-xl object-contain mr-6 bg-white p-1"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gradient-blue-purple flex items-center justify-center mr-6">
              <span className="text-white font-bold text-2xl">
                {project.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{project.name}</h1>
            <p className="text-white/70 text-lg">{project.client}</p>
          </div>
        </div>
        {project.description && (
          <p className="text-white/80 text-lg">{project.description}</p>
        )}
      </div>

      {/* Tiles Grid */}
      <div>
        <h2 className="text-white text-xl font-semibold mb-4">Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiles.map((tile) => (
            <div
              key={tile.id}
              className="gradient-card rounded-xl p-6 hover:scale-105 transition-transform cursor-pointer group relative"
            >
              <a
                href={tile.url}
                target={tile.is_external ? "_blank" : "_self"}
                rel={tile.is_external ? "noopener noreferrer" : undefined}
                className="block"
              >
                {tile.image_url ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden mb-4 bg-white/10 flex items-center justify-center">
                    <img 
                      src={tile.image_url} 
                      alt={tile.title}
                      className="w-full h-full object-contain bg-white/5"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-blue-purple flex items-center justify-center mb-4">
                    <span className="text-white font-bold text-xl">
                      {tile.title.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <h3 className="text-white font-semibold text-lg mb-2">{tile.title}</h3>
                {tile.description && (
                  <p className="text-white/70 text-sm mb-2">{tile.description}</p>
                )}
                {tile.is_external && (
                  <p className="text-white/40 text-xs flex items-center">
                    External link <ExternalLink className="w-3 h-3 ml-1" />
                  </p>
                )}
              </a>
              
              {/* Edit/Delete buttons on hover */}
              <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    startEditTile(tile);
                  }}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    deleteTile(tile.id);
                  }}
                  className="bg-red-500/20 hover:bg-red-500/30 p-2 rounded-lg text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {tiles.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-white/50 text-lg mb-4">Nog geen tiles toegevoegd</p>
              <p className="text-white/40 text-sm">Klik op "Tile Toevoegen" om te beginnen</p>
            </div>
          )}
        </div>
      </div>


      {/* Kanban Board - Project Tasks */}
      <div>
        <h2 className="text-white text-xl font-semibold mb-4">Taken</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kanbanColumns.map((column) => {
            const columnTasks = tasks.filter(t => t.status === column.id);
            const Icon = column.icon;
            
            return (
              <div
                key={column.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
                className="glass-effect rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${column.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{column.label}</h3>
                      <p className="text-white/60 text-sm">{columnTasks.length} taken</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAddingTaskToColumn(column.id)}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    title="Taak toevoegen"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {addingTaskToColumn === column.id && (
                    <div className="bg-white/5 border border-blue-400/50 rounded-lg p-3">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addTask(column.id);
                          } else if (e.key === 'Escape') {
                            setAddingTaskToColumn(null);
                            setNewTaskTitle('');
                            setNewTaskDueDate('');
                          }
                        }}
                        placeholder="Taak titel..."
                        className="w-full bg-transparent border-none text-white placeholder-white/40 focus:outline-none mb-2"
                        autoFocus
                      />
                      <input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-400 mb-2"
                        placeholder="Deadline (optioneel)"
                      />
                      <div className="flex space-x-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setNewTaskType('task')}
                          className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded text-sm transition-colors ${
                            newTaskType === 'task' 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-white/10 text-white/60 hover:bg-white/20'
                          }`}
                        >
                          <CheckSquare className="w-4 h-4" />
                          <span>Taak</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewTaskType('social_post')}
                          className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded text-sm transition-colors ${
                            newTaskType === 'social_post' 
                              ? 'bg-pink-500 text-white' 
                              : 'bg-white/10 text-white/60 hover:bg-white/20'
                          }`}
                        >
                          <Instagram className="w-4 h-4" />
                          <span>Social Post</span>
                        </button>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => addTask(column.id)}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-1.5 rounded transition-colors"
                        >
                          Toevoegen
                        </button>
                        <button
                          onClick={() => {
                            setAddingTaskToColumn(null);
                            setNewTaskTitle('');
                            setNewTaskDueDate('');
                            setNewTaskType('task');
                          }}
                          className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm py-1.5 rounded transition-colors"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 cursor-move hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {task.task_type === 'social_post' ? (
                              <Instagram className="w-4 h-4 text-pink-400" />
                            ) : (
                              <CheckSquare className="w-4 h-4 text-blue-400" />
                            )}
                            <h4 className="text-white font-medium">{task.title}</h4>
                          </div>
                          {task.description && (
                            <p className="text-white/60 text-sm mb-2">{task.description}</p>
                          )}
                          {task.due_date && (
                            <p className="text-white/40 text-xs">
                              📅 {new Date(task.due_date).toLocaleDateString('nl-NL')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <GripVertical className="w-4 h-4 text-white/40" />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-white/40 text-sm">
                      Nog geen taken
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {tasks.length === 0 && (
          <div className="text-center py-12 glass-effect rounded-xl">
            <p className="text-white/50 text-lg mb-2">Nog geen taken</p>
            <p className="text-white/40 text-sm">
              Taken die je toevoegt in de agenda verschijnen automatisch hier
            </p>
          </div>
        )}
      </div>

      {/* Project Agenda */}
      {showAgenda && (
        <div className="glass-effect rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl font-semibold flex items-center">
              <Calendar className="w-6 h-6 mr-3" />
              Project Agenda - {project.name}
            </h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentAgendaDate(new Date(currentAgendaDate.getFullYear(), currentAgendaDate.getMonth() - 1, 1))}
                className="p-2 text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-white font-medium min-w-[200px] text-center">
                {['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'][currentAgendaDate.getMonth()]} {currentAgendaDate.getFullYear()}
              </span>
              <button
                onClick={() => setCurrentAgendaDate(new Date(currentAgendaDate.getFullYear(), currentAgendaDate.getMonth() + 1, 1))}
                className="p-2 text-white/80 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          {renderProjectAgenda()}
        </div>
      )}

      {/* Colors - Dynamic per project */}
      <div className="glass-effect rounded-xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Colors</h2>
          <button
            onClick={() => setShowAddColorModal(true)}
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Kleur Toevoegen</span>
          </button>
        </div>
        {projectColors.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            <p>Nog geen kleuren toegevoegd</p>
            <p className="text-xs mt-1">Klik op "Kleur Toevoegen" om te beginnen</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {projectColors.map((color) => (
              <div
                key={color.id}
                className="group relative flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2"
              >
                <div
                  className="w-8 h-8 rounded-md border border-white/10 shrink-0 cursor-pointer"
                  style={{ backgroundColor: color.hex }}
                  onClick={() => handleCopyColor(color.hex)}
                  title="Klik om HEX te kopiëren"
                />
                <div className="text-[11px] leading-tight text-white/70 space-y-0.5 flex-1">
                  {color.name && (
                    <div className="font-semibold text-white text-xs mb-1">{color.name}</div>
                  )}
                  <div>
                    <span className="font-semibold text-white mr-1">HEX</span>
                    <span className="font-mono">{color.hex}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white mr-1">RGB</span>
                    <span className="font-mono text-white/60">{color.rgb}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white mr-1">CMYK</span>
                    <span className="font-mono text-white/60">{color.cmyk}</span>
                  </div>
                </div>
                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditColor(color)}
                    className="p-1 bg-white/10 hover:bg-white/20 rounded text-white"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteColor(color.id)}
                    className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fonts - Dynamic per project */}
      <div className="glass-effect rounded-xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Fonts</h2>
          <button
            onClick={() => setShowAddFontModal(true)}
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Font Toevoegen</span>
          </button>
        </div>
        {projectFonts.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            <p>Nog geen fonts toegevoegd</p>
            <p className="text-xs mt-1">Klik op "Font Toevoegen" om te beginnen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {projectFonts.map((font) => (
              <div key={font.id} className="group relative rounded-lg border border-white/10 px-4 py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wide text-white/40">{font.font_type}</span>
                    <div className="text-sm font-semibold text-white">{font.name}</div>
                  </div>
                  {font.font_url && (
                    <a
                      href={font.font_url}
                      download
                      className="p-1.5 rounded-md border border-white/20 hover:border-blue-400/60 hover:bg-white/5 transition-colors"
                      title="Download font"
                    >
                      <Download className="w-3 h-3 text-white/60 hover:text-white" />
                    </a>
                  )}
                </div>
                <div className="mt-1 text-white/80" style={{ fontFamily: font.font_family }}>
                  {font.example_text || 'The quick brown fox jumps over the lazy dog'}
                </div>
                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditFont(font)}
                    className="p-1 bg-white/10 hover:bg-white/20 rounded text-white"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteFont(font.id)}
                    className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Email Integration Section */}
      <div className="space-y-6">
        <ProjectEmailFilters projectId={projectId} />
        <ProjectEmailList projectId={projectId} />
      </div>

      {/* Add/Edit Color Modal */}
      {showAddColorModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">
                {editingColor ? 'Kleur Bewerken' : 'Kleur Toevoegen'}
              </h2>
              <button onClick={resetColorForm} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Naam (optioneel)</label>
                <input
                  type="text"
                  value={editingColor ? editingColor.name : newColor.name}
                  onChange={(e) => editingColor 
                    ? setEditingColor({...editingColor, name: e.target.value})
                    : setNewColor({...newColor, name: e.target.value})
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Bijv. Primary Blue"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">HEX Kleur *</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={editingColor ? editingColor.hex : newColor.hex}
                    onChange={(e) => editingColor 
                      ? setEditingColor({...editingColor, hex: e.target.value})
                      : setNewColor({...newColor, hex: e.target.value})
                    }
                    className="w-16 h-12 rounded-lg border border-white/20 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingColor ? editingColor.hex : newColor.hex}
                    onChange={(e) => editingColor 
                      ? setEditingColor({...editingColor, hex: e.target.value})
                      : setNewColor({...newColor, hex: e.target.value})
                    }
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-mono focus:outline-none focus:border-blue-400"
                    placeholder="#59BAFF"
                  />
                </div>
                <p className="text-white/50 text-xs mt-2">
                  RGB en CMYK worden automatisch berekend
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <div className="text-sm">
                  <span className="text-white/70 font-semibold">RGB:</span>
                  <span className="text-white ml-2 font-mono">
                    {hexToRgbString(editingColor ? editingColor.hex : newColor.hex)}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-white/70 font-semibold">CMYK:</span>
                  <span className="text-white ml-2 font-mono">
                    {hexToCmykString(editingColor ? editingColor.hex : newColor.hex)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button 
                onClick={editingColor ? updateColor : addColor}
                className="btn-primary px-6 py-2 rounded-lg text-white font-medium flex-1"
              >
                {editingColor ? 'Opslaan' : 'Toevoegen'}
              </button>
              <button 
                onClick={resetColorForm}
                className="glass-effect px-6 py-2 rounded-lg text-white font-medium flex-1"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Font Modal */}
      {showAddFontModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">
                {editingFont ? 'Font Bewerken' : 'Font Toevoegen'}
              </h2>
              <button onClick={resetFontForm} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Naam *</label>
                <input
                  type="text"
                  value={editingFont ? editingFont.name : newFont.name}
                  onChange={(e) => editingFont 
                    ? setEditingFont({...editingFont, name: e.target.value})
                    : setNewFont({...newFont, name: e.target.value})
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Bijv. Acherus"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Type *</label>
                <select
                  value={editingFont ? editingFont.font_type : newFont.font_type}
                  onChange={(e) => editingFont 
                    ? setEditingFont({...editingFont, font_type: e.target.value})
                    : setNewFont({...newFont, font_type: e.target.value})
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="heading">Heading</option>
                  <option value="body">Body</option>
                  <option value="accent">Accent</option>
                </select>
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Font Family *</label>
                <input
                  type="text"
                  value={editingFont ? editingFont.font_family : newFont.font_family}
                  onChange={(e) => editingFont 
                    ? setEditingFont({...editingFont, font_family: e.target.value})
                    : setNewFont({...newFont, font_family: e.target.value})
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Acherus, sans-serif"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Font URL (optioneel)</label>
                <input
                  type="text"
                  value={editingFont ? editingFont.font_url : newFont.font_url}
                  onChange={(e) => editingFont 
                    ? setEditingFont({...editingFont, font_url: e.target.value})
                    : setNewFont({...newFont, font_url: e.target.value})
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="https://example.com/font.zip"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Voorbeeld Tekst (optioneel)</label>
                <input
                  type="text"
                  value={editingFont ? editingFont.example_text : newFont.example_text}
                  onChange={(e) => editingFont 
                    ? setEditingFont({...editingFont, example_text: e.target.value})
                    : setNewFont({...newFont, example_text: e.target.value})
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Project Heading Voorbeeld"
                />
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button 
                onClick={editingFont ? updateFont : addFont}
                className="btn-primary px-6 py-2 rounded-lg text-white font-medium flex-1"
              >
                {editingFont ? 'Opslaan' : 'Toevoegen'}
              </button>
              <button 
                onClick={resetFontForm}
                className="glass-effect px-6 py-2 rounded-lg text-white font-medium flex-1"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Toast Notification */}
      {copyToast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {copyToast}
        </div>
      )}
      {/* Add/Edit Tile Modal */}
      {showAddTileModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">
                {editingTile ? 'Tile Bewerken' : 'Tile Toevoegen'}
              </h2>
              <button 
                onClick={resetTileForm}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Titel *</label>
                <input
                  type="text"
                  value={editingTile ? editingTile.title : newTile.title}
                  onChange={(e) => editingTile 
                    ? setEditingTile({...editingTile, title: e.target.value})
                    : setNewTile({...newTile, title: e.target.value})
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Canva, Figma, etc."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Beschrijving</label>
                <input
                  type="text"
                  value={editingTile ? editingTile.description : newTile.description}
                  onChange={(e) => editingTile 
                    ? setEditingTile({...editingTile, description: e.target.value})
                    : setNewTile({...newTile, description: e.target.value})
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Design platform for graphics"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">URL *</label>
                <input
                  type="url"
                  value={editingTile ? editingTile.url : newTile.url}
                  onChange={(e) => editingTile 
                    ? setEditingTile({...editingTile, url: e.target.value})
                    : setNewTile({...newTile, url: e.target.value})
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="https://canva.com"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Afbeelding URL</label>
                <input
                  type="url"
                  value={editingTile ? editingTile.image_url : newTile.image_url}
                  onChange={(e) => editingTile 
                    ? setEditingTile({...editingTile, image_url: e.target.value})
                    : setNewTile({...newTile, image_url: e.target.value})
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_external"
                  checked={editingTile ? editingTile.is_external : newTile.is_external}
                  onChange={(e) => editingTile 
                    ? setEditingTile({...editingTile, is_external: e.target.checked})
                    : setNewTile({...newTile, is_external: e.target.checked})
                  }
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="is_external" className="ml-2 text-white/70 text-sm">
                  Externe link (opent in nieuw tabblad)
                </label>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button 
                onClick={editingTile ? updateTile : addTile}
                className="btn-primary px-6 py-2 rounded-lg text-white font-medium flex-1"
              >
                {editingTile ? 'Opslaan' : 'Toevoegen'}
              </button>
              <button 
                onClick={resetTileForm}
                className="glass-effect px-6 py-2 rounded-lg text-white font-medium flex-1"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailPage;
