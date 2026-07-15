import React, { useState, useEffect, useMemo } from 'react';
import { Project, Ticket, HourLog, RegistryUser } from './types';
import {
  getProjects,
  saveProjects,
  getTickets,
  saveTickets,
  getHourLogs,
  saveHourLogs,
  getUsers,
  saveUsers,
  getDaysDiff
} from './utils/storage';

// Import Custom Modular Components
import GanttChart from './components/GanttChart';
import SheetsReport from './components/SheetsReport';
import ProjectForm from './components/ProjectForm';
import TicketModal from './components/TicketModal';
import StructureExplorer from './components/StructureExplorer';
import TeamRegistry from './components/TeamRegistry';
import SimulatedEmailDispatch, { SimulatedEmail } from './components/SimulatedEmailDispatch';
import PayrollManager from './components/PayrollManager';
import UserAuth from './components/UserAuth';
import AdminPanel from './components/AdminPanel';
import MyProfile from './components/MyProfile';
import { initAuth, googleSignIn, logout, sendGmailEmail } from './utils/googleAuth';
import { 
  auth, 
  db, 
  AppUser, 
  subscribeToAppUser, 
  seedInitialDatabase, 
  fetchProjectsDb, 
  saveProjectDb, 
  deleteProjectDb, 
  fetchTicketsDb, 
  saveTicketDb, 
  deleteTicketDb, 
  fetchHourLogsDb, 
  saveHourLogDb, 
  deleteHourLogDb, 
  fetchRegistryUsersDb, 
  saveRegistryUserDb, 
  deleteRegistryUserDb,
  logoutUser,
  isDefaultAdminEmail,
  pullAllFromGoogleSheets
} from './utils/firebase';


import {
  FolderPlus,
  Plus,
  Clock,
  Briefcase,
  AlertCircle,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  ChevronRight,
  Sparkles,
  Layers,
  ChevronDown,
  UserCheck,
  Users,
  Mail,
  Trash2,
  Archive,
  Coins,
  LogOut,
  ShieldAlert
} from 'lucide-react';

