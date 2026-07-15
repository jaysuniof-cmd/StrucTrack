import { Project, Ticket, HourLog, RegistryUser, TeamRequest, ProfileChangeRequest } from '../types';
import * as sheetsDb from './googleSheetsDb';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  isAdmin: boolean;
  createdAt: string;
  password?: string;
  projectIds?: string[];
  supervisor?: string;
  dateOfEngagement?: string;
  rate?: number;
  currency?: string;
}

// LocalStorage Keys
const LOCAL_USERS_KEY = 'sheets_db_users';
const LOCAL_PROJECTS_KEY = 'sheets_db_projects';
const LOCAL_TICKETS_KEY = 'sheets_db_tickets';
const LOCAL_HOUR_LOGS_KEY = 'sheets_db_hour_logs';
const LOCAL_TEAM_REQUESTS_KEY = 'sheets_db_team_requests';
const LOCAL_PROFILE_REQUESTS_KEY = 'sheets_db_profile_change_requests';

// Initial pre-seeded administrator
const initialUsers: AppUser[] = [
  {
    uid: 'admin_uid',
    name: 'Admin',
    email: 'admin@gmail.com',
    role: 'Admin',
    status: 'Approved',
    isAdmin: true,
    password: '12345678',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'jaysun_admin_uid',
    name: 'Jaysun',
    email: 'jaysuniof@gmail.com',
    role: 'Admin',
    status: 'Approved',
    isAdmin: true,
    password: '123456',
    createdAt: new Date().toISOString()
  }
];

// --- Helper Functions to read/write LocalStorage Cache ---

