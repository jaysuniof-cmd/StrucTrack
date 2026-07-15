import { Project, Ticket, HourLog, RegistryUser } from '../types';

const PROJECTS_KEY = 'submittal_tracker_projects';
const TICKETS_KEY = 'submittal_tracker_tickets';
const HOUR_LOGS_KEY = 'submittal_tracker_hour_logs';
const USERS_KEY = 'submittal_tracker_users';


const initialUsers: RegistryUser[] = [
  { id: 'u1', name: 'Sarah Miller', email: 'sarah.miller@structural-eng.com', role: 'Senior Structural Engineer' },
  { id: 'u2', name: 'Alex Rivera', email: 'alex.rivera@structural-eng.com', role: 'Structural Drafter' },
  { id: 'u3', name: 'John Doe', email: 'john.doe@structural-eng.com', role: 'Project Manager' },
  { id: 'u4', name: 'Emily Davis', email: 'emily.davis@structural-eng.com', role: 'Drafting Lead' },
  { id: 'u5', name: 'Marcus Brody', email: 'marcus.brody@structural-eng.com', role: 'Supervisor' },
];

const initialProjects: Project[] = [
  {
    id: 'p1',
    name: 'The Vertex Office Building',
    code: 'PRJ-VTX',
    description: '12-story steel frame commercial building with precast concrete facade panels.',
    requiredSubmissions: ['Third-Party Structural Peer Review', 'Government Building Authority Approval', 'Special Inspections Certification'],
    startDate: '2026-06-01',
    targetCompletionDate: '2026-11-30',
    status: 'Active',
    createdAt: '2026-06-01T08:00:00Z',
    structuralLevels: ['Substructure', '1st Floor', '2nd Floor', '3rd Floor', 'Roof'],
    structuralComponents: ['Foundations', 'Columns', 'Beams', 'Slabs', 'Walls', 'Retaining Walls']
  },
  {
    id: 'p2',
    name: 'Aero Residential Tower',
    code: 'PRJ-AER',
    description: 'Post-tensioned concrete high-rise residential structure.',
    requiredSubmissions: ['Third-Party Peer Review', 'Municipal Council Approval'],
    startDate: '2026-05-01',
    targetCompletionDate: '2026-12-15',
    status: 'Active',
    createdAt: '2026-05-01T09:00:00Z',
    structuralLevels: ['Substructure', '1st Floor', '2nd Floor', '3rd Floor', 'Roof'],
    structuralComponents: ['Foundations', 'Columns', 'Beams', 'Slabs', 'Walls', 'Retaining Walls']
  },
];

