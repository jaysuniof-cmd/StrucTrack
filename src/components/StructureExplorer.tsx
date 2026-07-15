import React, { useMemo, useState, useEffect } from 'react';
import { Project, Ticket } from '../types';
import { Layers, Plus, ChevronRight, CheckCircle2, Clock, AlertCircle, HelpCircle, Pencil, Trash2, Check, X } from 'lucide-react';

interface StructureExplorerProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onQuickAddTicket: (level: string, component: string) => void;
  project: Project;
  onUpdateProject: (
    updatedProject: Project,
    levelRename?: { oldName: string; newName: string },
    levelDelete?: string,
    componentRename?: { oldName: string; newName: string; levelName?: string },
    componentDelete?: string,
    componentDeleteLevelName?: string
  ) => void;
  isAllowedToCustomize: boolean;
}

export default function StructureExplorer({
  tickets,
  onTicketClick,
  onQuickAddTicket,
  project,
  onUpdateProject,
  isAllowedToCustomize
}: StructureExplorerProps) {
  // Read customized levels and components from project, falling back to standard presets
  const levels = useMemo(() => {
    return project.structuralLevels && project.structuralLevels.length > 0
      ? project.structuralLevels
      : ['Substructure', '1st Floor', '2nd Floor', '3rd Floor', 'Roof'];
  }, [project.structuralLevels]);

  // Selected structural level
  const [selectedLevel, setSelectedLevel] = useState<string>(() => levels[0] || 'Substructure');

  // Sync selected level if it gets deleted or project changes
  useEffect(() => {
    if (!levels.includes(selectedLevel)) {
      setSelectedLevel(levels[0] || '');
    }
  }, [levels, selectedLevel]);

  // Helper to retrieve components of a specific structural level
  const getComponentsForLevel = (lvl: string): string[] => {
    if (project.levelComponents && project.levelComponents[lvl]) {
      return project.levelComponents[lvl];
    }
    return project.structuralComponents && project.structuralComponents.length > 0
      ? project.structuralComponents
      : ['Foundations', 'Columns', 'Beams', 'Slabs', 'Walls', 'Retaining Walls'];
  };

  const components = useMemo(() => {
    return getComponentsForLevel(selectedLevel);
  }, [project.levelComponents, project.structuralComponents, selectedLevel]);

  // --- Inline Customization States ---
  const [newLevelName, setNewLevelName] = useState('');
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editingLevelName, setEditingLevelName] = useState('');

  const [newComponentName, setNewComponentName] = useState('');
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [editingComponentName, setEditingComponentName] = useState('');

  // --- Level Handlers ---
  const handleAddLevel = () => {
    if (!newLevelName.trim()) return;
    const cleanName = newLevelName.trim();
    if (levels.includes(cleanName)) {
      alert('This level already exists.');
      return;
    }
    const updatedLevels = [...levels, cleanName];
    onUpdateProject({
      ...project,
      structuralLevels: updatedLevels
    });
    setNewLevelName('');
    setSelectedLevel(cleanName);
  };

  const handleRenameLevel = (oldName: string) => {
    if (!editingLevelName.trim()) return;
    const cleanNewName = editingLevelName.trim();
    if (cleanNewName === oldName) {
      setEditingLevel(null);
      return;
    }
    if (levels.includes(cleanNewName)) {
      alert('Another level already has this name.');
      return;
    }
    const updatedLevels = levels.map(l => l === oldName ? cleanNewName : l);
    const updatedLevelComponents = { ...(project.levelComponents || {}) };
    if (updatedLevelComponents[oldName]) {
      updatedLevelComponents[cleanNewName] = updatedLevelComponents[oldName];
      delete updatedLevelComponents[oldName];
    }
    onUpdateProject(
      {
        ...project,
        structuralLevels: updatedLevels,
        levelComponents: updatedLevelComponents
      },
      { oldName, newName: cleanNewName }
    );
    if (selectedLevel === oldName) {
      setSelectedLevel(cleanNewName);
    }
    setEditingLevel(null);
  };

  const handleDeleteLevel = (levelToDelete: string) => {
    if (levels.length <= 1) {
      alert('You must have at least one structural level.');
      return;
    }
    if (confirm(`Are you sure you want to delete the structural level "${levelToDelete}"? Associated submittal tickets will be reassigned to the remaining level "${levels.find(l => l !== levelToDelete)}".`)) {
      const updatedLevels = levels.filter(l => l !== levelToDelete);
      const updatedLevelComponents = { ...(project.levelComponents || {}) };
      delete updatedLevelComponents[levelToDelete];
      onUpdateProject(
        {
          ...project,
          structuralLevels: updatedLevels,
          levelComponents: updatedLevelComponents
        },
        undefined,
        levelToDelete
      );
    }
  };

  // --- Component Handlers ---
  const handleAddComponent = () => {
    if (!newComponentName.trim()) return;
    const cleanName = newComponentName.trim();
    const currentComponents = getComponentsForLevel(selectedLevel);
    if (currentComponents.includes(cleanName)) {
      alert('This component already exists for this level.');
      return;
    }
    const updatedLevelComponents = { ...(project.levelComponents || {}) };
    levels.forEach(lvl => {
      if (!updatedLevelComponents[lvl]) {
        updatedLevelComponents[lvl] = getComponentsForLevel(lvl);
      }
    });
    updatedLevelComponents[selectedLevel] = [...updatedLevelComponents[selectedLevel], cleanName];

    onUpdateProject({
      ...project,
      levelComponents: updatedLevelComponents
    });
    setNewComponentName('');
  };

  const handleRenameComponent = (oldName: string) => {
    if (!editingComponentName.trim()) return;
    const cleanNewName = editingComponentName.trim();
    if (cleanNewName === oldName) {
      setEditingComponent(null);
      return;
    }
    const currentComponents = getComponentsForLevel(selectedLevel);
    if (currentComponents.includes(cleanNewName)) {
      alert('Another component in this level already has this name.');
      return;
    }
    const updatedLevelComponents = { ...(project.levelComponents || {}) };
    levels.forEach(lvl => {
      if (!updatedLevelComponents[lvl]) {
        updatedLevelComponents[lvl] = getComponentsForLevel(lvl);
      }
    });
    updatedLevelComponents[selectedLevel] = updatedLevelComponents[selectedLevel].map(c => c === oldName ? cleanNewName : c);

    onUpdateProject(
      {
        ...project,
        levelComponents: updatedLevelComponents
      },
      undefined,
      undefined,
      { oldName, newName: cleanNewName, levelName: selectedLevel }
    );
    setEditingComponent(null);
  };

  const handleDeleteComponent = (componentToDelete: string) => {
    const currentComponents = getComponentsForLevel(selectedLevel);
    if (currentComponents.length <= 1) {
      alert('You must have at least one structural component for this level.');
      return;
    }
    if (confirm(`Are you sure you want to delete the component "${componentToDelete}" from level "${selectedLevel}"? Associated submittal tickets will be categorized under "Other Components".`)) {
      const updatedLevelComponents = { ...(project.levelComponents || {}) };
      levels.forEach(lvl => {
        if (!updatedLevelComponents[lvl]) {
          updatedLevelComponents[lvl] = getComponentsForLevel(lvl);
        }
      });
      updatedLevelComponents[selectedLevel] = updatedLevelComponents[selectedLevel].filter(c => c !== componentToDelete);

      onUpdateProject(
        {
          ...project,
          levelComponents: updatedLevelComponents
        },
        undefined,
        undefined,
        undefined,
        componentToDelete,
        selectedLevel
      );
    }
  };

  // Group tickets by Level and Component
  const groupedData = useMemo(() => {
    const group: Record<string, Record<string, Ticket[]>> = {};

    // Initialize groupings with current levels & level-specific components
    levels.forEach(level => {
      group[level] = {};
      const levelComponents = getComponentsForLevel(level);
      levelComponents.forEach(comp => {
        group[level][comp] = [];
      });
      // Fallback bucket
      group[level]['Other Components'] = [];
    });

    // Populate tickets
    tickets.forEach(ticket => {
      let level = ticket.structureLevel || '';
      const component = ticket.structureComponent || 'Other Components';

      // Fallback ticket level to first available level if invalid
      if (!levels.includes(level)) {
        if (levels.length > 0) {
          level = levels[0];
        } else {
          return;
        }
      }

      if (!group[level]) {
        group[level] = {};
      }

      const levelComponents = getComponentsForLevel(level);

      // Determine match or put in 'Other Components'
      const matchedComponent = levelComponents.includes(component) ? component : 'Other Components';
      if (!group[level][matchedComponent]) {
        group[level][matchedComponent] = [];
      }
      group[level][matchedComponent].push(ticket);
    });

    return group;
  }, [tickets, levels, project.levelComponents, project.structuralComponents]);

  // Aggregate stats per level
  const levelStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; pending: number }> = {};
    
    Object.keys(groupedData).forEach(level => {
      let total = 0;
      let completed = 0;
      let pending = 0;

      const componentsMap = (groupedData[level] || {}) as Record<string, Ticket[]>;
      Object.values(componentsMap).forEach(ticketList => {
        ticketList.forEach(t => {
          total++;
          if (t.status === 'Completed') completed++;
          else pending++;
        });
      });

      stats[level] = { total, completed, pending };
    });

    return stats;
  }, [groupedData]);

  // Determine badge style helper
  const getBadgeStyle = (status: string) => {
    if (status === 'Completed') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (status.includes('Revise')) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (status.includes('Accepted') || status.includes('Approved')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  const activeLevelComponents = (groupedData[selectedLevel] || {}) as Record<string, Ticket[]>;

  return (
    <div id="structure-explorer-layout" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      
      {/* Left Navigation: Structural Level Deck (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-3">
        <div className="bg-white p-3 border border-slate-200 rounded shadow-2xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans">
            Structural Level Explorer
          </h4>
          <p className="text-[10px] text-slate-400 mt-0.5">Select, edit, or add levels of the physical building structure.</p>
        </div>

        {/* Level List */}
        <div className="flex flex-col gap-2">
          {levels.map(level => {
            const stats = levelStats[level] || { total: 0, completed: 0, pending: 0 };
            const isActive = level === selectedLevel;
            const isEditing = editingLevel === level;

            return (
              <div
                key={level}
                onClick={() => {
                  if (!isEditing) setSelectedLevel(level);
                }}
                className={`p-3 rounded text-left border transition-all cursor-pointer flex justify-between items-center group relative ${
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm ring-1 ring-blue-500/10'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1.5 w-full" onClick={e => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingLevelName}
                      onChange={e => setEditingLevelName(e.target.value)}
                      className="flex-1 px-1.5 py-0.5 text-xs text-slate-800 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold uppercase"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameLevel(level);
                        if (e.key === 'Escape') setEditingLevel(null);
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleRenameLevel(level)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingLevel(null)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-0.5 pr-8">
                      <span className="text-xs font-bold tracking-tight block uppercase">{level}</span>
                      <span className={`text-[9px] font-mono block ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                        {stats.total} SUBMITTALS • {stats.completed} CLOSED
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      {/* Inline Actions on Hover */}
                      {isAllowedToCustomize && (
                        <div className="hidden group-hover:flex items-center gap-1 mr-1">
                          <button
                            onClick={() => {
                              setEditingLevel(level);
                              setEditingLevelName(level);
                            }}
                            className={`p-1 rounded hover:bg-slate-150/20 ${isActive ? 'text-blue-100 hover:text-white' : 'text-slate-400 hover:text-blue-600'}`}
                            title="Rename Level"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteLevel(level)}
                            className={`p-1 rounded hover:bg-slate-150/20 ${isActive ? 'text-blue-100 hover:text-white' : 'text-slate-400 hover:text-rose-600'}`}
                            title="Delete Level"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {stats.total > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {Math.round((stats.completed / stats.total) * 100)}%
                        </span>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Level Form */}
        {isAllowedToCustomize && (
          <div className="bg-white p-2.5 border border-slate-200 rounded shadow-2xs mt-1">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="New Level (e.g. 4th Floor)"
                value={newLevelName}
                onChange={e => setNewLevelName(e.target.value)}
                className="flex-1 px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-semibold uppercase placeholder:normal-case placeholder:font-normal"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddLevel();
                }}
              />
              <button
                onClick={handleAddLevel}
                className="px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center cursor-pointer text-[10px] font-bold uppercase shrink-0"
              >
                + Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Component Grid & Tickets (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        
        {/* Components Header Card with Quick Add Component */}
        <div className="bg-white p-3 border border-slate-200 rounded shadow-2xs flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              {selectedLevel.toUpperCase()} Components
            </h3>
            <p className="text-[10px] text-slate-400">Showing engineering components, drafting revisions, and submittals.</p>
          </div>
          
          {isAllowedToCustomize && (
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="text"
                placeholder="New Component..."
                value={newComponentName}
                onChange={e => setNewComponentName(e.target.value)}
                className="px-2 py-1 text-[11px] rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-28 font-semibold uppercase placeholder:normal-case placeholder:font-normal"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddComponent();
                }}
              />
              <button
                onClick={handleAddComponent}
                className="px-2 bg-slate-800 hover:bg-slate-700 text-white rounded cursor-pointer text-[10px] font-bold uppercase h-7 shrink-0"
              >
                + Add
              </button>
            </div>
          )}
        </div>

        {/* List of Components */}
        <div className="space-y-4">
          {Object.entries(activeLevelComponents).map(([componentName, ticketList]) => {
            const completedCount = ticketList.filter(t => t.status === 'Completed').length;
            const isCompEditing = editingComponent === componentName;

            return (
              <div
                key={componentName}
                className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden"
              >
                {/* Component Section Title bar */}
                <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center group/title">
                  {isCompEditing ? (
                    <div className="flex-1 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingComponentName}
                        onChange={e => setEditingComponentName(e.target.value)}
                        className="px-2 py-0.5 text-xs text-slate-800 rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold uppercase"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameComponent(componentName);
                          if (e.key === 'Escape') setEditingComponent(null);
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameComponent(componentName)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingComponent(null)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-700 tracking-tight uppercase">{componentName}</span>
                      
                      {componentName !== 'Other Components' && isAllowedToCustomize && (
                        <div className="hidden group-hover/title:flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingComponent(componentName);
                              setEditingComponentName(componentName);
                            }}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-blue-600 cursor-pointer"
                            title="Rename Component"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteComponent(componentName)}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Delete Component"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}

                      <span className="text-[9px] font-mono text-slate-400 font-medium">
                        ({ticketList.length} {ticketList.length === 1 ? 'ticket' : 'tickets'})
                      </span>
                      {ticketList.length > 0 && (
                        <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded font-mono">
                          {completedCount}/{ticketList.length} COMPLETED
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Quick add shortcut to this component */}
                  <button
                    onClick={() => onQuickAddTicket(selectedLevel, componentName)}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <Plus className="w-3 h-3" />
                    Quick Add
                  </button>
                </div>

                {/* Submittal Tickets grouped inside this Component */}
                <div className="divide-y divide-slate-100">
                  {ticketList.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 italic text-[11px] flex flex-col items-center justify-center gap-1 bg-white">
                      <span>No active submittals for {componentName} in {selectedLevel}.</span>
                      <button
                        onClick={() => onQuickAddTicket(selectedLevel, componentName)}
                        className="text-[9px] text-blue-600 hover:underline font-bold uppercase mt-1"
                      >
                        Create first ticket
                      </button>
                    </div>
                  ) : (
                    ticketList.map(ticket => {
                      return (
                        <div
                          key={ticket.id}
                          onClick={() => onTicketClick(ticket)}
                          className="p-3 hover:bg-slate-50 transition-colors cursor-pointer flex justify-between items-center group bg-white"
                        >
                          <div className="space-y-1 max-w-[70%]">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-400 text-[10px] font-bold">#{ticket.ticketCode}</span>
                              <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                {ticket.title}
                              </span>
                              <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1 py-0.2 rounded font-mono uppercase">
                                Rev {ticket.revision}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono flex-wrap">
                              <span>DRAFTER: <strong className="text-slate-600">{ticket.assignee}</strong></span>
                              <span>•</span>
                              <span>ISSUER: <strong className="text-slate-600">{ticket.creatorName || 'System'}</strong></span>
                              <span>•</span>
                              <span>START: <strong className="text-slate-600">{ticket.startDate}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className={`text-[9px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded ${getBadgeStyle(ticket.status)}`}>
                              {ticket.status.replace(' (Third-Party)', '').replace(' (Government)', '')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
