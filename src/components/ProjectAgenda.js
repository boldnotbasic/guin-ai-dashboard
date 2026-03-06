import React, { useState, useEffect } from 'react';
import { Calendar, Plus, X, ChevronLeft, ChevronRight, Pencil, Trash2, Check, CheckSquare, Instagram } from 'lucide-react';
import { db } from '../utils/supabaseClient';

const ProjectAgenda = ({ setActiveTab, setSelectedProject }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    project_id: '',
    due_date: '',
    task_type: 'task'
  });

  const formatLocalDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  const navigateToProject = (projectId) => {
    if (projectId && setActiveTab && setSelectedProject) {
      setSelectedProject(projectId);
      setActiveTab('projecten');
    }
  };

  useEffect(() => {
    loadProjects();
    loadTasks();
  }, [currentDate]);

  const loadProjects = async () => {
    try {
      const data = await db.projects.getAll();
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const data = await db.projectTasks.getByDateRange(
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
      );
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const addTask = async () => {
    if (!newTask.title || !newTask.due_date) {
      alert('Vul titel en deadline in');
      return;
    }

    try {
      if (editingTask) {
        // Update existing task
        await db.projectTasks.update(editingTask.id, newTask);
      } else {
        // Create new task
        const taskData = {
          title: newTask.title,
          description: newTask.description || '',
          due_date: newTask.due_date,
          task_type: newTask.task_type || 'task',
          status: 'to_start',
          position: 0
        };
        
        // Only add project_id if it exists and is not empty
        if (newTask.project_id && newTask.project_id !== '' && newTask.project_id !== 'no-client') {
          taskData.project_id = parseInt(newTask.project_id);
        }
        
        await db.projectTasks.create(taskData);
      }
      
      setNewTask({ title: '', description: '', project_id: '', due_date: '', task_type: 'task' });
      setEditingTask(null);
      setShowAddModal(false);
      loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Fout bij opslaan taak');
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Deze taak verwijderen?')) return;
    try {
      await db.projectTasks.delete(taskId);
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Fout bij verwijderen taak');
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      project_id: task.project_id,
      due_date: task.due_date,
      task_type: task.task_type || 'task'
    });
    setShowAddModal(true);
  };

  const openAddModal = (date) => {
    setSelectedDate(date);
    setEditingTask(null);
    setNewTask({
      title: '',
      description: '',
      project_id: '',
      due_date: formatLocalDate(date),
      task_type: 'task'
    });
    setShowAddModal(true);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Make Monday the first day of the week (Mon=0 ... Sun=6)
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days = [];
    
    // Previous month days (fillers before the 1st, based on Monday-start)
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getTasksForDate = (date) => {
    if (!date) return [];
    // Format date as YYYY-MM-DD in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return tasks.filter(task => task.due_date === dateStr);
  };

  const getProjectForTask = (task) => {
    return projects.find(p => p.id === task.project_id);
  };

  const getClientInitials = (clientName) => {
    if (!clientName) return '?';
    return clientName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const openDayModal = (date) => {
    const dayTasks = getTasksForDate(date);
    setSelectedDayTasks(dayTasks);
    setSelectedDate(date);
    setShowDayModal(true);
  };

  const getProjectColor = (project) => {
    if (!project) return 'from-gray-500 to-gray-600';
    return project.iconColor || 'from-blue-500 to-purple-600';
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
  // Week starts on Monday
  const dayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <Calendar className="w-6 h-6 mr-3" />
          Project Agenda
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={prevMonth}
            className="p-2 text-white/80 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-medium min-w-[200px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 text-white/80 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-effect rounded-xl p-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {dayNames.map(day => (
            <div key={day} className="text-center text-white/60 font-medium text-sm py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {getDaysInMonth().map((date, index) => {
            const dayTasks = date ? getTasksForDate(date) : [];
            const isToday = date && date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`min-h-24 p-2 rounded-lg border-2 cursor-pointer hover:bg-white/5 transition-colors ${
                  date ? 'bg-white/5 border-white/10'
                    : 'border-transparent'
                } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                onClick={() => {
                  if (date) {
                    const dayTasks = getTasksForDate(date);
                    if (dayTasks.length > 0) {
                      openDayModal(date);
                    } else {
                      openAddModal(date);
                    }
                  }
                }}
              >
                {date && (
                  <>
                    <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-400' : 'text-white/80'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map(task => {
                        const project = getProjectForTask(task);
                        const initials = project ? getClientInitials(project.client || project.name) : '?';
                        const colorClass = getProjectColor(project);
                        const TaskIcon = task.task_type === 'social_post' ? Instagram : CheckSquare;
                        
                        return (
                          <div
                            key={task.id}
                            className="text-xs rounded px-2 py-1.5 truncate group/task relative flex items-center space-x-2 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToProject(task.project_id);
                            }}
                          >
                            {project?.logo ? (
                              <div 
                                className="w-6 h-6 rounded overflow-hidden flex-shrink-0"
                                style={{ backgroundColor: project.logo_bg_color || '#FFFFFF' }}
                              >
                                <img 
                                  src={project.logo} 
                                  alt={project.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                              </div>
                            ) : null}
                            <div 
                              className={`w-6 h-6 rounded bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0`}
                              style={{ display: project?.logo ? 'none' : 'flex' }}
                            >
                              {initials}
                            </div>
                            <TaskIcon className="w-3 h-3 flex-shrink-0" style={{ color: task.task_type === 'social_post' ? '#ec4899' : '#60a5fa' }} />
                            <span className="text-white flex-1 truncate">{task.title}</span>
                            {task.status === 'done' && (
                              <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            )}
                            <div className="flex space-x-1 opacity-0 group-hover/task:opacity-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(task);
                                }}
                                className="bg-blue-500/80 hover:bg-blue-500 text-white rounded p-0.5"
                                title="Bewerken"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTask(task.id);
                                }}
                                className="bg-red-500/80 hover:bg-red-500 text-white rounded p-0.5"
                                title="Verwijderen"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
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

      {/* Day Tasks Modal */}
      {showDayModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl font-semibold">
                Taken op {selectedDate?.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setShowDayModal(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedDayTasks.map(task => {
                const project = getProjectForTask(task);
                const initials = project ? getClientInitials(project.client || project.name) : '?';
                const colorClass = getProjectColor(project);
                const TaskIcon = task.task_type === 'social_post' ? Instagram : CheckSquare;
                
                return (
                  <div
                    key={task.id}
                    className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors cursor-pointer"
                    onClick={() => navigateToProject(task.project_id)}
                  >
                    <div className="flex items-start space-x-3">
                      {project?.logo ? (
                        <div 
                          className="w-10 h-10 rounded overflow-hidden flex-shrink-0"
                          style={{ backgroundColor: project.logo_bg_color || '#FFFFFF' }}
                        >
                          <img 
                            src={project.logo} 
                            alt={project.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        </div>
                      ) : null}
                      <div 
                        className={`w-10 h-10 rounded bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                        style={{ display: project?.logo ? 'none' : 'flex' }}
                      >
                        {initials}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-white font-semibold flex items-center space-x-2">
                              <TaskIcon className="w-4 h-4" style={{ color: task.task_type === 'social_post' ? '#ec4899' : '#60a5fa' }} />
                              <span>{task.title}</span>
                              {task.status === 'done' && <Check className="w-4 h-4 text-green-400" />}
                            </h4>
                            <p className="text-white/60 text-sm">{project?.name} - {project?.client}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setShowDayModal(false);
                                openEditModal(task);
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                deleteTask(task.id);
                                setSelectedDayTasks(selectedDayTasks.filter(t => t.id !== task.id));
                              }}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-white/70 text-sm">{task.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDayModal(false);
                  openAddModal(selectedDate);
                }}
                className="btn-primary px-4 py-2 rounded-lg text-white flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Taak Toevoegen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl font-semibold">
                {editingTask ? 'Taak Bewerken' : 'Taak Toevoegen'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewTask({ title: '', description: '', project_id: '', due_date: '' });
                }}
                className="text-white/70 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">Project</label>
                <select
                  value={newTask.project_id}
                  onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="">Selecteer project</option>
                  <option value="no_client">No Client</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} - {project.client}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Titel</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                  placeholder="Bijv. Homepage design maken"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Omschrijving</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400 min-h-[100px]"
                  placeholder="Beschrijf de taak..."
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Deadline</label>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Type</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setNewTask({ ...newTask, task_type: 'task' })}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm transition-colors ${
                      newTask.task_type === 'task' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>Taak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTask({ ...newTask, task_type: 'social_post' })}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm transition-colors ${
                      newTask.task_type === 'social_post' 
                        ? 'bg-pink-500 text-white' 
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    <Instagram className="w-4 h-4" />
                    <span>Social Post</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={addTask}
                className="btn-primary px-6 py-2 rounded-lg text-white font-medium flex-1"
              >
                {editingTask ? 'Opslaan' : 'Toevoegen'}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTask(null);
                  setNewTask({ title: '', description: '', project_id: '', due_date: '', task_type: 'task' });
                }}
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

export default ProjectAgenda;
