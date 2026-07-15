import { Project, Ticket, HourLog, RegistryUser, TeamRequest } from '../types';

const SPREADSHEET_ID = '1Oc71PJgxtKFRPNTB4N94f82fFK3EVlZszi2d5jH2iQk';

// Define headers for our Google Sheets tables
const HEADERS = {
  users: ['uid', 'name', 'email', 'role', 'status', 'isAdmin', 'password', 'createdAt'],
  projects: ['id', 'name', 'code', 'description', 'requiredSubmissions', 'startDate', 'targetCompletionDate', 'status', 'createdAt', 'structuralLevels', 'structuralComponents'],
  tickets: ['id', 'projectId', 'title', 'itemNumber', 'revision', 'ticketCode', 'status', 'startDate', 'targetSubmissionDate', 'actualSubmissionDate', 'thirdPartyResponseDate', 'govSubmissionDate', 'govResponseDate', 'completionDate', 'assignee', 'remarks', 'parentId', 'structureLevel', 'structureComponent', 'history'],
  hourLogs: ['id', 'ticketId', 'hours', 'date', 'description', 'user'],
  teamRequests: ['id', 'supervisorId', 'supervisorName', 'staffName', 'staffEmail', 'staffRole', 'status', 'createdAt']
};

// Generic Google Sheets API HTTP request helper
async function sheetsApiCall(token: string, endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Sheets API Error (${response.status}): ${errorText}`);
    throw new Error(`Google Sheets API Error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// 1. Ensure all required sheets/tabs exist in the spreadsheet
export async function ensureSheetTabs(token: string): Promise<void> {
  try {
    const metadata = await sheetsApiCall(token, '?fields=sheets.properties');
    const existingTitles = metadata.sheets.map((s: any) => s.properties.title);
    
    const requiredTabs = Object.keys(HEADERS);
    const tabsToCreate = requiredTabs.filter(tab => !existingTitles.includes(tab));

    if (tabsToCreate.length > 0) {
      const requests = tabsToCreate.map(title => ({
        addSheet: {
          properties: { title }
        }
      }));

      await sheetsApiCall(token, ':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({ requests })
      });
      console.log('Created missing Google Sheets tabs:', tabsToCreate);
    }

    // Initialize headers for newly created tabs or any empty tabs
    for (const tab of requiredTabs) {
      const currentValues = await fetchSheetValues(token, `${tab}!A1:Z1`);
      if (!currentValues || currentValues.length === 0) {
        await updateSheetValues(token, `${tab}!A1`, [HEADERS[tab as keyof typeof HEADERS]]);
      }
    }
  } catch (err) {
    console.error('Failed to ensure Google Sheets tabs exist:', err);
  }
}

// 2. Fetch raw row values from a sheet tab
export async function fetchSheetValues(token: string, range: string): Promise<any[][]> {
  try {
    const data = await sheetsApiCall(token, `/values/${encodeURIComponent(range)}`);
    return data.values || [];
  } catch (err) {
    console.error(`Error fetching sheet values for range ${range}:`, err);
    return [];
  }
}