const initialTickets: Ticket[] = [
  // The Vertex Office Building tickets
  {
    id: 't1_0',
    projectId: 'p1',
    title: 'Foundation & Piling Layout Plan',
    itemNumber: '1',
    revision: 0,
    ticketCode: '1.0',
    status: 'Accepted with Notes (Third-Party)',
    startDate: '2026-06-01',
    targetSubmissionDate: '2026-06-10',
    actualSubmissionDate: '2026-06-09',
    thirdPartyResponseDate: '2026-06-15',
    assignee: 'Sarah Miller',
    remarks: 'Piling layout approved with notes regarding column load centers.',
    structureLevel: 'Substructure',
    structureComponent: 'Foundations',
    history: [
      'Ticket created on 2026-06-01 by Sarah Miller',
      'Submitted to third party peer reviewer on 2026-06-09',
      'Returned as Accepted with Notes by Third-Party reviewer on 2026-06-15'
    ]
  },
  {
    id: 't1_1',
    projectId: 'p1',
    title: 'Foundation & Piling Layout Plan',
    itemNumber: '1',
    revision: 1,
    ticketCode: '1.1',
    status: 'Completed',
    startDate: '2026-06-16',
    targetSubmissionDate: '2026-06-20',
    actualSubmissionDate: '2026-06-19',
    thirdPartyResponseDate: '2026-06-23',
    govSubmissionDate: '2026-06-24',
    govResponseDate: '2026-06-30',
    completionDate: '2026-07-01',
    assignee: 'Sarah Miller',
    remarks: 'Approved by government council and fully closed out.',
    parentId: 't1_0',
    structureLevel: 'Substructure',
    structureComponent: 'Foundations',
    history: [
      'Revision 1.1 initiated based on 1.0 accepted notes on 2026-06-16',
      'Submitted to third-party peer reviewer on 2026-06-19',
      'Returned as Accepted by third-party reviewer on 2026-06-23',
      'Submitted to Government Building Authority on 2026-06-24',
      'Government approval received on 2026-06-30',
      'Ticket marked as Fully Completed on 2026-07-01'
    ]
  },
  {
    id: 't2_0',
    projectId: 'p1',
    title: 'First Floor Framing Plan & Details',
    itemNumber: '2',
    revision: 0,
    ticketCode: '2.0',
    status: 'Revise and Resubmit (Third-Party)',
    startDate: '2026-06-15',
    targetSubmissionDate: '2026-06-25',
    actualSubmissionDate: '2026-06-26',
    thirdPartyResponseDate: '2026-07-02',
    assignee: 'Sarah Miller',
    remarks: 'Deflection checks required on long-span cantilever beams.',
    structureLevel: '1st Floor',
    structureComponent: 'Beams',
    history: [
      'Ticket created on 2026-06-15 by Sarah Miller',
      'Submitted to third-party peer reviewer on 2026-06-26 (delayed 1 day)',
      'Reviewer requested Revise and Resubmit on 2026-07-02 due to cantilever deflection concerns'
    ]
  },
  {
    id: 't2_1',
    projectId: 'p1',
    title: 'First Floor Framing Plan & Details',
    itemNumber: '2',
    revision: 1,
    ticketCode: '2.1',
    status: 'Under Review (Third-Party)',
    startDate: '2026-07-03',
    targetSubmissionDate: '2026-07-10',
    actualSubmissionDate: '2026-07-09',
    assignee: 'Sarah Miller',
    remarks: 'Reinforced cantilever section with web stiffeners and resubmitted.',
    parentId: 't2_0',
    structureLevel: '1st Floor',
    structureComponent: 'Beams',
    history: [
      'Revision 2.1 created on 2026-07-03 to address cantilever issues',
      'Updated plans and submitted to third-party peer reviewer on 2026-07-09'
    ]
  },
  {
    id: 't3_0',
    projectId: 'p1',
    title: 'Columns & Core Wall Detailing',
    itemNumber: '3',
    revision: 0,
    ticketCode: '3.0',
    status: 'Pending Submission',
    startDate: '2026-07-01',
    targetSubmissionDate: '2026-07-18',
    assignee: 'Alex Rivera',
    remarks: 'Drafting reinforcement splicing offsets.',
    structureLevel: '1st Floor',
    structureComponent: 'Columns',
    history: [
      'Ticket created on 2026-07-01 by Alex Rivera'
    ]
  },

  // Aero Residential Tower tickets
  {
    id: 't4_0',
    projectId: 'p2',
    title: 'Excavation & Shoring Design Plan',
    itemNumber: '1',
    revision: 0,
    ticketCode: '1.0',
    status: 'Completed',
    startDate: '2026-05-10',
    targetSubmissionDate: '2026-05-15',
    actualSubmissionDate: '2026-05-12',
    thirdPartyResponseDate: '2026-05-18',
    govSubmissionDate: '2026-05-19',
    govResponseDate: '2026-05-25',
    completionDate: '2026-05-26',
    assignee: 'Alex Rivera',
    remarks: 'Shoring system approved. Excavation started.',
    structureLevel: 'Substructure',
    structureComponent: 'Retaining Walls',
    history: [
      'Ticket created on 2026-05-10 by Alex Rivera',
      'Submitted early to third-party reviewer on 2026-05-12',
      'Third-party reviewer accepted on 2026-05-18',
      'Submitted to Municipal Council on 2026-05-19',
      'Municipal Council approved on 2026-05-25',
      'Ticket marked Completed on 2026-05-26'
    ]
  },
  {
    id: 't5_0',
    projectId: 'p2',
    title: 'Basement Slab & PT Wall Reinforcement',
    itemNumber: '2',
    revision: 0,
    ticketCode: '2.0',
    status: 'Approved (Government)',
    startDate: '2026-06-01',
    targetSubmissionDate: '2026-06-15',
    actualSubmissionDate: '2026-06-12',
    thirdPartyResponseDate: '2026-06-18',
    govSubmissionDate: '2026-06-20',
    govResponseDate: '2026-07-10',
    assignee: 'Sarah Miller',
    remarks: 'Approved by council. Waiting for official seal of document to mark completed.',
    structureLevel: 'Substructure',
    structureComponent: 'Slabs',
    history: [
      'Ticket created on 2026-06-01 by Sarah Miller',
      'Submitted to peer reviewer on 2026-06-12',
      'Reviewer accepted with notes on 2026-06-18',
      'Submitted to Municipal Council on 2026-06-20',
      'Government approval received on 2026-07-10'
    ]
  }
];