export default function App() {
  // --- Persistent State ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [hourLogs, setHourLogs] = useState<HourLog[]>([]);
  const [users, setUsers] = useState<RegistryUser[]>([]);
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // --- Workspace App Auth States ---
  const [currentAppUser, setCurrentAppUser] = useState<AppUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingDb, setLoadingDb] = useState(false);

  // --- Google Auth States (For Gmail sending) ---
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  // --- Modal/UI Control States ---
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [currentTab, setCurrentTab] = useState<'structure' | 'timeline' | 'spreadsheet' | 'productivity' | 'registry' | 'payroll' | 'admin'>('structure');

  // --- Google Sheets Sync States ---
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [sheetsConnected, setSheetsConnected] = useState(false);

  // --- Quick Add Prefill State ---
  const [preFillData, setPreFillData] = useState<{ level?: string; component?: string } | null>(null);

  const isAllowedToCustomize = useMemo(() => {
    if (!currentAppUser) return false;
    const roleLower = (currentAppUser.role || '').toLowerCase();
    return currentAppUser.isAdmin || currentAppUser.role === 'Admin' || (!roleLower.includes('drafter') && currentAppUser.role !== 'User');
  }, [currentAppUser]);

  // --- Initialize State on Mount ---
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Unsubscribe from previous profile subscription if any
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        // Subscribe to live profile changes in Firestore
        unsubscribeProfile = subscribeToAppUser(firebaseUser.uid, async (appUser) => {
          if (appUser) {
            setCurrentAppUser(appUser);
            
            // If approved, fetch/sync the DB!
            if (appUser.status === 'Approved') {
              setLoadingDb(true);
              try {
                // Ensure the database is seeded if empty
                // We'll read the local storage versions as initial structures
                const localProjects = getProjects();
                const localTickets = getTickets();
                const localLogs = getHourLogs();
                const localUsers = getUsers();
                
                await seedInitialDatabase(localProjects, localTickets, localLogs, localUsers);
                
                // Fetch latest from Firestore
                const dbProjects = await fetchProjectsDb();
                const dbTickets = await fetchTicketsDb();
                const dbHourLogs = await fetchHourLogsDb();
                const dbRegistryUsers = await fetchRegistryUsersDb();
                
                setProjects(dbProjects);
                setTickets(dbTickets);
                setHourLogs(dbHourLogs);
                setUsers(dbRegistryUsers);
                
                if (dbProjects.length > 0) {
                  setSelectedProjectId(prev => prev || dbProjects[0].id);
                }
              } catch (err) {
                console.error('Error synchronizing database:', err);
              } finally {
                setLoadingDb(false);
              }
            }
          } else {
            // User exists in auth but no profile doc in LocalStorage. Let's create one.
            const isAdmin = isDefaultAdminEmail(firebaseUser.email || '');
            const status = isAdmin ? 'Approved' : 'Pending';
            const fallbackUser: AppUser = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown User',
              email: firebaseUser.email || '',
              role: isAdmin ? 'Supervisor' : 'Structural Drafter',
              status,
              isAdmin,
              createdAt: new Date().toISOString()
            };
            try {
              await saveRegistryUserDb({
                id: firebaseUser.uid,
                name: fallbackUser.name,
                email: fallbackUser.email,
                role: fallbackUser.role
              });
              setCurrentAppUser(fallbackUser);
            } catch (err) {
              console.error('Failed to write profile for Google/unregistered user:', err);
            }
          }
          setAuthChecked(true);
        });
      } else {
        // Fallback check for LocalStorage Auth user
        const savedUser = localStorage.getItem('submittal_tracker_active_user');
        if (savedUser) {
          const appUser = JSON.parse(savedUser) as AppUser;
          setCurrentAppUser(appUser);
          
          // Fetch/sync the DB from local files
          setLoadingDb(true);
          try {
            const localProjects = getProjects();
            const localTickets = getTickets();
            const localLogs = getHourLogs();
            const localUsers = getUsers();
            
            setProjects(localProjects);
            setTickets(localTickets);
            setHourLogs(localLogs);
            setUsers(localUsers);
            
            if (localProjects.length > 0) {
              setSelectedProjectId(prev => prev || localProjects[0].id);
            }
          } catch (err) {
            console.error('Error synchronizing local database:', err);
          } finally {
            setLoadingDb(false);
          }
          setAuthChecked(true);
          return;
        }

        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setCurrentAppUser(null);
        setProjects([]);
        setTickets([]);
        setHourLogs([]);
        setUsers([]);
        setAuthChecked(true);
      }
    });

    const loadedEmails = JSON.parse(localStorage.getItem('structtrack_emails') || '[]');
    setEmails(loadedEmails);

    // Initialize Google Auth listener
    const unsubscribeGoogle = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      if (typeof unsubscribeGoogle === 'function') {
        unsubscribeGoogle();
      }
    };
  }, []);

  // --- Google Sheets Sync Effect ---
  useEffect(() => {
    async function syncSheetsData() {
      if (!googleToken) {
        setSheetsConnected(false);
        return;
      }
      setSyncingSheets(true);
      try {
        console.log('Synchronizing with Google Sheet...');
        await pullAllFromGoogleSheets(googleToken);
        setSheetsConnected(true);

        const dbProjects = await fetchProjectsDb();
        const dbTickets = await fetchTicketsDb();
        const dbHourLogs = await fetchHourLogsDb();
        const dbRegistryUsers = await fetchRegistryUsersDb();

        setProjects(dbProjects);
        setTickets(dbTickets);
        setHourLogs(dbHourLogs);
        setUsers(dbRegistryUsers);

        if (dbProjects.length > 0) {
          setSelectedProjectId(prev => {
            const stillExists = dbProjects.some(p => p.id === prev);
            return stillExists ? prev : dbProjects[0].id;
          });
        }
        console.log('Google Sheets synchronization complete!');
      } catch (err) {
        console.error('Failed to sync Google Sheets:', err);
      } finally {
        setSyncingSheets(false);
      }
    }

    syncSheetsData();
  }, [googleToken]);

  // --- Filter projects based on user roles and assignment ---
  // "drafter and supervisor can only view projects that are assigned to them"
  const visibleProjects = useMemo(() => {
    if (!currentAppUser) return [];
    const roleLower = (currentAppUser.role || '').toLowerCase();
    const isAdmin = currentAppUser.isAdmin || roleLower === 'admin' || roleLower === 'manager';
    if (isAdmin) {
      return projects;
    }
    // Drafter and supervisor can only view projects that are assigned to them
    const isDrafter = roleLower.includes('drafter') || roleLower === 'structural drafter';
    const isSupervisor = roleLower === 'supervisor';
    if (isDrafter || isSupervisor) {
      const assignedIds = currentAppUser.projectIds || [];
      return projects.filter(p => assignedIds.includes(p.id));
    }
    return projects;
  }, [projects, currentAppUser]);

  const canManageProject = useMemo(() => {
    if (!currentAppUser) return false;
    const roleLower = (currentAppUser.role || '').toLowerCase();
    const isAdmin = currentAppUser.isAdmin || roleLower === 'admin' || roleLower === 'manager';
    const isSupervisor = roleLower === 'supervisor';
    return isAdmin || isSupervisor;
  }, [currentAppUser]);

  const canCreateTicket = useMemo(() => {
    if (!currentAppUser) return false;
    const roleLower = (currentAppUser.role || '').toLowerCase();
    const isAdmin = currentAppUser.isAdmin || roleLower === 'admin' || roleLower === 'manager';
    const isSupervisor = roleLower === 'supervisor';
    const isRequester = roleLower === 'requester';
    return isAdmin || isSupervisor || isRequester;
  }, [currentAppUser]);

  // Sync selectedProjectId with visibleProjects
  useEffect(() => {
    if (visibleProjects.length > 0) {
      setSelectedProjectId(prev => {
        const stillVisible = visibleProjects.some(p => p.id === prev);
        return stillVisible ? prev : visibleProjects[0].id;
      });
    } else {
      setSelectedProjectId('');
    }
  }, [visibleProjects]);

  // --- Get currently active project ---
  const activeProject = useMemo(() => {
    return visibleProjects.find(p => p.id === selectedProjectId) || visibleProjects[0] || null;
  }, [visibleProjects, selectedProjectId]);

  // --- Project Filtered Tickets ---
  const activeProjectTickets = useMemo(() => {
    if (!activeProject) return [];
    return tickets.filter(t => t.projectId === activeProject.id);
  }, [tickets, activeProject]);

  // --- KPI Computations ---
  const kpis = useMemo(() => {
    const projTickets = activeProjectTickets;
    const completed = projTickets.filter(t => t.status === 'Completed');
    
    // 1. Total logged hours for this project
    const projTicketIds = projTickets.map(t => t.id);
    const projLogs = hourLogs.filter(log => projTicketIds.includes(log.ticketId));
    const totalHours = projLogs.reduce((sum, log) => sum + log.hours, 0);

    // 2. Average 3rd-party Peer Review Turnaround
    let peerTurnaroundSum = 0;
    let peerTurnaroundCount = 0;
    projTickets.forEach(t => {
      if (t.actualSubmissionDate && t.thirdPartyResponseDate) {
        const diff = getDaysDiff(t.actualSubmissionDate, t.thirdPartyResponseDate);
        if (diff !== null && diff >= 0) {
          peerTurnaroundSum += diff;
          peerTurnaroundCount++;
        }
      }
    });
    const avgPeerTurnaround = peerTurnaroundCount > 0 ? (peerTurnaroundSum / peerTurnaroundCount).toFixed(1) : '0.0';

    // 3. Average Govt review turnaround
    let govTurnaroundSum = 0;
    let govTurnaroundCount = 0;
    projTickets.forEach(t => {
      if (t.govSubmissionDate && t.govResponseDate) {
        const diff = getDaysDiff(t.govSubmissionDate, t.govResponseDate);
        if (diff !== null && diff >= 0) {
          govTurnaroundSum += diff;
          govTurnaroundCount++;
        }
      }
    });
    const avgGovTurnaround = govTurnaroundCount > 0 ? (govTurnaroundSum / govTurnaroundCount).toFixed(1) : '0.0';

    // 4. Pending Submissions to Peer Review
    const pendingCount = projTickets.filter(t => t.status === 'Pending Submission').length;

    // 5. Total items under peer or govt review right now
    const underReviewCount = projTickets.filter(t => t.status.includes('Under Review')).length;

    // 6. Project Completion Progress
    const completionPercent = projTickets.length > 0 
      ? Math.round((completed.length / projTickets.length) * 100) 
      : 0;

    return {
      totalHours,
      avgPeerTurnaround,
      avgGovTurnaround,
      pendingCount,
      underReviewCount,
      completionPercent,
      completedCount: completed.length,
      totalCount: projTickets.length
    };
  }, [activeProjectTickets, hourLogs]);

  // --- Hour logs broken down by assignee for productivity charts ---
  const productivityStats = useMemo(() => {
    const projTickets = activeProjectTickets;
    const projTicketIds = projTickets.map(t => t.id);
    const projLogs = hourLogs.filter(log => projTicketIds.includes(log.ticketId));

    // Aggregate Hours per Assignee
    const assigneeMap: { [name: string]: number } = {};
    projLogs.forEach(log => {
      const name = log.user || 'Unknown';
      assigneeMap[name] = (assigneeMap[name] || 0) + log.hours;
    });

    // Aggregate Hours per Ticket / Task
    const ticketMap: { [code: string]: { title: string; hours: number } } = {};
    projLogs.forEach(log => {
      const t = projTickets.find(ticket => ticket.id === log.ticketId);
      if (t) {
        if (!ticketMap[t.ticketCode]) {
          ticketMap[t.ticketCode] = { title: t.title, hours: 0 };
        }
        ticketMap[t.ticketCode].hours += log.hours;
      }
    });

    const assigneeData = Object.entries(assigneeMap).map(([name, hours]) => ({ name, hours }));
    const ticketData = Object.entries(ticketMap).map(([code, data]) => ({ code, title: data.title, hours: data.hours }));

    return {
      assigneeData,
      ticketData
    };
  }, [activeProjectTickets, hourLogs]);

  // --- Automated Email Notification Simulation ---
  const triggerEmailNotification = (
    action: 'created' | 'updated' | 'revision' | 'hours',
    ticket: Ticket,
    customMessage?: string
  ) => {
    const user = users.find(u => u.name.toLowerCase() === ticket.assignee.toLowerCase());
    const recipientEmail = user?.email || `${ticket.assignee.toLowerCase().replace(/\s+/g, '.')}@structural-eng.com`;
    const recipientName = user?.name || ticket.assignee;

    let subject = '';
    let body = '';

    if (action === 'created') {
      subject = `[StructTrack] NEW SUBMITTAL ASSIGNED: Ticket #${ticket.ticketCode}`;
      body = `Hi ${recipientName},

A new submittal ticket has been created and assigned to you on project: "${activeProject?.name || 'Active Project'}" (${activeProject?.code}).

DETAILS:
--------------------------------------------------
Ticket Code:  #${ticket.ticketCode}
Title:        ${ticket.title}
Level:        ${ticket.structureLevel || 'Substructure'}
Component:    ${ticket.structureComponent || 'Foundations'}
Start Date:   ${ticket.startDate}
Target Date:  ${ticket.targetSubmissionDate}
Status:       ${ticket.status}

REMARKS / SPECIFICATIONS:
"${ticket.remarks || 'No remarks provided.'}"

Please review the requirements in your dashboard and log your labor hours accordingly as work progresses.

Best regards,
StructTrack Notification Engine`;
    } else if (action === 'updated') {
      subject = `[StructTrack] TICKET UPDATED: Ticket #${ticket.ticketCode}`;
      body = `Hi ${recipientName},

The submittal ticket #${ticket.ticketCode} ("${ticket.title}") has been updated in project: "${activeProject?.name}".

LATEST DETAILS:
--------------------------------------------------
Status:       ${ticket.status}
Level:        ${ticket.structureLevel || 'Substructure'}
Component:    ${ticket.structureComponent || 'Foundations'}
Target Date:  ${ticket.targetSubmissionDate}
Completed:    ${ticket.completionDate || 'Not yet'}

LATEST PEER REMARKS:
"${ticket.remarks || 'No remarks provided.'}"

HISTORY LOG:
${ticket.history[ticket.history.length - 1] || 'Ticket updated.'}

Best regards,
StructTrack Notification Engine`;
    } else if (action === 'revision') {
      subject = `[StructTrack] REVISION INITIALIZED: Ticket #${ticket.ticketCode}`;
      body = `Hi ${recipientName},

A new revision ticket (${ticket.ticketCode}) has been generated per your request for item #${ticket.itemNumber} under project "${activeProject?.name}".

DETAILS:
--------------------------------------------------
Revision Code: #${ticket.ticketCode}
Base Title:    ${ticket.title}
Level:         ${ticket.structureLevel || 'Substructure'}
Component:     ${ticket.structureComponent || 'Foundations'}
Start Date:    ${ticket.startDate}
Target Date:   ${ticket.targetSubmissionDate}

Best regards,
StructTrack Notification Engine`;
    } else if (action === 'hours') {
      subject = `[StructTrack] HOURS LOGGED: Ticket #${ticket.ticketCode}`;
      body = `Hi ${recipientName},

Productivity labor hours have been successfully logged on Ticket #${ticket.ticketCode} ("${ticket.title}").

LOG DETAILS:
--------------------------------------------------
${customMessage || 'Drafting hours logged'}

Cumulative hours logged for this specific ticket are tracked in real-time in your dashboard.

Best regards,
StructTrack Notification Engine`;
    }

    const newEmail: SimulatedEmail = {
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipientName,
      recipientEmail,
      subject,
      body,
      timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      actionType: action
    };

    handleDispatchEmail(newEmail);
  };

  // --- Google Auth & Gmail Integration Handlers ---
  const handleGoogleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
      }
    } catch (err) {
      console.error('Sign-in failed:', err);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  const handleDispatchEmail = async (newEmail: SimulatedEmail) => {
    let deliveryStatus: 'Simulated' | 'SentViaGmail' | 'Error' = 'Simulated';
    let deliveryError: string | undefined;

    // Use a snapshot of googleToken if it exists
    if (googleToken) {
      try {
        await sendGmailEmail(googleToken, 'me', newEmail.recipientEmail, newEmail.subject, newEmail.body);
        deliveryStatus = 'SentViaGmail';
      } catch (err: any) {
        console.error('Failed to send email via Gmail API:', err);
        deliveryStatus = 'Error';
        deliveryError = err.message || String(err);
      }
    }

    const finalEmail: SimulatedEmail = { ...newEmail, deliveryStatus, deliveryError };
    setEmails(prev => {
      const updated = [...prev, finalEmail];
      localStorage.setItem('structtrack_emails', JSON.stringify(updated));
      return updated;
    });
  };

  const handleResendEmail = async (email: SimulatedEmail) => {
    if (!googleToken) {
      throw new Error('Please sign in to Google to send emails.');
    }
    await sendGmailEmail(googleToken, 'me', email.recipientEmail, email.subject, email.body);
    
    // Update state & storage
    setEmails(prev => {
      const updated = prev.map(e => e.id === email.id ? { ...e, deliveryStatus: 'SentViaGmail', deliveryError: undefined } : e);
      localStorage.setItem('structtrack_emails', JSON.stringify(updated));
      return updated;
    });
  };

  // --- Handlers ---
  const handleCreateProject = async (newProject: Project) => {
    const updated = [...projects, newProject];
    setProjects(updated);
    setSelectedProjectId(newProject.id);
    try {
      await saveProjectDb(newProject);
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) return;

    if (confirm(`Are you sure you want to permanently delete project "${projectToDelete.name}" (${projectToDelete.code})? This will also remove all its submittals and log entries.`)) {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);

      const updatedTickets = tickets.filter(t => t.projectId !== projectId);
      setTickets(updatedTickets);

      const deletedTicketIds = tickets.filter(t => t.projectId === projectId).map(t => t.id);
      const updatedHourLogs = hourLogs.filter(log => !deletedTicketIds.includes(log.ticketId));
      setHourLogs(updatedHourLogs);

      if (updatedProjects.length > 0) {
        setSelectedProjectId(updatedProjects[0].id);
      } else {
        setSelectedProjectId('');
      }

      // Local and Sheets deletion
      try {
        await deleteProjectDb(projectId);
        for (const tId of deletedTicketIds) {
          await deleteTicketDb(tId);
        }
        for (const log of hourLogs) {
          if (deletedTicketIds.includes(log.ticketId)) {
            await deleteHourLogDb(log.id);
          }
        }
      } catch (err) {
        console.error('Failed to delete project / cascading data:', err);
      }
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, newStatus: Project['status']) => {
    const updatedProjects = projects.map(p => {
      if (p.id === projectId) {
        const updated = { ...p, status: newStatus };
        saveProjectDb(updated).catch(err => console.error('Error saving project status:', err));
        return updated;
      }
      return p;
    });
    setProjects(updatedProjects);
  };

  const handleUpdateProject = async (
    updatedProject: Project,
    levelRename?: { oldName: string; newName: string },
    levelDelete?: string,
    componentRename?: { oldName: string; newName: string; levelName?: string },
    componentDelete?: string,
    componentDeleteLevelName?: string
  ) => {
    const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    setProjects(updatedProjects);
    
    try {
      await saveProjectDb(updatedProject);
    } catch (err) {
      console.error('Error saving project:', err);
    }

    let updatedTickets = [...tickets];
    let ticketsChanged = false;

    if (levelRename) {
      updatedTickets = updatedTickets.map(t => {
        if (t.projectId === updatedProject.id && t.structureLevel === levelRename.oldName) {
          ticketsChanged = true;
          const uTicket = { ...t, structureLevel: levelRename.newName };
          saveTicketDb(uTicket).catch(err => console.error(err));
          return uTicket;
        }
        return t;
      });
    }

    if (levelDelete) {
      const fallbackLevel = updatedProject.structuralLevels?.[0] || 'Substructure';
      updatedTickets = updatedTickets.map(t => {
        if (t.projectId === updatedProject.id && t.structureLevel === levelDelete) {
          ticketsChanged = true;
          const uTicket = { ...t, structureLevel: fallbackLevel };
          saveTicketDb(uTicket).catch(err => console.error(err));
          return uTicket;
        }
        return t;
      });
    }

    if (componentRename) {
      updatedTickets = updatedTickets.map(t => {
        const matchesProject = t.projectId === updatedProject.id;
        const matchesLevel = componentRename.levelName ? t.structureLevel === componentRename.levelName : true;
        const matchesComponent = t.structureComponent === componentRename.oldName;
        if (matchesProject && matchesLevel && matchesComponent) {
          ticketsChanged = true;
          const uTicket = { ...t, structureComponent: componentRename.newName };
          saveTicketDb(uTicket).catch(err => console.error(err));
          return uTicket;
        }
        return t;
      });
    }

    if (componentDelete) {
      updatedTickets = updatedTickets.map(t => {
        const matchesProject = t.projectId === updatedProject.id;
        const matchesLevel = componentDeleteLevelName ? t.structureLevel === componentDeleteLevelName : true;
        const matchesComponent = t.structureComponent === componentDelete;
        if (matchesProject && matchesLevel && matchesComponent) {
          ticketsChanged = true;
          const uTicket = { ...t, structureComponent: 'Other Components' };
          saveTicketDb(uTicket).catch(err => console.error(err));
          return uTicket;
        }
        return t;
      });
    }

    if (ticketsChanged) {
      setTickets(updatedTickets);
    }
  };

  const handleSaveTicket = async (savedTicket: Ticket, selectAfterSave?: boolean) => {
    const exists = tickets.some(t => t.id === savedTicket.id);
    let updated: Ticket[];
    if (exists) {
      updated = tickets.map(t => (t.id === savedTicket.id ? savedTicket : t));
    } else {
      updated = [...tickets, savedTicket];
    }
    setTickets(updated);
    
    try {
      await saveTicketDb(savedTicket);
    } catch (err) {
      console.error('Error saving ticket:', err);
    }

    if (selectAfterSave) {
      setActiveTicket(savedTicket);
    } else {
      setIsTicketModalOpen(false);
      setActiveTicket(null);
      setPreFillData(null);
    }

    // Trigger notification
    if (exists) {
      const original = tickets.find(t => t.id === savedTicket.id);
      if (original && original.revision !== savedTicket.revision) {
        triggerEmailNotification('revision', savedTicket);
      } else {
        triggerEmailNotification('updated', savedTicket);
      }
    } else {
      if (savedTicket.revision > 0) {
        triggerEmailNotification('revision', savedTicket);
      } else {
        triggerEmailNotification('created', savedTicket);
      }
    }
  };

  const handleLogHours = async (hours: number, date: string, description: string) => {
    if (!activeTicket) return;

    const newLog: HourLog = {
      id: `h_${Date.now()}`,
      ticketId: activeTicket.id,
      hours,
      date,
      description,
      user: activeTicket.assignee
    };

    const updatedLogs = [...hourLogs, newLog];
    setHourLogs(updatedLogs);
    
    try {
      await saveHourLogDb(newLog);
    } catch (err) {
      console.error('Error saving hour log:', err);
    }

    // Add logging details to the ticket's history log
    const updatedTicket: Ticket = {
      ...activeTicket,
      history: [
        ...activeTicket.history,
        `Logged ${hours} productivity hours on ${date}: "${description}" by ${activeTicket.assignee}`
      ]
    };

    // Save ticket state
    const updatedTickets = tickets.map(t => (t.id === updatedTicket.id ? updatedTicket : t));
    setTickets(updatedTickets);
    try {
      await saveTicketDb(updatedTicket);
    } catch (err) {
      console.error('Error saving ticket history log:', err);
    }

    // Trigger notification
    triggerEmailNotification('hours', updatedTicket, `${hours} hours on ${date} - ${description}`);
  };

  // --- Registry Management Handlers ---
  const handleAddUser = async (newUser: RegistryUser) => {
    const updated = [...users, newUser];
    setUsers(updated);
    try {
      await saveRegistryUserDb(newUser);
    } catch (err) {
      console.error('Error adding registry user:', err);
    }
  };

  const handleRemoveUser = async (id: string) => {
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    try {
      await deleteRegistryUserDb(id);
    } catch (err) {
      console.error('Error deleting registry user:', err);
    }
  };

  const handleUpdateUserProjects = async (userId: string, projectIds: string[]) => {
    const updated = users.map(u => u.id === userId ? { ...u, projectIds } : u);
    setUsers(updated);
    const targetUser = updated.find(u => u.id === userId);
    if (targetUser) {
      try {
        await saveRegistryUserDb(targetUser);
      } catch (err) {
        console.error('Error updating registry user projects:', err);
      }
    }
  };

  // Workspace Auth Sign out handler
  const handleAppLogout = async () => {
    try {
      await logoutUser();
      setCurrentAppUser(null);
      setCurrentTab('structure');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const handleClearEmails = () => {
    setEmails([]);
    localStorage.removeItem('structtrack_emails');
  };

  const handleOpenEditTicket = (ticket: Ticket) => {
    setActiveTicket(ticket);
    setPreFillData(null);
    setIsTicketModalOpen(true);
  };

  const handleOpenNewTicket = () => {
    setActiveTicket(null);
    setPreFillData(null);
    setIsTicketModalOpen(true);
  };

  // Handler triggered by Quick Add from Structure Explorer
  const handleQuickAddTicket = (level: string, component: string) => {
    setPreFillData({ level, component });
    setActiveTicket(null);
    setIsTicketModalOpen(true);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-medium text-slate-400">Loading StructTrack Pro...</p>
      </div>
    );
  }

  if (!currentAppUser || currentAppUser.status !== 'Approved') {
    return (
      <UserAuth 
        currentUser={currentAppUser} 
        onLogout={handleAppLogout} 
      />
    );
  }

  return (
    <div id="main-layout" className="flex flex-col md:flex-row h-screen w-full bg-[#F1F5F9] font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        {/* Title block with S Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shrink-0">S</div>
          <span className="font-semibold text-white tracking-tight">StructTrack Pro</span>
        </div>

        {/* Active Project Card inside Sidebar */}
        <div className="p-4 bg-slate-800/50">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Project</label>
          {visibleProjects.length > 0 ? (
            <div className="mt-1.5 relative">
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full pr-8 pl-2.5 py-1.5 bg-slate-800 text-white rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer border border-slate-700 appearance-none"
              >
                {visibleProjects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <div className="mt-1 text-xs text-rose-400 font-medium">No assigned projects.</div>
          )}
        </div>

        {/* Navigation links with active tab highlight */}
        <nav className="flex-1 py-2 overflow-y-auto space-y-0.5">
          <div className="px-4 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Project Views</div>
          
          <button
            onClick={() => setCurrentTab('structure')}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-all cursor-pointer border-l-4 ${
              currentTab === 'structure'
                ? 'bg-blue-600/10 text-blue-400 border-blue-600 font-bold'
                : 'border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            Project View (Structure)
          </button>

          <button
            onClick={() => setCurrentTab('timeline')}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-all cursor-pointer border-l-4 ${
              currentTab === 'timeline'
                ? 'bg-blue-600/10 text-blue-400 border-blue-600 font-bold'
                : 'border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            Gantt & Calendar
          </button>
          
          <button
            onClick={() => setCurrentTab('spreadsheet')}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-all cursor-pointer border-l-4 ${
              currentTab === 'spreadsheet'
                ? 'bg-blue-600/10 text-blue-400 border-blue-600 font-bold'
                : 'border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            Drawing Register (Sheets)
          </button>
          
          <button
            onClick={() => setCurrentTab('productivity')}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-all cursor-pointer border-l-4 ${
              currentTab === 'productivity'
                ? 'bg-blue-600/10 text-blue-400 border-blue-600 font-bold'
                : 'border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            Labor Productivity
          </button>

          <div className="px-4 py-1 pt-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Directory</div>
          
          <button
            onClick={() => setCurrentTab('registry')}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-all cursor-pointer border-l-4 ${
              currentTab === 'registry'
                ? 'bg-blue-600/10 text-blue-400 border-blue-600 font-bold'
                : 'border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            Team Registry
          </button>
          
          <button
            onClick={() => setCurrentTab('payroll')}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-all cursor-pointer border-l-4 ${
              currentTab === 'payroll'
                ? 'bg-blue-600/10 text-blue-400 border-blue-600 font-bold'
                : 'border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            id="tab-payroll"
          >
            <Coins className="w-4 h-4 shrink-0" />
            Weekly Payroll
          </button>

          <button
            onClick={() => setCurrentTab('profile' as any)}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-all cursor-pointer border-l-4 ${
              currentTab === ('profile' as any)
                ? 'bg-blue-600/10 text-blue-400 border-blue-600 font-bold'
                : 'border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            id="tab-my-profile"
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            My Profile
          </button>

          {currentAppUser?.isAdmin && (
            <>
              <div className="px-4 py-1 pt-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Administration</div>
              <button
                onClick={() => setCurrentTab('admin')}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-all cursor-pointer border-l-4 ${
                  currentTab === 'admin'
                    ? 'bg-blue-600/10 text-blue-400 border-blue-600 font-bold'
                    : 'border-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                User Approvals
              </button>
            </>
          )}
          
          {canManageProject && (
            <>
              <div className="pt-4 px-4 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Actions</div>
              <button
                onClick={() => setIsProjectFormOpen(true)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-blue-500 shrink-0" />
                Project Setup (Add)
              </button>
            </>
          )}
        </nav>

        {/* Small brand footer inside sidebar */}
        <div className="p-3 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono text-center uppercase tracking-wider">
          STRUCTTRACK PRO v1.2
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-semibold text-slate-900 tracking-tight font-sans">
              {activeProject ? `Project Board: ${activeProject.name}` : 'Submittal Progress'}
            </h1>
            {activeProject ? (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                activeProject.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                activeProject.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                activeProject.status === 'On Hold' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {activeProject.status}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">
                NO PROJECTS
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeProject && (
              <>
                {canCreateTicket && (
                  <button
                    onClick={handleOpenNewTicket}
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Submittal
                  </button>
                )}

                {/* Project Status Selector (Close / Complete / Hold) */}
                <div className="flex items-center gap-1 border border-slate-300 rounded bg-white px-2 py-1 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">Status:</span>
                  <select
                    value={activeProject.status}
                    onChange={e => handleUpdateProjectStatus(activeProject.id, e.target.value as Project['status'])}
                    className="bg-transparent text-slate-700 text-xs font-bold uppercase tracking-wider focus:outline-none cursor-pointer pr-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    id="project-status-selector"
                    disabled={!canManageProject}
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {/* Delete / Remove Project Button */}
                {canManageProject && (
                  <button
                    onClick={() => handleDeleteProject(activeProject.id)}
                    className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                    title="Delete Project permanently"
                    id="btn-delete-project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Project
                  </button>
                )}
              </>
            )}
            {canManageProject && (
              <button
                onClick={() => setIsProjectFormOpen(true)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 cursor-pointer uppercase tracking-wider"
              >
                Setup Project
              </button>
            )}

            {/* Workspace App User Badge & Logout */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200 ml-1 shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase tracking-tight shrink-0 select-none">
                {currentAppUser?.name ? currentAppUser.name.slice(0, 2) : 'U'}
              </div>
              <div className="hidden md:block text-left select-none">
                <p className="text-[11px] font-bold text-slate-900 leading-tight truncate max-w-[120px]" title={currentAppUser?.name}>
                  {currentAppUser?.name}
                </p>
                <p className="text-[9px] font-semibold text-slate-400 uppercase leading-none mt-0.5">
                  {currentAppUser?.isAdmin ? 'Admin' : currentAppUser?.role || 'User'}
                </p>
              </div>
              <button
                onClick={handleAppLogout}
                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                title="Log Out"
                id="btn-workspace-sign-out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {currentTab === 'admin' ? (
            <div id="active-tab-canvas" className="flex-1">
              <AdminPanel 
                currentUser={currentAppUser}
                projects={projects}
                hourLogs={hourLogs}
                tickets={tickets}
                users={users}
              />
            </div>
          ) : (currentTab as string) === 'profile' ? (
            <div id="active-tab-canvas" className="flex-1">
              <MyProfile 
                currentUser={currentAppUser}
                projects={projects}
                users={users}
              />
            </div>
          ) : activeProject ? (
            <>
              {/* Active Project details row */}
              <div className="bg-white p-3 border border-slate-200 rounded shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium">
                    {activeProject.description || 'Structural project management and review turnaround tracker.'}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                    <span>START: <strong className="text-slate-600">{activeProject.startDate}</strong></span>
                    <span>•</span>
                    <span>TARGET: <strong className="text-slate-600">{activeProject.targetCompletionDate}</strong></span>
                  </div>
                </div>
                {activeProject.requiredSubmissions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeProject.requiredSubmissions.map((gate, i) => (
                      <span key={i} className="text-[9px] bg-slate-50 text-slate-500 border border-slate-200 font-bold uppercase px-2 py-0.5 rounded tracking-wider">
                        {gate}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* KPI Summary Deck */}
              <div id="kpi-deck" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-3 border border-slate-200 rounded shadow-sm">
                  <div className="text-slate-500 text-[10px] font-bold uppercase">Total Submittals</div>
                  <div className="text-2xl font-bold mt-1 text-slate-900 font-mono">
                    {kpis.totalCount} <span className="text-xs font-normal text-slate-400">items</span>
                  </div>
                </div>
                <div className="bg-white p-3 border border-slate-200 rounded shadow-sm">
                  <div className="text-slate-500 text-[10px] font-bold uppercase">Avg Peer Turnaround</div>
                  <div className="text-2xl font-bold mt-1 text-blue-600 font-mono">
                    {kpis.avgPeerTurnaround !== 'N/A' ? kpis.avgPeerTurnaround : '0.0'}{' '}
                    <span className="text-xs font-normal text-slate-400">Days</span>
                  </div>
                </div>
                <div className="bg-white p-3 border border-slate-200 rounded shadow-sm">
                  <div className="text-slate-500 text-[10px] font-bold uppercase">Avg Govt Turnaround</div>
                  <div className="text-2xl font-bold mt-1 text-purple-600 font-mono">
                    {kpis.avgGovTurnaround !== 'N/A' ? kpis.avgGovTurnaround : '0.0'}{' '}
                    <span className="text-xs font-normal text-slate-400">Days</span>
                  </div>
                </div>
                <div className="bg-white p-3 border border-slate-200 rounded shadow-sm">
                  <div className="text-slate-500 text-[10px] font-bold uppercase">Labor Effort</div>
                  <div className="text-2xl font-bold mt-1 text-rose-500 font-mono">
                    {kpis.totalHours} <span className="text-xs font-normal text-slate-400">Hrs</span>
                  </div>
                </div>
              </div>

              {/* Core Active Tab Render Container */}
              <div id="active-tab-canvas" className="flex-1">
                {currentTab === 'structure' && (
                  <StructureExplorer
                    tickets={activeProjectTickets}
                    onTicketClick={handleOpenEditTicket}
                    onQuickAddTicket={handleQuickAddTicket}
                    project={activeProject}
                    onUpdateProject={handleUpdateProject}
                    isAllowedToCustomize={isAllowedToCustomize}
                  />
                )}

                {currentTab === 'timeline' && (
                  <div className="space-y-4">
                    <GanttChart
                      tickets={activeProjectTickets}
                      projectStartDate={activeProject.startDate}
                      projectEndDate={activeProject.targetCompletionDate}
                      onTicketClick={handleOpenEditTicket}
                      levels={activeProject.structuralLevels}
                      components={activeProject.structuralComponents}
                    />
                    <p className="text-center text-[10px] text-slate-400 italic">💡 Hint: Clicking on any submittal row in the Gantt or block in the Calendar opens the specification logs.</p>
                  </div>
                )}

                {currentTab === 'spreadsheet' && (
                  <SheetsReport
                    project={activeProject}
                    tickets={tickets}
                    hourLogs={hourLogs}
                  />
                )}

                {currentTab === 'productivity' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Productivity Column Chart 1: Hours by Draftsperson */}
                    <div className="bg-white rounded border border-slate-200 p-4 shadow-sm space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                          Labor Allocation by Draftsperson
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Productivity tracking across structural drafters.</p>
                      </div>

                      <div className="space-y-3">
                        {productivityStats.assigneeData.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-6">No hours logged yet for active project tasks.</p>
                        ) : (
                          productivityStats.assigneeData.map((data, i) => {
                            const maxHrs = Math.max(...productivityStats.assigneeData.map(d => d.hours), 1);
                            const pct = (data.hours / maxHrs) * 100;
                            return (
                              <div key={i} className="space-y-1">
                                <div className="flex justify-between text-xs font-medium text-slate-700">
                                  <span>{data.name}</span>
                                  <span className="font-mono text-blue-600 font-bold">{data.hours} hrs</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                                  <div
                                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Productivity Column Chart 2: Hours by Ticket Item */}
                    <div className="bg-white rounded border border-slate-200 p-4 shadow-sm space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                          Effort Allocation by Submittal Item
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Comparing total labor hours spent per drafting task.</p>
                      </div>

                      <div className="space-y-3">
                        {productivityStats.ticketData.length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-6">No hours logged yet for active project tasks.</p>
                        ) : (
                          productivityStats.ticketData.map((data, i) => {
                            const maxHrs = Math.max(...productivityStats.ticketData.map(d => d.hours), 1);
                            const pct = (data.hours / maxHrs) * 100;
                            return (
                              <div key={i} className="space-y-1">
                                <div className="flex justify-between text-xs font-medium text-slate-700">
                                  <span className="truncate max-w-[180px]" title={data.title}>
                                    Ticket #{data.code} - {data.title}
                                  </span>
                                  <span className="font-mono text-emerald-600 font-bold">{data.hours} hrs</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {currentTab === 'payroll' && (
                  <div className="space-y-4">
                    <PayrollManager
                      users={users}
                      tickets={tickets}
                      hourLogs={hourLogs}
                      projects={projects}
                      currentUser={currentAppUser}
                      onTriggerEmail={handleDispatchEmail}
                    />
                    <SimulatedEmailDispatch
                      emails={emails}
                      onClear={handleClearEmails}
                      googleUser={googleUser}
                      googleToken={googleToken}
                      onGoogleSignIn={handleGoogleSignIn}
                      onGoogleSignOut={handleGoogleSignOut}
                      onResendEmail={handleResendEmail}
                    />
                  </div>
                )}

                {currentTab === 'registry' && (
                  <div className="space-y-4">
                    <TeamRegistry
                      users={users}
                      projects={projects}
                      currentUser={currentAppUser}
                      onAddUser={handleAddUser}
                      onRemoveUser={handleRemoveUser}
                      onUpdateUserProjects={handleUpdateUserProjects}
                      isAdmin={currentAppUser?.isAdmin || currentAppUser?.role === 'Admin'}
                    />
                    <SimulatedEmailDispatch
                      emails={emails}
                      onClear={handleClearEmails}
                      googleUser={googleUser}
                      googleToken={googleToken}
                      onGoogleSignIn={handleGoogleSignIn}
                      onGoogleSignOut={handleGoogleSignOut}
                      onResendEmail={handleResendEmail}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty Projects State */
            <div id="no-projects-view" className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-lg shadow-sm text-center space-y-4">
              <div className="p-4 bg-slate-50 text-slate-600 rounded-full">
                <Layers className="w-10 h-10" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-bold text-slate-900">No active structural projects</h3>
                <p className="text-xs text-slate-500 mt-1">Initialize your very first structural drafting project to start customizing submission gates, drafting submittal tickets, logging labor hours, and viewing real-time Gantt schedules.</p>
              </div>
              <button
                onClick={() => setIsProjectFormOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded shadow cursor-pointer transition-all"
              >
                Get Started with a Project
              </button>
            </div>
          )}

        </div>
      </main>

      {/* Modals Injection */}
      <ProjectForm
        isOpen={isProjectFormOpen}
        onClose={() => setIsProjectFormOpen(false)}
        onSave={handleCreateProject}
      />

      {activeProject && (
        <TicketModal
          isOpen={isTicketModalOpen}
          onClose={() => {
            setIsTicketModalOpen(false);
            setActiveTicket(null);
            setPreFillData(null);
          }}
          project={activeProject}
          ticketToEdit={activeTicket}
          onSave={handleSaveTicket}
          onLogHours={handleLogHours}
          hourLogs={hourLogs}
          allProjectTickets={tickets}
          users={users}
          preFillData={preFillData}
          onSelectTicket={setActiveTicket}
          currentUser={currentAppUser}
        />
      )}
    </div>
  );
}