// 3. Update values in a specific range
export async function updateSheetValues(token: string, range: string, values: any[][]): Promise<void> {
  await sheetsApiCall(token, `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values
    })
  });
}

// 4. Overwrite a complete table in Google Sheets
export async function overwriteTable(token: string, tab: keyof typeof HEADERS, dataRows: any[][]): Promise<void> {
  const headers = HEADERS[tab];
  const fullValues = [headers, ...dataRows];
  
  // First, clear existing values in the sheet tab
  await sheetsApiCall(token, `/values/${tab}!A1:Z1000:clear`, {
    method: 'POST'
  });

  // Then, write the new values
  await updateSheetValues(token, `${tab}!A1`, fullValues);
}

// --- Specific Type Sync Mappers ---

// 1. Users Sync
export async function syncUsersToSheets(token: string, users: any[]): Promise<void> {
  const rows = users.map(u => [
    u.uid || u.id || '',
    u.name || '',
    u.email || '',
    u.role || '',
    u.status || 'Approved',
    u.isAdmin ? 'TRUE' : 'FALSE',
    u.password || '12345678',
    u.createdAt || new Date().toISOString()
  ]);
  await overwriteTable(token, 'users', rows);
}

export async function fetchUsersFromSheets(token: string): Promise<any[]> {
  const values = await fetchSheetValues(token, 'users!A2:H1000');
  return values.map(row => ({
    uid: row[0] || '',
    id: row[0] || '',
    name: row[1] || '',
    email: row[2] || '',
    role: row[3] || '',
    status: row[4] || 'Approved',
    isAdmin: row[5] === 'TRUE',
    password: row[6] || '12345678',
    createdAt: row[7] || ''
  }));
}

// 2. Projects Sync
export async function syncProjectsToSheets(token: string, projects: Project[]): Promise<void> {
  const rows = projects.map(p => [
    p.id,
    p.name,
    p.code,
    p.description || '',
    JSON.stringify(p.requiredSubmissions || []),
    p.startDate || '',
    p.targetCompletionDate || '',
    p.status || 'Active',
    p.createdAt || new Date().toISOString(),
    JSON.stringify(p.structuralLevels || []),
    JSON.stringify(p.structuralComponents || [])
  ]);
  await overwriteTable(token, 'projects', rows);
}

export async function fetchProjectsFromSheets(token: string): Promise<Project[]> {
  const values = await fetchSheetValues(token, 'projects!A2:K1000');
  return values.map(row => {
    let requiredSubmissions = [];
    let structuralLevels = [];
    let structuralComponents = [];

    try { requiredSubmissions = JSON.parse(row[4] || '[]'); } catch (e) {}
    try { structuralLevels = JSON.parse(row[9] || '[]'); } catch (e) {}
    try { structuralComponents = JSON.parse(row[10] || '[]'); } catch (e) {}

    return {
      id: row[0],
      name: row[1],
      code: row[2],
      description: row[3] || '',
      requiredSubmissions,
      startDate: row[5] || '',
      targetCompletionDate: row[6] || '',
      status: row[7] as Project['status'],
      createdAt: row[8] || '',
      structuralLevels,
      structuralComponents
    };
  });
}

// 3. Tickets Sync
export async function syncTicketsToSheets(token: string, tickets: Ticket[]): Promise<void> {
  const rows = tickets.map(t => [
    t.id,
    t.projectId,
    t.title,
    t.itemNumber,
    String(t.revision),
    t.ticketCode,
    t.status,
    t.startDate || '',
    t.targetSubmissionDate || '',
    t.actualSubmissionDate || '',
    t.thirdPartyResponseDate || '',
    t.govSubmissionDate || '',
    t.govResponseDate || '',
    t.completionDate || '',
    t.assignee || 'Unassigned',
    t.remarks || '',
    t.parentId || '',
    t.structureLevel || '',
    t.structureComponent || '',
    JSON.stringify(t.history || [])
  ]);
  await overwriteTable(token, 'tickets', rows);
}

export async function fetchTicketsFromSheets(token: string): Promise<Ticket[]> {
  const values = await fetchSheetValues(token, 'tickets!A2:T2000');
  return values.map(row => {
    let history = [];
    try { history = JSON.parse(row[19] || '[]'); } catch (e) {}

    return {
      id: row[0],
      projectId: row[1],
      title: row[2],
      itemNumber: row[3],
      revision: parseInt(row[4] || '0', 10),
      ticketCode: row[5],
      status: row[6],
      startDate: row[7] || '',
      targetSubmissionDate: row[8] || '',
      actualSubmissionDate: row[9] || undefined,
      thirdPartyResponseDate: row[10] || undefined,
      govSubmissionDate: row[11] || undefined,
      govResponseDate: row[12] || undefined,
      completionDate: row[13] || undefined,
      assignee: row[14] || 'Unassigned',
      remarks: row[15] || '',
      parentId: row[16] || undefined,
      structureLevel: row[17] || '',
      structureComponent: row[18] || '',
      history
    };
  });
}

// 4. Hour Logs Sync
export async function syncHourLogsToSheets(token: string, logs: HourLog[]): Promise<void> {
  const rows = logs.map(l => [
    l.id,
    l.ticketId,
    String(l.hours),
    l.date || '',
    l.description || '',
    l.user || ''
  ]);
  await overwriteTable(token, 'hourLogs', rows);
}

export async function fetchHourLogsFromSheets(token: string): Promise<HourLog[]> {
  const values = await fetchSheetValues(token, 'hourLogs!A2:F2000');
  return values.map(row => ({
    id: row[0],
    ticketId: row[1],
    hours: parseFloat(row[2] || '0'),
    date: row[3] || '',
    description: row[4] || '',
    user: row[5] || ''
  }));
}

// 5. Team Requests Sync
export async function syncTeamRequestsToSheets(token: string, requests: TeamRequest[]): Promise<void> {
  const rows = requests.map(r => [
    r.id,
    r.supervisorId || '',
    r.supervisorName || '',
    r.staffName || '',
    r.staffEmail || '',
    r.staffRole || '',
    r.status || 'Pending',
    r.createdAt || new Date().toISOString()
  ]);
  await overwriteTable(token, 'teamRequests', rows);
}

export async function fetchTeamRequestsFromSheets(token: string): Promise<TeamRequest[]> {
  const values = await fetchSheetValues(token, 'teamRequests!A2:H1000');
  return values.map(row => ({
    id: row[0],
    supervisorId: row[1] || '',
    supervisorName: row[2] || '',
    staffName: row[3] || '',
    staffEmail: row[4] || '',
    staffRole: row[5] as 'Drafter' | 'Requester',
    status: row[6] as 'Approved' | 'Rejected' | 'Pending',
    createdAt: row[7] || ''
  }));
}