function getLocalUsers(): AppUser[] {
  const data = localStorage.getItem(LOCAL_USERS_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  }
  try {
    const users = JSON.parse(data) as AppUser[];
    const jaysun = users.find(u => u.email.toLowerCase() === 'jaysuniof@gmail.com');
    if (!jaysun) {
      const newUser: AppUser = {
        uid: 'jaysun_admin_uid',
        name: 'Jaysun',
        email: 'jaysuniof@gmail.com',
        role: 'Admin',
        status: 'Approved',
        isAdmin: true,
        password: '123456',
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    } else {
      let changed = false;
      if (jaysun.password !== '123456') {
        jaysun.password = '123456';
        changed = true;
      }
      if (jaysun.role !== 'Admin') {
        jaysun.role = 'Admin';
        changed = true;
      }
      if (!jaysun.isAdmin) {
        jaysun.isAdmin = true;
        changed = true;
      }
      if (jaysun.status !== 'Approved') {
        jaysun.status = 'Approved';
        changed = true;
      }
      if (changed) {
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
      }
    }
    return users;
  } catch (e) {
    return initialUsers;
  }
}

function saveLocalUsers(users: AppUser[]): void {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  notifyUsersChanged();
}

function getLocalProjects(): Project[] {
  const data = localStorage.getItem(LOCAL_PROJECTS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalProjects(projects: Project[]): void {
  localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
}

function getLocalTickets(): Ticket[] {
  const data = localStorage.getItem(LOCAL_TICKETS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalTickets(tickets: Ticket[]): void {
  localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(tickets));
}

function getLocalHourLogs(): HourLog[] {
  const data = localStorage.getItem(LOCAL_HOUR_LOGS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalHourLogs(logs: HourLog[]): void {
  localStorage.setItem(LOCAL_HOUR_LOGS_KEY, JSON.stringify(logs));
}

function getLocalTeamRequests(): TeamRequest[] {
  const data = localStorage.getItem(LOCAL_TEAM_REQUESTS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalTeamRequests(requests: TeamRequest[]): void {
  localStorage.setItem(LOCAL_TEAM_REQUESTS_KEY, JSON.stringify(requests));
}

// --- Google Sheets Sync Triggers ---

async function pushToSheets(type: 'users' | 'projects' | 'tickets' | 'hourLogs' | 'teamRequests') {
  const token = localStorage.getItem('google_access_token');
  if (!token) return;

  try {
    if (type === 'users') {
      await sheetsDb.syncUsersToSheets(token, getLocalUsers());
    } else if (type === 'projects') {
      await sheetsDb.syncProjectsToSheets(token, getLocalProjects());
    } else if (type === 'tickets') {
      await sheetsDb.syncTicketsToSheets(token, getLocalTickets());
    } else if (type === 'hourLogs') {
      await sheetsDb.syncHourLogsToSheets(token, getLocalHourLogs());
    } else if (type === 'teamRequests') {
      await sheetsDb.syncTeamRequestsToSheets(token, getLocalTeamRequests());
    }
  } catch (err) {
    console.error(`Failed to background sync ${type} to Google Sheets:`, err);
  }
}

// Pull all data from Google Sheets and overwrite local cache
export async function pullAllFromGoogleSheets(token: string): Promise<void> {
  console.log('Synchronizing local database with Google Sheets...');
  await sheetsDb.ensureSheetTabs(token);

  const [users, projects, tickets, hourLogs, teamRequests] = await Promise.all([
    sheetsDb.fetchUsersFromSheets(token),
    sheetsDb.fetchProjectsFromSheets(token),
    sheetsDb.fetchTicketsFromSheets(token),
    sheetsDb.fetchHourLogsFromSheets(token),
    sheetsDb.fetchTeamRequestsFromSheets(token)
  ]);

  if (users.length > 0) {
    // Ensure admin@gmail.com is always preserved
    if (!users.some(u => u.email.toLowerCase() === 'admin@gmail.com')) {
      users.push(initialUsers[0]);
    }
    saveLocalUsers(users);
  } else {
    await sheetsDb.syncUsersToSheets(token, getLocalUsers());
  }

  if (projects.length > 0) {
    saveLocalProjects(projects);
  } else {
    await sheetsDb.syncProjectsToSheets(token, getLocalProjects());
  }

  if (tickets.length > 0) {
    saveLocalTickets(tickets);
  } else {
    await sheetsDb.syncTicketsToSheets(token, getLocalTickets());
  }

  if (hourLogs.length > 0) {
    saveLocalHourLogs(hourLogs);
  } else {
    await sheetsDb.syncHourLogsToSheets(token, getLocalHourLogs());
  }

  if (teamRequests.length > 0) {
    saveLocalTeamRequests(teamRequests);
  } else {
    await sheetsDb.syncTeamRequestsToSheets(token, getLocalTeamRequests());
  }
}

// --- Mock Auth System with Firebase-compatible Listeners ---

const authStateListeners: Array<(user: any) => void> = [];

function notifyAuthStateChanged(user: AppUser | null) {
  const firebaseUser = user ? {
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    emailVerified: true
  } : null;
  authStateListeners.forEach(cb => cb(firebaseUser));
}

export const auth = {
  onAuthStateChanged: (callback: (user: any) => void) => {
    authStateListeners.push(callback);
    const stored = localStorage.getItem('structtrack_logged_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        callback({
          uid: u.uid,
          email: u.email,
          displayName: u.name,
          emailVerified: true
        });
      } catch (e) {
        callback(null);
      }
    } else {
      callback(null);
    }
    return () => {
      const idx = authStateListeners.indexOf(callback);
      if (idx !== -1) authStateListeners.splice(idx, 1);
    };
  },
  signOut: async () => {
    localStorage.removeItem('structtrack_logged_user');
    notifyAuthStateChanged(null);
  }
};

// Mock db object to avoid breaking raw firestore imports
export const db = {};

// Check if email matches default admin criteria
export const isDefaultAdminEmail = (email: string): boolean => {
  const normalized = email.toLowerCase().trim();
  return normalized === 'admin@gmail.com' || normalized === 'admin@gmail' || normalized === 'jaysuniof@gmail.com' || normalized === 'jaysuniof@gmail';
};

// --- Auth Operations ---

export const registerWithEmail = async (name: string, email: string, role: string, password?: string): Promise<AppUser> => {
  const normalizedEmail = email.toLowerCase().trim();
  const users = getLocalUsers();

  if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('This email is already in use by another account.');
  }

  const isAdmin = isDefaultAdminEmail(normalizedEmail);
  const status = isAdmin ? 'Approved' : 'Pending';
  const finalRole = isAdmin ? 'Admin' : role;
  const uid = 'user_' + Math.random().toString(36).substring(2, 11);

  const newUser: AppUser = {
    uid,
    name,
    email: normalizedEmail,
    role: finalRole,
    status,
    isAdmin,
    createdAt: new Date().toISOString(),
    password: password || '12345678'
  };

  const updatedUsers = [...users, newUser];
  saveLocalUsers(updatedUsers);
  pushToSheets('users');

  // Automatically sign in the user
  localStorage.setItem('structtrack_logged_user', JSON.stringify(newUser));
  notifyAuthStateChanged(newUser);

  return newUser;
};

export const loginWithEmail = async (email: string, password?: string): Promise<AppUser | null> => {
  const normalizedEmail = email.toLowerCase().trim();
  const users = getLocalUsers();

  // Handle auto-registration of default admin
  if (normalizedEmail === 'admin@gmail.com' && password === '12345678' && !users.some(u => u.email.toLowerCase() === 'admin@gmail.com')) {
    return registerWithEmail('Admin', 'admin@gmail.com', 'Admin', '12345678');
  }

  if (normalizedEmail === 'jaysuniof@gmail.com' && password === '123456' && !users.some(u => u.email.toLowerCase() === 'jaysuniof@gmail.com')) {
    return registerWithEmail('Jaysun', 'jaysuniof@gmail.com', 'Admin', '123456');
  }

  const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  if (password && user.password !== password) {
    throw new Error('Invalid email or password.');
  }

  // Set logged user
  localStorage.setItem('structtrack_logged_user', JSON.stringify(user));
  notifyAuthStateChanged(user);
  return user;
};

export const logoutUser = async (): Promise<void> => {
  await auth.signOut();
};

export const getAppUser = async (uid: string): Promise<AppUser | null> => {
  const users = getLocalUsers();
  return users.find(u => u.uid === uid) || null;
};

// --- Profile Observers (Observer Pattern) ---

const userListeners: Array<{ uid: string; callback: (user: AppUser | null) => void }> = [];
const allUsersListeners: Array<(users: AppUser[]) => void> = [];

function notifyUsersChanged() {
  const users = getLocalUsers();
  allUsersListeners.forEach(cb => cb(users));
  userListeners.forEach(({ uid, callback }) => {
    const user = users.find(u => u.uid === uid) || null;
    callback(user);
  });
}

export const subscribeToAppUser = (uid: string, callback: (user: AppUser | null) => void) => {
  userListeners.push({ uid, callback });
  const user = getLocalUsers().find(u => u.uid === uid) || null;
  callback(user);
  return () => {
    const idx = userListeners.findIndex(l => l.uid === uid && l.callback === callback);
    if (idx !== -1) userListeners.splice(idx, 1);
  };
};

export const subscribeToAllAppUsers = (callback: (users: AppUser[]) => void) => {
  allUsersListeners.push(callback);
  callback(getLocalUsers());
  return () => {
    const idx = allUsersListeners.indexOf(callback);
    if (idx !== -1) allUsersListeners.splice(idx, 1);
  };
};

export const updateAppUserStatus = async (uid: string, status: 'Approved' | 'Rejected' | 'Pending'): Promise<void> => {
  const users = getLocalUsers().map(u => u.uid === uid ? { ...u, status } : u);
  saveLocalUsers(users);
  pushToSheets('users');
};

export const toggleAppUserAdmin = async (uid: string, isAdmin: boolean): Promise<void> => {
  const users = getLocalUsers().map(u => {
    if (u.uid === uid) {
      const finalRole = isAdmin ? 'Admin' : (u.role === 'Admin' ? 'Drafter' : u.role);
      return { ...u, isAdmin, role: finalRole };
    }
    return u;
  });
  saveLocalUsers(users);
  pushToSheets('users');
};

export const deleteAppUser = async (uid: string): Promise<void> => {
  const users = getLocalUsers().filter(u => u.uid !== uid);
  saveLocalUsers(users);
  pushToSheets('users');
};

// --- Structural App Data Operations ---

// 1. Projects
export const fetchProjectsDb = async (): Promise<Project[]> => {
  return getLocalProjects();
};

export const saveProjectDb = async (project: Project): Promise<void> => {
  const projects = getLocalProjects();
  const exists = projects.some(p => p.id === project.id);
  const updated = exists ? projects.map(p => p.id === project.id ? project : p) : [...projects, project];
  saveLocalProjects(updated);
  pushToSheets('projects');
};

export const deleteProjectDb = async (projectId: string): Promise<void> => {
  const updated = getLocalProjects().filter(p => p.id !== projectId);
  saveLocalProjects(updated);
  pushToSheets('projects');
};

// 2. Tickets
export const fetchTicketsDb = async (): Promise<Ticket[]> => {
  return getLocalTickets();
};

export const saveTicketDb = async (ticket: Ticket): Promise<void> => {
  const tickets = getLocalTickets();
  const exists = tickets.some(t => t.id === ticket.id);
  const updated = exists ? tickets.map(t => t.id === ticket.id ? ticket : t) : [...tickets, ticket];
  saveLocalTickets(updated);
  pushToSheets('tickets');
};

export const deleteTicketDb = async (ticketId: string): Promise<void> => {
  const updated = getLocalTickets().filter(t => t.id !== ticketId);
  saveLocalTickets(updated);
  pushToSheets('tickets');
};

// 3. Hour Logs
export const fetchHourLogsDb = async (): Promise<HourLog[]> => {
  return getLocalHourLogs();
};

export const saveHourLogDb = async (log: HourLog): Promise<void> => {
  const logs = getLocalHourLogs();
  const exists = logs.some(l => l.id === log.id);
  const updated = exists ? logs.map(l => l.id === log.id ? log : l) : [...logs, log];
  saveLocalHourLogs(updated);
  pushToSheets('hourLogs');
};

export const deleteHourLogDb = async (logId: string): Promise<void> => {
  const updated = getLocalHourLogs().filter(l => l.id !== logId);
  saveLocalHourLogs(updated);
  pushToSheets('hourLogs');
};

// 4. Registry Users
export const fetchRegistryUsersDb = async (): Promise<RegistryUser[]> => {
  // Let's pull from our registered users but mapped, or from storage
  return getLocalUsers().map(u => ({
    id: u.uid,
    name: u.name,
    email: u.email,
    role: u.role,
    projectIds: u.projectIds || [],
    supervisor: u.supervisor,
    dateOfEngagement: u.dateOfEngagement,
    rate: u.rate,
    currency: u.currency
  }));
};

export const saveRegistryUserDb = async (user: RegistryUser): Promise<void> => {
  // Map back to our User profile
  const users = getLocalUsers();
  const exists = users.find(u => u.uid === user.id);
  if (exists) {
    exists.name = user.name;
    exists.email = user.email;
    exists.role = user.role;
    exists.projectIds = user.projectIds || [];
    exists.supervisor = user.supervisor;
    exists.dateOfEngagement = user.dateOfEngagement;
    exists.rate = user.rate;
    exists.currency = user.currency;
    saveLocalUsers(users);
  } else {
    const newUser: AppUser = {
      uid: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: 'Approved',
      isAdmin: false,
      createdAt: new Date().toISOString(),
      password: '12345678',
      projectIds: user.projectIds || [],
      supervisor: user.supervisor,
      dateOfEngagement: user.dateOfEngagement,
      rate: user.rate,
      currency: user.currency
    };
    saveLocalUsers([...users, newUser]);
  }
  pushToSheets('users');
};

export const deleteRegistryUserDb = async (userId: string): Promise<void> => {
  const updated = getLocalUsers().filter(u => u.uid !== userId);
  saveLocalUsers(updated);
  pushToSheets('users');
};

// 4.5. Profile Change Requests
function getLocalProfileChangeRequests(): ProfileChangeRequest[] {
  const data = localStorage.getItem(LOCAL_PROFILE_REQUESTS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveLocalProfileChangeRequests(requests: ProfileChangeRequest[]): void {
  localStorage.setItem(LOCAL_PROFILE_REQUESTS_KEY, JSON.stringify(requests));
}

export const fetchProfileChangeRequestsDb = async (): Promise<ProfileChangeRequest[]> => {
  return getLocalProfileChangeRequests();
};

export const saveProfileChangeRequestDb = async (request: ProfileChangeRequest): Promise<void> => {
  const requests = getLocalProfileChangeRequests();
  const exists = requests.some(r => r.id === request.id);
  const updated = exists ? requests.map(r => r.id === request.id ? request : r) : [...requests, request];
  saveLocalProfileChangeRequests(updated);
};

export const updateProfileChangeRequestStatusDb = async (
  id: string,
  status: 'Approved' | 'Rejected',
  adminRemarks?: string
): Promise<void> => {
  const requests = getLocalProfileChangeRequests();
  const reqIdx = requests.findIndex(r => r.id === id);
  if (reqIdx !== -1) {
    const r = requests[reqIdx];
    r.status = status;
    r.reviewedAt = new Date().toLocaleString();
    r.adminRemarks = adminRemarks;

    // If approved, update user's profile!
    if (status === 'Approved') {
      const users = getLocalUsers();
      const user = users.find(u => u.uid === r.userId);
      if (user) {
        user.name = r.requestedData.name;
        user.email = r.requestedData.email;
        user.role = r.requestedData.role;
        user.projectIds = r.requestedData.projectIds || [];
        user.supervisor = r.requestedData.supervisor;
        user.dateOfEngagement = r.requestedData.dateOfEngagement;
        user.rate = r.requestedData.rate;
        user.currency = r.requestedData.currency;
        saveLocalUsers(users);
        // Push updated users to sheets
        pushToSheets('users');
      }
    }
    saveLocalProfileChangeRequests(requests);
  }
};

// 5. Team Requests
export const fetchTeamRequestsDb = async (): Promise<TeamRequest[]> => {
  return getLocalTeamRequests();
};

export const saveTeamRequestDb = async (request: TeamRequest): Promise<void> => {
  const requests = getLocalTeamRequests();
  const exists = requests.some(r => r.id === request.id);
  const updated = exists ? requests.map(r => r.id === request.id ? request : r) : [...requests, request];
  saveLocalTeamRequests(updated);
  pushToSheets('teamRequests');
};

export const updateTeamRequestStatusDb = async (id: string, status: 'Approved' | 'Rejected'): Promise<void> => {
  const requests = getLocalTeamRequests().map(r => r.id === id ? { ...r, status } : r);
  saveLocalTeamRequests(requests);
  pushToSheets('teamRequests');
};

// --- DB Seeding Helper ---
export const seedInitialDatabase = async (
  initialProjects: Project[],
  initialTickets: Ticket[],
  initialHourLogs: HourLog[],
  initialRegistryUsers: RegistryUser[]
) => {
  // Seed local projects
  const projects = getLocalProjects();
  if (projects.length === 0) {
    saveLocalProjects(initialProjects);
  }

  // Seed local tickets
  const tickets = getLocalTickets();
  if (tickets.length === 0) {
    saveLocalTickets(initialTickets);
  }

  // Seed local hour logs
  const hourLogs = getLocalHourLogs();
  if (hourLogs.length === 0) {
    saveLocalHourLogs(initialHourLogs);
  }

  // Sync to sheets if token is available
  const token = localStorage.getItem('google_access_token');
  if (token) {
    await pullAllFromGoogleSheets(token);
  }
};