const initialHourLogs: HourLog[] = [
  { id: 'h1', ticketId: 't1_0', hours: 4.5, date: '2026-06-02', description: 'Initial piling layout modeling.', user: 'Sarah Miller' },
  { id: 'h2', ticketId: 't1_0', hours: 3.0, date: '2026-06-05', description: 'Drafting piling details and schedule.', user: 'Sarah Miller' },
  { id: 'h3', ticketId: 't1_1', hours: 2.0, date: '2026-06-17', description: 'Updating foundation layout per reviewer feedback.', user: 'Sarah Miller' },
  { id: 'h4', ticketId: 't2_0', hours: 8.0, date: '2026-06-18', description: 'First floor structural framing plan setup.', user: 'Sarah Miller' },
  { id: 'h5', ticketId: 't2_0', hours: 6.5, date: '2026-06-22', description: 'Framing connection details and sections.', user: 'Sarah Miller' },
  { id: 'h6', ticketId: 't2_1', hours: 5.0, date: '2026-07-04', description: 'Modifying long span cantilever reinforcement.', user: 'Sarah Miller' },
  { id: 'h7', ticketId: 't3_0', hours: 4.0, date: '2026-07-02', description: 'Detailing core wall schedule.', user: 'Alex Rivera' },
  { id: 'h8', ticketId: 't4_0', hours: 6.0, date: '2026-05-11', description: 'Drafting shoring elevations and sections.', user: 'Alex Rivera' },
  { id: 'h9', ticketId: 't5_0', hours: 12.0, date: '2026-06-05', description: 'Modeling and tendon placement layouts.', user: 'Sarah Miller' }
];

export function getProjects(): Project[] {
  const data = localStorage.getItem(PROJECTS_KEY);
  if (!data) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(initialProjects));
    return initialProjects;
  }
  const parsed = JSON.parse(data) as Project[];
  let migrationNeeded = false;
  const migrated = parsed.map(p => {
    let updated = false;
    if (!p.structuralLevels || p.structuralLevels.length === 0) {
      p.structuralLevels = ['Substructure', '1st Floor', '2nd Floor', '3rd Floor', 'Roof'];
      updated = true;
    }
    if (!p.structuralComponents || p.structuralComponents.length === 0) {
      p.structuralComponents = ['Foundations', 'Columns', 'Beams', 'Slabs', 'Walls', 'Retaining Walls'];
      updated = true;
    }
    if (updated) {
      migrationNeeded = true;
    }
    return p;
  });
  if (migrationNeeded) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(migrated));
    return migrated;
  }
  return parsed;
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getTickets(): Ticket[] {
  const data = localStorage.getItem(TICKETS_KEY);
  if (!data) {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(initialTickets));
    return initialTickets;
  }
  return JSON.parse(data);
}

export function saveTickets(tickets: Ticket[]): void {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

export function getHourLogs(): HourLog[] {
  const data = localStorage.getItem(HOUR_LOGS_KEY);
  if (!data) {
    localStorage.setItem(HOUR_LOGS_KEY, JSON.stringify(initialHourLogs));
    return initialHourLogs;
  }
  return JSON.parse(data);
}

export function saveHourLogs(logs: HourLog[]): void {
  localStorage.setItem(HOUR_LOGS_KEY, JSON.stringify(logs));
}

// Calculate number of days between two date strings (YYYY-MM-DD)
export function getDaysDiff(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const sDate = new Date(start);
  const eDate = new Date(end);
  if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return null;
  const diffTime = eDate.getTime() - sDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getUsers(): RegistryUser[] {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  }
  const parsed = JSON.parse(data) as RegistryUser[];
  const hasSupervisor = parsed.some(u => u.role.toLowerCase() === 'supervisor');
  if (!hasSupervisor) {
    const updated = [...parsed, { id: 'u5', name: 'Marcus Brody', email: 'marcus.brody@structural-eng.com', role: 'Supervisor' }];
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    return updated;
  }
  return parsed;
}

export function saveUsers(users: RegistryUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

