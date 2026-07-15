import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Shield, 
  ShieldCheck, 
  Clock, 
  UserCheck, 
  UserX,
  Search,
  AlertCircle,
  BarChart3,
  Briefcase,
  TrendingUp,
  Activity,
  Edit,
  Coins,
  CalendarDays,
  FileEdit,
  Check,
  X
} from 'lucide-react';
import { 
  subscribeToAllAppUsers, 
  updateAppUserStatus, 
  toggleAppUserAdmin, 
  deleteAppUser, 
  AppUser,
  saveRegistryUserDb,
  fetchProfileChangeRequestsDb,
  updateProfileChangeRequestStatusDb
} from '../utils/firebase';
import { Project, HourLog, Ticket, RegistryUser, ProfileChangeRequest } from '../types';

interface AdminPanelProps {
  currentUser: AppUser | null;
  projects: Project[];
  hourLogs: HourLog[];
  tickets: Ticket[];
  users: RegistryUser[];
}

export default function AdminPanel({ 
  currentUser,
  projects = [],
  hourLogs = [],
  tickets = [],
  users = []
}: AdminPanelProps) {
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Active sub-tab inside admin panel: 'dashboard' | 'approvals' | 'profileRequests'
  const [adminTab, setAdminTab] = useState<'dashboard' | 'approvals' | 'profileRequests'>('dashboard');

  // Profile Change Requests list
  const [profileRequests, setProfileRequests] = useState<ProfileChangeRequest[]>([]);
  const [adminReviewRemarks, setAdminReviewRemarks] = useState<{ [requestId: string]: string }>({});

  // Direct Profile Editing Modal State
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editProjectIds, setEditProjectIds] = useState<string[]>([]);
  const [editSupervisor, setEditSupervisor] = useState('');
  const [editDateOfEngagement, setEditDateOfEngagement] = useState('');
  const [editRate, setEditRate] = useState<number>(0);
  const [editCurrency, setEditCurrency] = useState('USD');

  useEffect(() => {
    setLoading(true);
    // Subscribe to real-time users list
    const unsubscribe = subscribeToAllAppUsers((users) => {
      setUsersList(users);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const loadProfileRequests = async () => {
    try {
      const data = await fetchProfileChangeRequestsDb();
      setProfileRequests(data);
    } catch (err) {
      console.error('Failed to load profile requests:', err);
    }
  };

  useEffect(() => {
    loadProfileRequests();
  }, [adminTab]);

  const handleReviewProfileRequest = async (id: string, status: 'Approved' | 'Rejected') => {
    setActioningId(id);
    try {
      const remarks = adminReviewRemarks[id] || '';
      await updateProfileChangeRequestStatusDb(id, status, remarks);
      await loadProfileRequests();
    } catch (err) {
      console.error('Failed to update profile request status:', err);
    } finally {
      setActioningId(null);
    }
  };

  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditRole(user.role || 'Drafter');
    setEditProjectIds(user.projectIds || []);
    setEditSupervisor(user.supervisor || '');
    setEditDateOfEngagement(user.dateOfEngagement || '');
    setEditRate(user.rate || 0);
    setEditCurrency(user.currency || 'USD');
  };

  const handleSaveEditedProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActioningId(editingUser.uid);
    try {
      const updatedUser: RegistryUser = {
        id: editingUser.uid,
        name: editName,
        email: editEmail,
        role: editRole,
        projectIds: editProjectIds,
        supervisor: editSupervisor,
        dateOfEngagement: editDateOfEngagement,
        rate: Number(editRate),
        currency: editCurrency
      };
      await saveRegistryUserDb(updatedUser);
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to save edited profile:', err);
    } finally {
      setActioningId(null);
    }
  };

  const handleStatusChange = async (uid: string, status: 'Approved' | 'Rejected' | 'Pending') => {
    setActioningId(uid);
    try {
      await updateAppUserStatus(uid, status);
    } catch (err) {
      console.error('Failed to change user status:', err);
    } finally {
      setActioningId(null);
    }
  };

  const handleToggleAdmin = async (uid: string, currentAdminVal: boolean) => {
    setActioningId(uid);
    try {
      await toggleAppUserAdmin(uid, !currentAdminVal);
    } catch (err) {
      console.error('Failed to toggle admin state:', err);
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (uid: string, name: string) => {
    if (uid === currentUser?.uid) {
      alert("You cannot delete your own account.");
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete user "${name}"?`)) {
      setActioningId(uid);
      try {
        await deleteAppUser(uid);
      } catch (err) {
        console.error('Failed to delete user:', err);
      } finally {
        setActioningId(null);
      }
    }
  };

  // --- Manpower & Manhours Dashboard Calculations ---
  
  const dashboardStats = useMemo(() => {
    // Total approved workers (manpower)
    const approvedRegistryUsers = usersList.filter(u => u.status === 'Approved');
    const totalManpower = approvedRegistryUsers.length;

    // Total manhours across all projects
    const totalManhours = hourLogs.reduce((sum, log) => sum + log.hours, 0);

    // Manpower and Manhours per Project
    const projectBreakdowns = projects.map(proj => {
      // Find manpower: users registered to this project
      const registeredWorkers = usersList.filter(u => 
        u.status === 'Approved' && u.projectIds?.includes(proj.id)
      );
      const manpowerCount = registeredWorkers.length;

      // Find manhours: logs belonging to this project's tickets
      const projectTickets = tickets.filter(t => t.projectId === proj.id);
      const projectTicketIds = projectTickets.map(t => t.id);
      const projectLogs = hourLogs.filter(log => projectTicketIds.includes(log.ticketId));
      const projectManhours = projectLogs.reduce((sum, log) => sum + log.hours, 0);

      return {
        id: proj.id,
        name: proj.name,
        code: proj.code,
        manpowerCount,
        manhours: projectManhours,
        status: proj.status
      };
    });

    // Workers effort list
    const workerEfforts = approvedRegistryUsers.map(u => {
      // Find manhours for this worker
      const workerLogs = hourLogs.filter(log => log.user.toLowerCase() === u.name.toLowerCase());
      const workerManhours = workerLogs.reduce((sum, log) => sum + log.hours, 0);

      // Associated projects count
      const projCount = u.projectIds?.length || 0;

      return {
        uid: u.uid,
        name: u.name,
        email: u.email,
        role: u.role,
        projectsCount: projCount,
        manhours: workerManhours
      };
    }).sort((a, b) => b.manhours - a.manhours); // top contributors first

    return {
      totalManpower,
      totalManhours,
      avgHoursPerWorker: totalManpower > 0 ? (totalManhours / totalManpower).toFixed(1) : '0.0',
      projectBreakdowns,
      workerEfforts
    };
  }, [usersList, projects, hourLogs, tickets]);

  const filteredUsers = usersList.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = usersList.filter(u => u.status === 'Pending').length;
  const approvedCount = usersList.filter(u => u.status === 'Approved').length;
  const adminCount = usersList.filter(u => u.isAdmin).length;

  const pendingProfileRequestsCount = useMemo(() => {
    return profileRequests.filter(r => r.status === 'Pending').length;
  }, [profileRequests]);

  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden flex flex-col h-full font-sans">
      
      {/* Tab Switcher Toolbar */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Administrator Command Center
            </h3>
            <p className="text-[10px] text-slate-400">Manage organizational manpower and monitor submittal logs.</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-800 rounded p-1 self-stretch sm:self-auto gap-1">
          <button
            onClick={() => setAdminTab('dashboard')}
            className={`flex-1 sm:flex-none px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
              adminTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Manpower & Manhours
          </button>
          <button
            onClick={() => setAdminTab('approvals')}
            className={`flex-1 sm:flex-none px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 relative ${
              adminTab === 'approvals'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            User Approvals
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
            )}
          </button>
          <button
            onClick={() => setAdminTab('profileRequests')}
            className={`flex-1 sm:flex-none px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 relative ${
              adminTab === 'profileRequests'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            Profile Requests
            {pendingProfileRequestsCount > 0 && (
              <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.2 text-[8px] font-bold font-mono ml-1">
                {pendingProfileRequestsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* RENDER TAB 1: MANPOWER & MANHOURS DASHBOARD */}
      {adminTab === 'dashboard' && (
        <div className="p-4 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
          
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-3.5 border border-slate-200 rounded shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">TOTAL MANPOWER</span>
                <span className="text-xl font-extrabold text-slate-800 font-mono mt-0.5 block">{dashboardStats.totalManpower} Workers</span>
                <span className="text-[9px] text-slate-400 block mt-1">Approved structural personnel</span>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 border border-slate-200 rounded shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">TOTAL MANHOURS</span>
                <span className="text-xl font-extrabold text-rose-600 font-mono mt-0.5 block">{dashboardStats.totalManhours} Hrs</span>
                <span className="text-[9px] text-slate-400 block mt-1">Accumulated draft labor logs</span>
              </div>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-full">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 border border-slate-200 rounded shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">AVG HOURS / WORKER</span>
                <span className="text-xl font-extrabold text-emerald-600 font-mono mt-0.5 block">{dashboardStats.avgHoursPerWorker} Hrs</span>
                <span className="text-[9px] text-slate-400 block mt-1">Mean productivity allocation</span>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 border border-slate-200 rounded shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">ACTIVE PORTFOLIO</span>
                <span className="text-xl font-extrabold text-indigo-600 font-mono mt-0.5 block">{projects.length} Projects</span>
                <span className="text-[9px] text-slate-400 block mt-1">Structural project registry</span>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Project Breakdowns (7 cols) */}
            <div className="bg-white p-4 border border-slate-200 rounded shadow-2xs lg:col-span-7 space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Project-Level Manpower & Labor Metrics
                </h4>
                <p className="text-[10px] text-slate-400">Comparing workforce headcount (Manpower) and aggregate registered labor hours (Manhours) per project.</p>
              </div>

              {dashboardStats.projectBreakdowns.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">No projects registered.</p>
              ) : (
                <div className="space-y-4">
                  {dashboardStats.projectBreakdowns.map(proj => {
                    const maxHours = Math.max(...dashboardStats.projectBreakdowns.map(p => p.manhours), 1);
                    const widthPercent = (proj.manhours / maxHours) * 100;

                    return (
                      <div key={proj.id} className="border border-slate-100 p-3 rounded hover:bg-slate-50 transition-colors space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-[11px] text-slate-800 uppercase block">{proj.name}</span>
                            <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1 rounded uppercase font-bold tracking-wider mt-0.5 inline-block">
                              CODE: {proj.code}
                            </span>
                          </div>
                          <div className="text-right space-y-0.5">
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.2 rounded uppercase block">
                              {proj.manpowerCount} Manpower (Workers)
                            </span>
                            <span className="text-xs font-mono font-extrabold text-rose-600 block">
                              {proj.manhours} Manhours spent
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar visualizer */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-mono text-slate-400 uppercase">
                            <span>Manhours Load Bar</span>
                            <span>{widthPercent.toFixed(0)}% of max effort</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-150">
                            <div 
                              className="bg-blue-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${widthPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Worker Contribution Leaderboard (5 cols) */}
            <div className="bg-white p-4 border border-slate-200 rounded shadow-2xs lg:col-span-5 space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Manpower Contribution Ledger
                </h4>
                <p className="text-[10px] text-slate-400">Personnel ranked by cumulative logged manhours.</p>
              </div>

              {dashboardStats.workerEfforts.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">No approved active workers.</p>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {dashboardStats.workerEfforts.map(worker => {
                    const maxWorkerHours = Math.max(...dashboardStats.workerEfforts.map(w => w.manhours), 1);
                    const workerWidth = (worker.manhours / maxWorkerHours) * 100;

                    return (
                      <div key={worker.uid} className="border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0 space-y-1 text-[11px]">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800 block uppercase leading-tight">{worker.name}</span>
                            <span className="text-[9px] text-slate-400 block font-mono">{worker.role} • {worker.projectsCount} Projects</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-extrabold text-slate-800">{worker.manhours} hrs</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${workerWidth}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* RENDER TAB 2: USER APPROVALS CONTROL PANEL */}
      {adminTab === 'approvals' && (
        <>
          {/* Header Panel */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Authorized Workspace Approvals
              </h3>
              <p className="text-[10px] text-slate-400">Review pending system memberships and authorize / revoke administrative permissions.</p>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users or roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded pl-8 pr-3 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          {/* Statistics Sub-Row */}
          <div className="grid grid-cols-3 border-b border-slate-200 bg-white select-none text-center">
            <div className="p-3">
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Awaiting Approval</p>
              <p className="text-base font-extrabold text-amber-600 font-mono">{pendingCount}</p>
            </div>
            <div className="p-3 border-l border-r border-slate-200">
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Approved Access</p>
              <p className="text-base font-extrabold text-emerald-600 font-mono">{approvedCount}</p>
            </div>
            <div className="p-3">
              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Active Admins</p>
              <p className="text-base font-extrabold text-blue-600 font-mono">{adminCount}</p>
            </div>
          </div>

          {/* User list table */}
          <div className="flex-1 overflow-auto bg-slate-50/50">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
                <p>Loading application users list...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs space-y-1">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600">No matching users found.</p>
                <p>Try searching another keyword.</p>
              </div>
            ) : (
              <div className="min-w-full divide-y divide-slate-200">
                {filteredUsers.map((user) => {
                  const isSelf = user.uid === currentUser?.uid;
                  const isPending = user.status === 'Pending';
                  const isApproved = user.status === 'Approved';
                  const isRejected = user.status === 'Rejected';

                  return (
                    <div 
                      key={user.uid} 
                      className={`p-4 bg-white border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-colors ${isSelf ? 'border-l-4 border-l-blue-500' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-full shrink-0 ${
                          user.isAdmin ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-800 uppercase">{user.name}</h4>
                            {isSelf && (
                              <span className="bg-blue-50 text-blue-700 text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded border border-blue-200">
                                You
                              </span>
                            )}
                            {user.isAdmin && (
                              <span className="bg-slate-900 text-white text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                          <p className="text-[10px] font-medium text-slate-500 mt-0.5">
                            Role: <span className="text-slate-700 font-semibold">{user.role}</span>
                          </p>

                          {/* Profile Fields Display */}
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                            <div>
                              <span className="font-semibold text-slate-450">Supervisor: </span>
                              <span className="text-slate-700 font-medium">{user.supervisor || <span className="italic text-slate-350">None</span>}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-450">Date of Engagement: </span>
                              <span className="text-slate-700 font-medium">{user.dateOfEngagement || <span className="italic text-slate-350">Not set</span>}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-450">Rate: </span>
                              <span className="text-slate-750 font-extrabold font-mono text-indigo-650">
                                {user.rate !== undefined && user.rate !== null ? `${user.rate.toLocaleString()} ${user.currency || 'USD'}` : <span className="italic text-slate-350">Not set</span>}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-450">Assigned Projects: </span>
                              <span className="text-slate-700 font-medium">
                                {user.projectIds && user.projectIds.length > 0 ? (
                                  user.projectIds.map(pid => projects.find(p => p.id === pid)?.name || pid).join(', ')
                                ) : (
                                  <span className="italic text-slate-350">None</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        {/* Status badges */}
                        <div className="shrink-0">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                              <CheckCircle className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          
                          {/* Approve / Reject buttons */}
                          {!isSelf && (
                            <>
                              {!isApproved && (
                                <button
                                  disabled={actioningId === user.uid}
                                  onClick={() => handleStatusChange(user.uid, 'Approved')}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300 text-[9px] font-bold uppercase tracking-wider rounded cursor-pointer transition flex items-center gap-0.5 disabled:opacity-50 h-7"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  Approve
                                </button>
                              )}
                              {!isRejected && (
                                <button
                                  disabled={actioningId === user.uid}
                                  onClick={() => handleStatusChange(user.uid, 'Rejected')}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 text-[9px] font-bold uppercase tracking-wider rounded cursor-pointer transition flex items-center gap-0.5 disabled:opacity-50 h-7"
                                >
                                  <UserX className="w-3 h-3" />
                                  Reject
                                </button>
                              )}
                            </>
                          )}

                          {/* Direct Edit Profile Button */}
                          {isApproved && (
                            <button
                              disabled={actioningId === user.uid}
                              onClick={() => openEditModal(user)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 text-blue-700 text-[9px] font-bold uppercase tracking-wider rounded cursor-pointer transition flex items-center gap-0.5 h-7"
                              title="Edit User Profile"
                            >
                              <Edit className="w-3 h-3" />
                              Edit Profile
                            </button>
                          )}

                          {/* Admin role toggle */}
                          {!isSelf && isApproved && (
                            <button
                              disabled={actioningId === user.uid}
                              onClick={() => handleToggleAdmin(user.uid, user.isAdmin)}
                              className={`px-2 py-1 border text-[9px] font-bold uppercase tracking-wider rounded cursor-pointer transition flex items-center gap-0.5 disabled:opacity-50 h-7 ${
                                user.isAdmin 
                                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 font-extrabold'
                                  : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                              }`}
                              title={user.isAdmin ? "Revoke Admin Power" : "Promote to Admin"}
                            >
                              <Shield className="w-3 h-3" />
                              {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                          )}

                          {/* Permanent Delete */}
                          {!isSelf && (
                            <button
                              disabled={actioningId === user.uid}
                              onClick={() => handleDelete(user.uid, user.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-100 rounded hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                              title="Delete Account permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* RENDER TAB 3: PROFILE CHANGE REQUESTS CONTROL PANEL */}
      {adminTab === 'profileRequests' && (
        <>
          {/* Header Panel */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Staff Profile Change Requests
              </h3>
              <p className="text-[10px] text-slate-400">Approve or reject changes proposed by staff members on their professional profile cards.</p>
            </div>
            <button 
              onClick={loadProfileRequests}
              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Reload Requests
            </button>
          </div>

          {/* Requests list */}
          <div className="flex-1 overflow-auto bg-slate-50/50 p-4 space-y-4">
            {profileRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs space-y-1 bg-white border border-slate-200 rounded">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600">No profile change requests found.</p>
                <p>When staff request updates, they will appear here for review.</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {profileRequests.map((req) => {
                  // Find current state of the user to show a DIFF!
                  const targetUser = usersList.find(u => u.uid === req.userId);
                  const isPending = req.status === 'Pending';

                  // Helper to highlight changes
                  const renderDiffRow = (label: string, currentValue: any, requestedValue: any) => {
                    const isChanged = currentValue !== requestedValue;
                    return (
                      <tr key={label} className={`border-b border-slate-150 ${isChanged ? 'bg-amber-50/50' : ''}`}>
                        <td className="p-2 text-slate-500 font-semibold">{label}</td>
                        <td className="p-2 text-slate-600 line-through font-mono">{currentValue || <span className="italic text-slate-350">empty</span>}</td>
                        <td className={`p-2 font-mono ${isChanged ? 'text-amber-700 font-extrabold bg-amber-50' : 'text-slate-600'}`}>
                          {requestedValue || <span className="italic text-slate-350">empty</span>}
                        </td>
                      </tr>
                    );
                  };

                  return (
                    <div key={req.id} className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden flex flex-col md:flex-row">
                      
                      {/* Left: User & Meta info */}
                      <div className="p-4 border-r border-slate-100 bg-slate-50/50 md:w-1/3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              req.status === 'Pending' ? 'bg-amber-500' :
                              req.status === 'Approved' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              {req.status} Request
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase mt-2">{req.userName}</h4>
                          <p className="text-[9px] font-mono text-slate-400">{req.userEmail}</p>
                          <p className="text-[9px] text-slate-400 mt-1 font-mono">Submitted: {new Date(req.createdAt).toLocaleString()}</p>
                        </div>

                        {req.reviewedAt && (
                          <div className="mt-4 border-t border-slate-200 pt-2 text-[9px] text-slate-400">
                            <p>Reviewed: {req.reviewedAt}</p>
                            {req.adminRemarks && (
                              <p className="italic text-slate-600 bg-slate-100 p-1 rounded mt-1">
                                Remarks: {req.adminRemarks}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Diff table & action panel */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-[10px] text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[8px] border-b border-slate-200">
                                <th className="p-2">Attribute</th>
                                <th className="p-2">Current Value</th>
                                <th className="p-2">Requested Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {renderDiffRow('Name', targetUser?.name, req.requestedData.name)}
                              {renderDiffRow('Email', targetUser?.email, req.requestedData.email)}
                              {renderDiffRow('Role', targetUser?.role, req.requestedData.role)}
                              {renderDiffRow('Supervisor', targetUser?.supervisor, req.requestedData.supervisor)}
                              {renderDiffRow('Engagement Date', targetUser?.dateOfEngagement, req.requestedData.dateOfEngagement)}
                              {renderDiffRow('Rate', targetUser?.rate, req.requestedData.rate)}
                              {renderDiffRow('Currency', targetUser?.currency, req.requestedData.currency)}
                              {renderDiffRow(
                                'Assigned Projects',
                                targetUser?.projectIds && targetUser.projectIds.length > 0
                                  ? targetUser.projectIds.map(pid => projects.find(p => p.id === pid)?.name || pid).join(', ')
                                  : 'None',
                                req.requestedData.projectIds && req.requestedData.projectIds.length > 0
                                  ? req.requestedData.projectIds.map(pid => projects.find(p => p.id === pid)?.name || pid).join(', ')
                                  : 'None'
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Actions block */}
                        {isPending && (
                          <div className="border-t border-slate-100 pt-3 space-y-2">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Reviewer Remarks (Optional)</label>
                              <input 
                                type="text"
                                placeholder="Add comments, reason for rejection, etc..."
                                value={adminReviewRemarks[req.id] || ''}
                                onChange={(e) => setAdminReviewRemarks({
                                  ...adminReviewRemarks,
                                  [req.id]: e.target.value
                                })}
                                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-500 h-8"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                disabled={actioningId === req.id}
                                onClick={() => handleReviewProfileRequest(req.id, 'Rejected')}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer transition flex items-center gap-1 disabled:opacity-50"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Reject Proposal
                              </button>
                              <button
                                disabled={actioningId === req.id}
                                onClick={() => handleReviewProfileRequest(req.id, 'Approved')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer transition flex items-center gap-1 disabled:opacity-50 shadow-xs"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Approve & Update Profile
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* DIRECT PROFILE EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col my-auto max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-4 py-3.5 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Direct Profile Modification
                </h3>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEditedProfile} className="p-4 space-y-3.5 overflow-y-auto">
              <div>
                <p className="text-[10px] text-slate-400 mb-2">
                  Directly editing the structural registry record for <span className="font-bold text-slate-700">{editingUser.name}</span>. Modifying these fields bypasses the staff request approval cycle.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Full Name</label>
                <input 
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Professional Email</label>
                <input 
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Company Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-slate-500"
                  >
                    <option value="Drafter">Drafter</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                    <option value="Requester">Requester</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Supervisor Name</label>
                  <select
                    value={editSupervisor}
                    onChange={(e) => setEditSupervisor(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-500"
                  >
                    <option value="">None Assigned</option>
                    {editSupervisor && !usersList.some(u => u.name === editSupervisor && u.status === 'Approved') && (
                      <option value={editSupervisor}>{editSupervisor} (Previous/Custom)</option>
                    )}
                    {usersList
                      .filter(u => u.status === 'Approved')
                      .map(u => (
                        <option key={u.uid} value={u.name}>
                          {u.name} ({u.role || 'User'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Assigned Projects</label>
                <div className="border border-slate-200 rounded p-2 max-h-[85px] overflow-y-auto space-y-1.5 bg-slate-50/50">
                  {projects.map(p => {
                    const isChecked = editProjectIds.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-[10px] text-slate-600 font-medium cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setEditProjectIds(editProjectIds.filter(id => id !== p.id));
                            } else {
                              setEditProjectIds([...editProjectIds, p.id]);
                            }
                          }}
                        />
                        <span>{p.name}</span>
                      </label>
                    );
                  })}
                  {projects.length === 0 && (
                    <span className="text-[9px] text-slate-400 italic">No registered projects available</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-extrabold flex items-center gap-0.5"><CalendarDays className="w-3 h-3 text-slate-400" /> ENGAGEMENT DATE</label>
                  <input 
                    type="date"
                    value={editDateOfEngagement}
                    onChange={(e) => setEditDateOfEngagement(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-1 col-span-1">
                    <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">RATE</label>
                    <input 
                      type="number"
                      min="0"
                      step="any"
                      value={editRate}
                      onChange={(e) => setEditRate(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1 col-span-1">
                    <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">CURR</label>
                    <select
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-1 py-1.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-slate-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="PHP">PHP (₱)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="SGD">SGD ($)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer transition h-8"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actioningId === editingUser.uid}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer transition h-8 disabled:opacity-50 flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Settings
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
