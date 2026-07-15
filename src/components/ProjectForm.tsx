import React, { useState } from 'react';
import { Project } from '../types';
import { X, Plus, Trash2, Tag, Calendar, FolderPlus } from 'lucide-react';

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
}

export default function ProjectForm({ isOpen, onClose, onSave }: ProjectFormProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // +6 months
  );

  // Submission Gates Customization list
  const [gates, setGates] = useState<string[]>([
    'Third-Party Peer Review',
    'Government Building Authority Approval'
  ]);
  const [newGate, setNewGate] = useState('');

  // Structural Levels Customization list
  const [levels, setLevels] = useState<string[]>([
    'Substructure',
    '1st Floor',
    '2nd Floor',
    '3rd Floor',
    'Roof'
  ]);
  const [newLevel, setNewLevel] = useState('');

  // Structural Components Customization list
  const [components, setComponents] = useState<string[]>([
    'Foundations',
    'Columns',
    'Beams',
    'Slabs',
    'Walls',
    'Retaining Walls'
  ]);
  const [newComponent, setNewComponent] = useState('');

  if (!isOpen) return null;

  const handleAddGate = () => {
    if (newGate.trim() && !gates.includes(newGate.trim())) {
      setGates([...gates, newGate.trim()]);
      setNewGate('');
    }
  };

  const handleRemoveGate = (index: number) => {
    setGates(gates.filter((_, i) => i !== index));
  };

  const handleAddLevel = () => {
    if (newLevel.trim() && !levels.includes(newLevel.trim())) {
      setLevels([...levels, newLevel.trim()]);
      setNewLevel('');
    }
  };

  const handleRemoveLevel = (index: number) => {
    if (levels.length <= 1) {
      alert('You must have at least one structural level.');
      return;
    }
    setLevels(levels.filter((_, i) => i !== index));
  };

  const handleAddComponent = () => {
    if (newComponent.trim() && !components.includes(newComponent.trim())) {
      setComponents([...components, newComponent.trim()]);
      setNewComponent('');
    }
  };

  const handleRemoveComponent = (index: number) => {
    if (components.length <= 1) {
      alert('You must have at least one structural component.');
      return;
    }
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      alert('Project Name and Project Code are strictly required.');
      return;
    }

    const newProject: Project = {
      id: `p_${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      requiredSubmissions: gates,
      startDate,
      targetCompletionDate,
      status: 'Active',
      createdAt: new Date().toISOString(),
      structuralLevels: levels,
      structuralComponents: components
    };

    onSave(newProject);
    alert(`Project "${newProject.name}" has been successfully created!`);
    onClose();

    // Reset Form
    setName('');
    setCode('');
    setDescription('');
    setGates(['Third-Party Peer Review', 'Government Building Authority Approval']);
    setLevels(['Substructure', '1st Floor', '2nd Floor', '3rd Floor', 'Roof']);
    setComponents(['Foundations', 'Columns', 'Beams', 'Slabs', 'Walls', 'Retaining Walls']);
  };

  return (
    <div id="project-form-overlay" className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div id="project-form-card" className="bg-white rounded max-w-md w-full overflow-hidden shadow-xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-1.5">
            <FolderPlus className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Initialize New Project</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Project Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Vertex Office Complex"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Code <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. VTX"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase font-mono font-bold bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Project Description</label>
            <textarea
              placeholder="Structure framing details, site characteristics, foundation type, etc."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Kickoff Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Target Completion</label>
              <input
                type="date"
                value={targetCompletionDate}
                onChange={e => setTargetCompletionDate(e.target.value)}
                className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Customizable submission requirements/gates */}
          <div className="bg-slate-50 border border-slate-250 rounded p-2.5 space-y-2">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">Customize Submission Gates</span>
              <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Define milestones and required approval stages for drafting items generated under this project.</p>
            </div>

            {/* List of current gates */}
            <div className="space-y-1 max-h-[80px] overflow-y-auto">
              {gates.map((gate, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-slate-200 text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Tag className="w-3 h-3 text-blue-500 shrink-0" />
                    {gate}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveGate(idx)}
                    className="p-0.5 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add gate input */}
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="e.g. EPA Environmental Seal"
                value={newGate}
                onChange={e => setNewGate(e.target.value)}
                className="flex-1 px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGate();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddGate}
                className="px-2 bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center justify-center cursor-pointer text-[11px] font-bold uppercase h-7 shrink-0"
              >
                <Plus className="w-3 h-3 mr-0.5" /> ADD
              </button>
            </div>
          </div>

          {/* Customizable Structural Levels */}
          <div className="bg-slate-50 border border-slate-250 rounded p-2.5 space-y-2">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">Structural Levels</span>
              <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Define structural floors/levels (can be edited/deleted anytime).</p>
            </div>

            <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto p-1 bg-white border border-slate-200 rounded">
              {levels.map((lvl, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-[10px] font-semibold uppercase px-2 py-0.5 rounded border border-slate-200">
                  {lvl}
                  <button
                    type="button"
                    onClick={() => handleRemoveLevel(idx)}
                    className="text-slate-400 hover:text-rose-500 font-bold transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="e.g. 4th Floor"
                value={newLevel}
                onChange={e => setNewLevel(e.target.value)}
                className="flex-1 px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-semibold uppercase"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLevel();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddLevel}
                className="px-2 bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center justify-center cursor-pointer text-[11px] font-bold uppercase h-7 shrink-0"
              >
                <Plus className="w-3 h-3 mr-0.5" /> ADD
              </button>
            </div>
          </div>

          {/* Customizable Structural Components */}
          <div className="bg-slate-50 border border-slate-250 rounded p-2.5 space-y-2">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-700">Structural Components</span>
              <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Define structural members / design packages.</p>
            </div>

            <div className="flex flex-wrap gap-1 max-h-[85px] overflow-y-auto p-1 bg-white border border-slate-200 rounded">
              {components.map((comp, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-[10px] font-semibold uppercase px-2 py-0.5 rounded border border-slate-200">
                  {comp}
                  <button
                    type="button"
                    onClick={() => handleRemoveComponent(idx)}
                    className="text-slate-400 hover:text-rose-500 font-bold transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="e.g. Roof Trusses"
                value={newComponent}
                onChange={e => setNewComponent(e.target.value)}
                className="flex-1 px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-semibold uppercase"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddComponent();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddComponent}
                className="px-2 bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center justify-center cursor-pointer text-[11px] font-bold uppercase h-7 shrink-0"
              >
                <Plus className="w-3 h-3 mr-0.5" /> ADD
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[11px] border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-bold uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-xs cursor-pointer uppercase tracking-wider"
            >
              Initialize Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
