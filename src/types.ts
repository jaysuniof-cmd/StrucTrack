export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  requiredSubmissions: string[]; // customizable list of required approval stages
  startDate: string;
  targetCompletionDate: string;
  status: 'Active' | 'Completed' | 'On Hold' | 'Closed';
  createdAt: string;
  structuralLevels?: string[];     // customizable list of structural levels
  structuralComponents?: string[];  // customizable list of structural components
  levelComponents?: Record<string, string[]>; // level-specific customizable components
  assignedSupervisors?: string[];  // User IDs of supervisors allocated to this project
}

export interface TeamRequest {
  id: string;
  supervisorId: string;
  supervisorName: string;
  staffName: string;
  staffEmail: string;
  staffRole: 'Drafter' | 'Requester';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export type TicketStatus =
  | 'Pending Submission'
  | 'Under Review (Third-Party)'
  | 'Accepted (Third-Party)'
  | 'Accepted with Notes (Third-Party)'
  | 'Revise and Resubmit (Third-Party)'
  | 'Under Review (Government)'
  | 'Approved (Government)'
  | 'Revise and Resubmit (Government)'
  | 'Completed';

export interface HourLog {
  id: string;
  ticketId: string;
  hours: number;
  date: string;
  description: string;
  user: string;
}

export interface Ticket {
  id: string;
  projectId: string;
  title: string;          // e.g. "Foundation Structural Layout"
  itemNumber: string;     // e.g. "1", "2", "3"
  revision: number;       // e.g. 0, 1, 2 (corresponds to .0, .1, .2)
  ticketCode: string;     // e.g. "1.0", "1.1", "2.0"
  status: TicketStatus;
  startDate: string;
  targetSubmissionDate: string; // Target submission date to third party
  actualSubmissionDate?: string; // Actual date submitted to third party
  thirdPartyResponseDate?: string; // Date third party review was returned
  govSubmissionDate?: string; // Date submitted for government approval
  govResponseDate?: string; // Date government approval was returned
  completionDate?: string; // Date marked fully complete
  assignee: string;
  remarks: string;
  parentId?: string; // Links revisions (e.g. 1.1 parent is 1.0)
  history: string[]; // Activity log array
  structureLevel?: string;    // e.g. "Substructure", "1st Floor", "2nd Floor"
  structureComponent?: string; // e.g. "Foundations", "Columns", "Beams", "Slabs", "Walls", "Retaining Walls"
  createdBy?: string;          // UID of user who created/issued the ticket
  creatorName?: string;        // Name of user who created/issued the ticket
}

export interface RegistryUser {
  id: string;
  name: string;
  email: string;
  role: string;
  projectIds?: string[];
  supervisor?: string;
  dateOfEngagement?: string;
  rate?: number;
  currency?: string;
}

export interface ProfileChangeRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedData: {
    name: string;
    email: string;
    role: string;
    projectIds?: string[];
    supervisor?: string;
    dateOfEngagement?: string;
    rate?: number;
    currency?: string;
  };
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  reviewedAt?: string;
  adminRemarks?: string;
}
