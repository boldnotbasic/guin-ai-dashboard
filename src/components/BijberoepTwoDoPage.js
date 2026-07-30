import React, { useState, useEffect } from 'react';
import { Plus, Circle, CheckCircle, Trash2, GripVertical, Edit, Briefcase } from 'lucide-react';
import { db } from '../utils/supabaseClient';

const BijberoepTwoDoPage = () => {
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    status: 'to_start',
    project_id: null,
    task_type: 'task'
  });
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [dragOverTicket, setDragOverTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ticketsData, projectsData] = await Promise.all([
        db.projectTasks.getAll(),
        db.projects.getAll()
      ]);
      setTickets(ticketsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTicket = async () => {
    if (!newTicket.title.trim()) return;
    
    try {
      if (editingTicket) {
        const updates = {
          title: newTicket.title,
          notes: newTicket.description,
          status: newTicket.status,
          project_id: newTicket.project_id || null,
          task_type: newTicket.task_type || 'task'
        };
        await db.projectTasks.update(editingTicket.id, updates);
        setTickets(tickets.map(t => t.id === editingTicket.id ? { ...t, ...updates } : t));
      } else {
        const maxPosition = tickets.length > 0 ? Math.max(...tickets.map(t => t.position || 0)) : 0;
        const ticket = {
          title: newTicket.title,
          notes: newTicket.description,
          status: newTicket.status,
          project_id: newTicket.project_id || null,
          task_type: newTicket.task_type || 'task',
          position: maxPosition + 1
        };
        const newTicketData = await db.projectTasks.create(ticket);
        setTickets([...tickets, newTicketData]);
      }
      
      setNewTicket({ title: '', description: '', status: 'to_start', project_id: null, task_type: 'task' });
      setEditingTicket(null);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error saving ticket:', error);
      alert('Fout bij opslaan ticket');
    }
  };

  const startEdit = (ticket) => {
    setEditingTicket(ticket);
    setNewTicket({
      title: ticket.title,
      description: ticket.notes || '',
      status: ticket.status,
      project_id: ticket.project_id || null,
      task_type: ticket.task_type || 'task'
    });
    setShowAddModal(true);
  };

  const openAddModalForColumn = (columnId) => {
    setNewTicket({ title: '', description: '', status: columnId, project_id: null, task_type: 'task' });
    setEditingTicket(null);
    setShowAddModal(true);
  };

  const deleteTicket = async (id) => {
    if (!window.confirm('Dit ticket verwijderen?')) return;
    try {
      await db.projectTasks.delete(id);
      setTickets(tickets.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Fout bij verwijderen ticket');
    }
  };

  const handleDragStart = (e, ticket) => {
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedTicket(null);
    setDragOverTicket(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTicketDragOver = (e, ticket) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTicket && draggedTicket.id !== ticket.id) {
      setDragOverTicket(ticket);
    }
  };

  const handleTicketDragLeave = (e) => {
    e.preventDefault();
    setDragOverTicket(null);
  };

  const handleDrop = async (e, targetColumn, targetTicket = null) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTicket) return;

    try {
      if (targetTicket && draggedTicket.status === targetTicket.status && draggedTicket.id !== targetTicket.id) {
        console.log('🔄 Reordering:', draggedTicket.title, '→', targetTicket.title);
        await reorderTickets(draggedTicket, targetTicket);
      } else if (!targetTicket || draggedTicket.status !== targetColumn) {
        console.log('📦 Moving to column:', targetColumn);
        await db.projectTasks.update(draggedTicket.id, { status: targetColumn });
        setTickets(tickets.map(t => 
          t.id === draggedTicket.id ? { ...t, status: targetColumn } : t
        ));
      }
      setDraggedTicket(null);
      setDragOverTicket(null);
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('Fout bij verplaatsen ticket');
    }
  };

  const reorderTickets = async (draggedTicket, targetTicket) => {
    const columnTickets = tickets.filter(t => t.status === draggedTicket.status);
    const otherTickets = tickets.filter(t => t.status !== draggedTicket.status);
    
    const draggedIndex = columnTickets.findIndex(t => t.id === draggedTicket.id);
    const targetIndex = columnTickets.findIndex(t => t.id === targetTicket.id);
    
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;
    
    console.log('Reordering from index', draggedIndex, 'to', targetIndex);
    
    const reorderedColumn = [...columnTickets];
    const [removed] = reorderedColumn.splice(draggedIndex, 1);
    reorderedColumn.splice(targetIndex, 0, removed);
    
    const newTickets = [...otherTickets, ...reorderedColumn];
    
    setTickets(newTickets);
  };

  const cleanupOldDoneTickets = async () => {
    try {
      const doneTickets = tickets.filter(t => t.status === 'done');
      if (doneTickets.length > 10) {
        const ticketsToKeep = doneTickets.slice(-10);
        const ticketsToDelete = doneTickets.slice(0, -10);
        
        console.log(`Keeping last ${ticketsToKeep.length} done tickets, deleting ${ticketsToDelete.length}`);
        
        for (const ticket of ticketsToDelete) {
          await db.projectTasks.delete(ticket.id);
        }
        
        setTickets(tickets.filter(t => !ticketsToDelete.some(dt => dt.id === t.id)));
        
        console.log(`Cleaned up ${ticketsToDelete.length} old done tickets`);
      }
    } catch (error) {
      console.error('Error cleaning up old tickets:', error);
    }
  };

  const getProjectName = (ticket) => {
    if (!ticket.project_id) return null;
    const project = ticket.projects || projects.find(p => p.id === ticket.project_id);
    if (!project) return null;
    return project.client ? `${project.client} - ${project.name}` : project.name;
  };

  const columns = [
    { id: 'to_start', label: 'To Start', icon: Circle, color: 'from-gray-500 to-gray-600' },
    { id: 'in_progress', label: 'In Progress', icon: Circle, color: 'from-blue-500 to-cyan-500' },
    { id: 'done', label: 'Done', icon: CheckCircle, color: 'from-green-500 to-emerald-500' }
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-3xl font-bold mb-2">Bijberoep 2DO Board</h1>
          <p className="text-white/60">Organiseer je zakelijke taken met drag & drop</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={cleanupOldDoneTickets}
            className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg flex items-center space-x-2 transition-colors"
            title="Behoud laatste 10 done tickets"
          >
            <Trash2 className="w-4 h-4" />
            <span>Opschonen</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nieuw Ticket</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => {
          const columnTickets = tickets.filter(t => t.status === column.id);
          const Icon = column.icon;
          
          return (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              onClick={(e) => {
                const isTicket = e.target.closest('.ticket-card');
                const isButton = e.target.closest('button');
                const isInput = e.target.closest('input');
                if (!isTicket && !isButton && !isInput) {
                  openAddModalForColumn(column.id);
                }
              }}
              className="gradient-card rounded-xl p-4 min-h-[500px] cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${column.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold">{column.label}</h2>
                    <p className="text-white/60 text-xs">{columnTickets.length} tickets</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openAddModalForColumn(column.id);
                  }}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  title="Nieuw ticket toevoegen"
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="space-y-3 min-h-[400px] relative">
                {columnTickets.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-white/40 cursor-pointer hover:text-white/60 transition-colors">
                    <Plus className="w-12 h-12 mb-2" />
                    <p className="text-sm">Klik om ticket toe te voegen</p>
                  </div>
                )}
                {columnTickets.map((ticket) => {
                  const projectName = getProjectName(ticket);
                  
                  return (
                    <div
                      key={ticket.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, ticket)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleTicketDragOver(e, ticket)}
                      onDragLeave={handleTicketDragLeave}
                      onDrop={(e) => handleDrop(e, column.id, ticket)}
                      className={`ticket-card glass-effect rounded-lg p-4 cursor-move hover:bg-white/20 transition-all group border-2 ${
                        dragOverTicket?.id === ticket.id 
                          ? 'border-blue-400 bg-blue-500/20 scale-105' 
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <GripVertical className="w-4 h-4 text-white/40" />
                          {column.id === 'done' ? (
                            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-white/40 flex-shrink-0" />
                          )}
                          <h3 className="text-white font-medium">{ticket.title}</h3>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(ticket)}
                            className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTicket(ticket.id)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {projectName && (
                        <div className="flex items-center space-x-1 ml-11 mb-2">
                          <Briefcase className="w-3 h-3 text-purple-400" />
                          <span className="text-xs text-purple-400">{projectName}</span>
                        </div>
                      )}
                      
                      {ticket.notes && (
                        <p className="text-white/60 text-sm ml-11">{ticket.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Ticket Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="gradient-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white text-xl font-semibold mb-4">{editingTicket ? 'Ticket Bewerken' : 'Nieuw Ticket'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Titel</label>
                <input
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                  placeholder="Bijv. Website redesign"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Beschrijving (optioneel)</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2 min-h-[80px]"
                  placeholder="Extra details..."
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Project (optioneel)</label>
                <select
                  value={newTicket.project_id || ''}
                  onChange={(e) => setNewTicket({...newTicket, project_id: e.target.value || null})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                >
                  <option value="">Geen project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.client ? `${project.client} - ${project.name}` : project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Kolom</label>
                <select
                  value={newTicket.status}
                  onChange={(e) => setNewTicket({...newTicket, status: e.target.value})}
                  className="w-full input-plain rounded-lg px-3 py-2"
                >
                  <option value="to_start">To Start</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setNewTicket({ title: '', description: '', status: 'to_start', project_id: null, task_type: 'task' });
                  setEditingTicket(null);
                }}
                className="glass-effect px-4 py-2 rounded-lg text-white"
              >
                Annuleren
              </button>
              <button onClick={addTicket} className="btn-primary px-4 py-2 rounded-lg">
                {editingTicket ? 'Bijwerken' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BijberoepTwoDoPage;
