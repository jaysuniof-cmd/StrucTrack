import React, { useState, useMemo } from 'react';
import { RegistryUser, Project } from '../types';
import { Users, Plus, Mail, Shield, Trash2, CheckCircle, Filter, Edit, Check, X } from 'lucide-react';

interface TeamRegistryProps {
  users: RegistryUser[];
  projects: Project[];
  currentUser: any; // AppUser from parent state
  onAddUser: (user: RegistryUser) => void;
  onRemoveUser?: (id: string) => void;
  onUpdateUserProjects?: (userId: string, projectIds: string[]) => void;
  isAdmin?: boolean;
}

export default function TeamRegistry({
  users,
  projects = [],
  currentUser,
  onAddUser,
  onRemoveUser,
  onUpdateUserProjects,
  isAdmin = false
}: TeamRegistryProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Drafter' | 'Reviewer' | 'Government' | 'Supervisor'>('Drafter');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');

  // Inline Project Editing state for Admin
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingProjectIds, setEditingProjectIds] = useState<string[]>([]);

  // Project Filtering state
  const [selectedFilterProjectId, setSelectedFilterProjectId] = useState<string>('ALL');

  // Find all projects that the current user is associated with (for Supervisor / Personnel)
  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.isAdmin || currentUser.role === 'Admin') {
      return projects;
    }
    
    // Find all projects where they are assigned as supervisor
    const asSupervisor = projects.filter(p => 
      p.assignedSupervisors?.includes(currentUser.uid) || 
      p.assignedSupervisors?.includes(currentUser.email) ||
      p.assignedSupervisors?.includes(currentUser.name)
    );
    
    // Or where they are registered in TeamRegistry with projectIds
    const currentRegistryUser = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
    const asRegistry = currentRegistryUser?.projectIds 
      ? projects.filter(p => currentRegistryUser.projectIds?.includes(p.id))
      : [];
      
    // Combine unique projects
    const union = [...asSupervisor];
    asRegistry.forEach(p => {
      if (!union.some(x => x.id === p.id)) {
        union.push(p);
      }
    });
    return union;
  }, [projects, currentUser, users]);

  // Determine visibility based on Supervisor/Admin rules
  const visibleUsers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.isAdmin || currentUser.role === 'Admin') {
      return users;
    }
    
    // Supervisor or normal user view: only see members registered on their active projects
    const supervisorProjectIds = userProjects.map(p => p.id);
    return users.filter(u => {
      // Always let the user see themselves
      if (u.email.toLowerCase() === currentUser.email.toLowerCase()) return true;
      // If the user being viewed is associated with any of the supervisor's projects
      if (!u.projectIds || u.projectIds.length === 0) return false;
      return u.projectIds.some(pId => supervisorProjectIds.includes(pId));
    });
  }, [users, currentUser, userProjects]);

  // Apply project filter dropdown selection
  const displayedUsers = useMemo(() => {
    if (selectedFilterProjectId === 'ALL') {
      return visibleUsers;
    }
    return visibleUsers.filter(u => u.projectIds?.includes(selectedFilterProjectId));
  }, [visibleUsers, selectedFilterProjectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only administrators can add team members.');
      return;
    }
    if (!name.trim() || !email.trim()) {
      alert('Please fill out both name and email.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    // Check if name or email already exists in registry
    const isDuplicate = users.some(
      u => u.name.toLowerCase() === name.trim().toLowerCase() || u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (isDuplicate) {
      alert('A user with this name or email already exists in the Team Registry.');
      return;
    }

    const newUser: RegistryUser = {
      id: `u_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      projectIds: selectedProjectIds
    };

    onAddUser(newUser);
    setName('');
    setEmail('');
    setRole('Drafter');
    setSelectedProjectIds([]);
    setFeedback(`Successfully registered ${newUser.name}!`);
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleSaveProjects = (userId: string) => {
    if (onUpdateUserProjects) {
      onUpdateUserProjects(userId, editingProjectIds);
      setEditingUserId(null);
    }
  };

  // Helper to draw random/consistent avatar color based on name length
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-600 text-white',
      'bg-indigo-600 text-white',
      'bg-purple-600 text-white',
      'bg-emerald-600 text-white',
      'bg-amber-600 text-white',
      'bg-pink-600 text-white',
      'bg-sky-600 text-white',
      'bg-rose-600 text-white'
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <div id="team-registry-layout" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      
      {/* Left Column: Register New Team Member Form (5 cols) - Admin Only */}
      {isAdmin && (
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              Add Team Member
            </h3>
            <p className="text-[10px] text-slate-400 mb-4">Register structural engineers, draftspersons, or government liaisons to assign submittals.</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. David Wright"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Email Address <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="e.g. david.w@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">System/Structural Role <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <Shield className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full pl-7 pr-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                  >
                    <option value="Drafter">Draftsperson / Detailer</option>
                    <option value="Reviewer">Third-Party Reviewer</option>
                    <option value="Government">Government Representative</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>
              </div>

              {/* Multi-Project Association */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Assign to Projects
                </label>
                {projects.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">No projects available. Set up a project first.</p>
                ) : (
                  <div className="border border-slate-200 rounded p-2 max-h-32 overflow-y-auto space-y-1 bg-slate-50">
                    {projects.map(p => (
                      <label key={p.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-100 p-0.5 rounded">
                        <input
                          type="checkbox"
                          checked={selectedProjectIds.includes(p.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedProjectIds([...selectedProjectIds, p.id]);
                            } else {
                              setSelectedProjectIds(selectedProjectIds.filter(id => id !== p.id));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span className="truncate text-[10px] font-medium uppercase">{p.code} - {p.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider rounded shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                Register Member
              </button>
            </form>

            {feedback && (
              <div className="mt-3 p-2 bg-emerald-50 text-emerald-800 text-[10px] rounded border border-emerald-200 flex items-center gap-1.5 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{feedback}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right Column: Registered Users Listing (7 cols if Admin, 12 if ordinary) */}
      <div className={`${isAdmin ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col gap-3`}>
        
        {/* Filter Toolbar */}
        <div className="bg-white p-3.5 border border-slate-200 rounded shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Active Team Registry ({displayedUsers.length})
              </h3>
            </div>
            <p className="text-[10px] text-slate-400">
              {currentUser?.isAdmin || currentUser?.role === 'Admin' 
                ? 'Showing all active personnel registered in the workspace.'
                : 'Showing active project team members.'}
            </p>
          </div>

          {/* Project Filtering Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedFilterProjectId}
              onChange={e => setSelectedFilterProjectId(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px]"
            >
              <option value="ALL">All Associated Projects</option>
              {userProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Directory Grid */}
        <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-3`}>
          {displayedUsers.map(u => {
            const initials = u.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            const userProjectsList = u.projectIds
              ? projects.filter(p => u.projectIds?.includes(p.id))
              : [];

            const isEditingProjects = editingUserId === u.id;

            return (
              <div
                key={u.id}
                className="bg-white border border-slate-200 p-3 rounded flex flex-col justify-between hover:border-slate-300 hover:shadow-2xs transition-all relative gap-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Initials bubble */}
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs font-mono shadow-2xs ${getAvatarColor(u.name)}`}>
                      {initials}
                    </div>
                    
                    {/* Info details */}
                    <div className="min-w-0">
                      <span className="font-bold text-[11px] text-slate-800 block truncate leading-tight uppercase tracking-tight">{u.name}</span>
                      <span className="text-[9px] font-mono text-slate-400 block truncate leading-tight mt-0.5" title={u.email}>{u.email}</span>
                      <span className={`inline-block mt-1 text-[8px] font-extrabold uppercase px-1 py-0.2 rounded tracking-wider border ${
                        u.role === 'Reviewer' || u.role.toLowerCase().includes('reviewer')
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : u.role === 'Government' || u.role.toLowerCase().includes('government')
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : u.role === 'Supervisor' || u.role.toLowerCase().includes('supervisor')
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : u.role.toLowerCase().includes('lead') || u.role.toLowerCase().includes('senior') || u.role.toLowerCase().includes('manager')
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  </div>

                  {/* Top-right Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (isEditingProjects) {
                            setEditingUserId(null);
                          } else {
                            setEditingUserId(u.id);
                            setEditingProjectIds(u.projectIds || []);
                          }
                        }}
                        className="p-1 hover:bg-blue-50 text-slate-300 hover:text-blue-600 rounded transition-colors cursor-pointer"
                        title="Edit Project Associations"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    )}
                    {isAdmin && onRemoveUser && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove ${u.name} from the directory?`)) {
                            onRemoveUser(u.id);
                          }
                        }}
                        className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title={`Remove ${u.name} from directory`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Project associations area */}
                <div className="border-t border-slate-100 pt-2 mt-1">
                  {isEditingProjects ? (
                    <div className="space-y-1.5 p-1.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-[9px] font-bold uppercase text-slate-500 block">Edit Projects:</span>
                      <div className="max-h-24 overflow-y-auto space-y-1">
                        {projects.map(p => (
                          <label key={p.id} className="flex items-center gap-1.5 text-[9px] font-mono text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingProjectIds.includes(p.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setEditingProjectIds([...editingProjectIds, p.id]);
                                } else {
                                  setEditingProjectIds(editingProjectIds.filter(id => id !== p.id));
                                }
                              }}
                              className="w-3 h-3 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>{p.code}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end gap-1 mt-1">
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-350 text-slate-700 text-[8px] font-bold rounded uppercase cursor-pointer flex items-center gap-0.5"
                        >
                          <X className="w-2 h-2" /> Cancel
                        </button>
                        <button
                          onClick={() => handleSaveProjects(u.id)}
                          className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[8px] font-bold rounded uppercase cursor-pointer flex items-center gap-0.5"
                        >
                          <Check className="w-2 h-2" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">Projects ({userProjectsList.length}):</span>
                      <div className="flex flex-wrap gap-1">
                        {userProjectsList.map(p => (
                          <span key={p.id} className="text-[8px] font-mono bg-blue-50 text-blue-700 border border-blue-100 px-1 rounded uppercase font-bold" title={p.name}>
                            {p.code}
                          </span>
                        ))}
                        {userProjectsList.length === 0 && (
                          <span className="text-[8px] text-slate-400 italic">No assigned projects</span>
                        )}
                      </div>
                    </div>
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
