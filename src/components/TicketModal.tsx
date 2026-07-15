import React, { useState, useEffect } from 'react';
import { Project, Ticket, TicketStatus, HourLog, RegistryUser } from '../types';
import { getDaysDiff } from '../utils/storage';
import { X, Calendar, Plus, Clock, User, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  ticketToEdit?: Ticket | null; // If null, we are creating a new ticket
  onSave: (ticket: Ticket, selectAfterSave?: boolean) => void;
  onLogHours: (hours: number, date: string, description: string) => void;
  hourLogs: HourLog[];
  allProjectTickets: Ticket[];
  users: RegistryUser[]; // Registry of Team Members
  preFillData?: { level?: string; component?: string } | null;
  onSelectTicket?: (ticket: Ticket) => void; // Click to switch details
  currentUser?: any;
}

export default function TicketModal({
  isOpen,
  onClose,
  project,
  ticketToEdit,
  onSave,
  onLogHours,
  hourLogs,
  allProjectTickets,
  users,
  preFillData,
  onSelectTicket,
  currentUser
}: TicketModalProps) {
  // Compute role permission
  const userRole = currentUser?.role || '';
  const roleLower = userRole.toLowerCase();
  const isUserAdmin = currentUser?.isAdmin || roleLower === 'admin' || roleLower === 'manager';
  const isUserSupervisor = roleLower === 'supervisor';
  const isUserDrafter = roleLower.includes('drafter') || roleLower === 'structural drafter';
  const isUserRequester = roleLower === 'requester';

  const isSupervisorOrAdmin = isUserAdmin || isUserSupervisor;

  // Is current user the original creator/issuer of this ticket?
  const isIssuer = !!(
    ticketToEdit && (
      (ticketToEdit.createdBy && currentUser?.uid && ticketToEdit.createdBy === currentUser.uid) ||
      (ticketToEdit.creatorName && currentUser?.name && ticketToEdit.creatorName === currentUser.name)
    )
  );

  // Can this user create a new ticket?
  const canCreateTicket = isUserAdmin || isUserSupervisor || isUserRequester;

  // Can this user update an existing ticket?
  // "drafter can only update tickets" (and admin can do it, supervisor cannot update existing tickets)
  // Also, the ticket's issuer can update it regardless of role.
  const canUpdateTicket = isUserAdmin || isUserDrafter || isIssuer;

  const isFormDisabled = ticketToEdit ? !canUpdateTicket : !canCreateTicket;

  // Form State
  const [title, setTitle] = useState('');
  const [itemNumber, setItemNumber] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetSubmissionDate, setTargetSubmissionDate] = useState('');
  const [status, setStatus] = useState<TicketStatus>('Pending Submission');
  
  // Groupings State
  const [structureLevel, setStructureLevel] = useState('Substructure');
  const [structureComponent, setStructureComponent] = useState('Foundations');

  // Turnaround and submission tracking dates
  const [actualSubmissionDate, setActualSubmissionDate] = useState('');
  const [thirdPartyResponseDate, setThirdPartyResponseDate] = useState('');
  const [govSubmissionDate, setGovSubmissionDate] = useState('');
  const [govResponseDate, setGovResponseDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // Hour Logging sub-form state
  const [logHours, setLogHours] = useState<number | ''>('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logDesc, setLogDesc] = useState('');

  // Find supervisors or managers assigned to this project
  const getProjectSupervisorName = () => {
    const assignedSup = users.find(u => {
      const r = (u.role || '').toLowerCase();
      const isSupOrManOrAdmin = r.includes('supervisor') || r.includes('manager') || r.includes('admin');
      const isAssigned = u.projectIds?.includes(project.id);
      return isSupOrManOrAdmin && isAssigned;
    });
    if (assignedSup) return assignedSup.name;

    // Fallback: search for any supervisor/manager/admin
    const generalSup = users.find(u => {
      const r = (u.role || '').toLowerCase();
      return r.includes('supervisor') || r.includes('manager') || r.includes('admin');
    });
    return generalSup ? generalSup.name : 'Unassigned';
  };

  // Synchronize modal state with props when opening or switching tickets
  useEffect(() => {
    if (ticketToEdit) {
      setTitle(ticketToEdit.title);
      setItemNumber(ticketToEdit.itemNumber);
      setAssignee(ticketToEdit.assignee);
      setStartDate(ticketToEdit.startDate);
      setTargetSubmissionDate(ticketToEdit.targetSubmissionDate);
      setStatus(ticketToEdit.status);
      setStructureLevel(ticketToEdit.structureLevel || 'Substructure');
      setStructureComponent(ticketToEdit.structureComponent || 'Foundations');
      setActualSubmissionDate(ticketToEdit.actualSubmissionDate || '');
      setThirdPartyResponseDate(ticketToEdit.thirdPartyResponseDate || '');
      setGovSubmissionDate(ticketToEdit.govSubmissionDate || '');
      setGovResponseDate(ticketToEdit.govResponseDate || '');
      setCompletionDate(ticketToEdit.completionDate || '');
      setRemarks(ticketToEdit.remarks || '');
    } else {
      // Defaults for a new ticket
      setTitle('');
      // Auto-increment item number based on existing project tickets
      const existingBaseTickets = allProjectTickets.filter(t => t.projectId === project.id && t.revision === 0);
      const nextNum = existingBaseTickets.length + 1;
      setItemNumber(String(nextNum));
      
      // For a requester, we auto-assign / forward to the project's supervisor or manager
      if (isUserRequester) {
        setAssignee(getProjectSupervisorName());
      } else {
        setAssignee('Unassigned');
      }
      
      setStartDate(new Date().toISOString().split('T')[0]);
      setTargetSubmissionDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // +10 days
      setStatus('Pending Submission');
      
      // Set level/component from pre-filled (explorer quick add) or standard presets
      setStructureLevel(preFillData?.level || 'Substructure');
      setStructureComponent(preFillData?.component || 'Foundations');

      setActualSubmissionDate('');
      setThirdPartyResponseDate('');
      setGovSubmissionDate('');
      setGovResponseDate('');
      setCompletionDate('');
      setRemarks('');
    }
    // Reset hour log sub-form
    setLogHours('');
    setLogDesc('');
  }, [ticketToEdit, isOpen, project.id, allProjectTickets, users, preFillData]);

  if (!isOpen) return null;

  // Filter logs for this ticket
  const ticketHourLogs = ticketToEdit
    ? hourLogs.filter(h => h.ticketId === ticketToEdit.id)
    : [];

  const totalTicketHours = ticketHourLogs.reduce((sum, log) => sum + log.hours, 0);

  // Compute Revision Chain (history of this submittal item)
  const revisionChain = ticketToEdit
    ? allProjectTickets
        .filter(t => t.projectId === project.id && t.itemNumber === ticketToEdit.itemNumber)
        .sort((a, b) => a.revision - b.revision)
    : [];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !itemNumber.trim() || !assignee.trim()) {
      alert('Please fill out all required fields: Title, Item Number, and Assignee.');
      return;
    }

    const updatedTicket: Ticket = {
      id: ticketToEdit ? ticketToEdit.id : `t_${project.id}_${Date.now()}`,
      projectId: project.id,
      title: title.trim(),
      itemNumber: itemNumber.trim(),
      revision: ticketToEdit ? ticketToEdit.revision : 0,
      ticketCode: ticketToEdit ? ticketToEdit.ticketCode : `${itemNumber.trim()}.0`,
      status,
      startDate,
      targetSubmissionDate,
      actualSubmissionDate: actualSubmissionDate || undefined,
      thirdPartyResponseDate: thirdPartyResponseDate || undefined,
      govSubmissionDate: govSubmissionDate || undefined,
      govResponseDate: govResponseDate || undefined,
      completionDate: completionDate || undefined,
      assignee: assignee.trim(),
      remarks: remarks.trim(),
      parentId: ticketToEdit ? ticketToEdit.parentId : undefined,
      structureLevel,
      structureComponent,
      createdBy: ticketToEdit ? ticketToEdit.createdBy : (currentUser?.uid || ''),
      creatorName: ticketToEdit ? ticketToEdit.creatorName : (currentUser?.name || currentUser?.email || 'System'),
      history: ticketToEdit
        ? [
            ...ticketToEdit.history,
            `Ticket details updated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} by ${currentUser?.name || assignee}`
          ]
        : [`Submittal ticket created on ${new Date().toLocaleDateString()} by ${currentUser?.name || assignee}`]
    };

    onSave(updatedTicket);
  };

  const handleLocalLogHours = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketToEdit) {
      alert('You must save the ticket first before logging labor hours.');
      return;
    }
    if (!logHours || Number(logHours) <= 0) {
      alert('Please enter a valid amount of hours.');
      return;
    }
    onLogHours(Number(logHours), logDate, logDesc.trim() || 'General drafting duties');
    setLogHours('');
    setLogDesc('');
  };

  // Turnaround and delay metrics
  const prepTime = getDaysDiff(startDate, actualSubmissionDate);
  const turnTime = getDaysDiff(actualSubmissionDate, thirdPartyResponseDate);
  const govTurnTime = getDaysDiff(govSubmissionDate, govResponseDate);

  // Spawns a revision from this ticket
  const handleSpawnRevision = () => {
    if (!ticketToEdit) return;

    const nextRevIndex = ticketToEdit.revision + 1;
    const nextCode = `${ticketToEdit.itemNumber}.${nextRevIndex}`;
    
    // Create new ticket object pre-populated
    const newRevisionTicket: Ticket = {
      id: `t_${project.id}_rev_${Date.now()}`,
      projectId: project.id,
      title: ticketToEdit.title,
      itemNumber: ticketToEdit.itemNumber,
      revision: nextRevIndex,
      ticketCode: nextCode,
      status: 'Pending Submission',
      startDate: new Date().toISOString().split('T')[0],
      targetSubmissionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days
      assignee: ticketToEdit.assignee,
      remarks: `Revision to address review notes from Ticket ${ticketToEdit.ticketCode}.`,
      parentId: ticketToEdit.id,
      structureLevel: ticketToEdit.structureLevel || 'Substructure',
      structureComponent: ticketToEdit.structureComponent || 'Foundations',
      createdBy: currentUser?.uid || ticketToEdit.createdBy || '',
      creatorName: currentUser?.name || currentUser?.email || ticketToEdit.creatorName || 'System',
      history: [
        `Revision ticket ${nextCode} initiated from Ticket ${ticketToEdit.ticketCode} on ${new Date().toLocaleDateString()}`
      ]
    };

    onSave(newRevisionTicket, true);
    alert(`Revision ticket ${nextCode} has been successfully initialized!`);
  };

  return (
    <div id="ticket-modal-overlay" className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div id="ticket-modal-card" className="bg-white rounded max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              {ticketToEdit ? `Edit Submittal: #${ticketToEdit.ticketCode}` : 'New Submittal Ticket'}
              {ticketToEdit && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200 uppercase">
                  Rev {ticketToEdit.revision}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">PROJECT: {project.name.toUpperCase()} ({project.code})</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body (Scrollable Split Pane) */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column: Core Fields Form (7 cols) */}
          <form onSubmit={handleFormSubmit} className="lg:col-span-7 flex flex-col gap-3">
            <h4 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100 pb-0.5">Submittal Specifications</h4>
            
            {/* Ticket Issuer Display Card */}
            <div className="bg-slate-50 border border-slate-200/60 rounded p-2.5 flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400">Ticket Issuer</span>
              <span className="font-semibold text-slate-700 bg-white border border-slate-200 rounded px-2.5 py-0.5 shadow-3xs font-sans">
                {ticketToEdit ? (ticketToEdit.creatorName || 'System / Imported') : (currentUser?.name || currentUser?.email || 'Anonymous')}
              </span>
            </div>

            {ticketToEdit && !canUpdateTicket && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded text-[11px] flex items-center gap-2 font-medium leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Review Mode: Only drafters, admins, or the ticket's original issuer can edit existing tickets.</span>
              </div>
            )}
            {!ticketToEdit && !canCreateTicket && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded text-[11px] flex items-center gap-2 font-medium leading-relaxed">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Create Denied: Only admins, supervisors, and requesters can generate new submittals.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Item/Task # <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. 1"
                  disabled={!!ticketToEdit || isFormDisabled}
                  value={itemNumber}
                  onChange={e => setItemNumber(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 bg-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Assignee / Drafter <span className="text-rose-500">*</span></label>
                <select
                  value={assignee}
                  onChange={e => setAssignee(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-medium disabled:bg-slate-100 disabled:text-slate-500"
                  required
                  disabled={!isSupervisorOrAdmin || isFormDisabled || isUserRequester}
                >
                  <option value="Unassigned">Unassigned (Requires Supervisor)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.role || 'Drafter'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* NEW Structural Location Groupings */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded border border-slate-200">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Building Level <span className="text-rose-500">*</span></label>
                <select
                  value={structureLevel}
                  onChange={e => setStructureLevel(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium disabled:bg-slate-100"
                  required
                  disabled={isFormDisabled}
                >
                  {(project.structuralLevels && project.structuralLevels.length > 0
                    ? project.structuralLevels
                    : ['Substructure', '1st Floor', '2nd Floor', '3rd Floor', 'Roof']
                  ).map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Structural Component <span className="text-rose-500">*</span></label>
                <select
                  value={structureComponent}
                  onChange={e => setStructureComponent(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium disabled:bg-slate-100"
                  required
                  disabled={isFormDisabled}
                >
                  {(project.structuralComponents && project.structuralComponents.length > 0
                    ? project.structuralComponents
                    : ['Foundations', 'Columns', 'Beams', 'Slabs', 'Walls', 'Retaining Walls']
                  ).map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Submittal / Task Title <span className="text-rose-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Foundation Framing and Details"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium bg-white disabled:bg-slate-100"
                required
                disabled={isFormDisabled}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono disabled:bg-slate-100"
                  disabled={isFormDisabled}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Target Sub Date</label>
                <input
                  type="date"
                  value={targetSubmissionDate}
                  onChange={e => setTargetSubmissionDate(e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono disabled:bg-slate-100"
                  disabled={isFormDisabled}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Ticket Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as TicketStatus)}
                  className="w-full px-1.5 py-1 text-[11px] rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium disabled:bg-slate-100"
                  disabled={isFormDisabled}
                >
                  <option value="Pending Submission">Pending Submission</option>
                  <option value="Under Review (Third-Party)">Under Review (Third-Party)</option>
                  <option value="Accepted (Third-Party)">Accepted (Third-Party)</option>
                  <option value="Accepted with Notes (Third-Party)">Accepted with Notes (Third-Party)</option>
                  <option value="Revise and Resubmit (Third-Party)">Revise & Resubmit (Third-Party)</option>
                  <option value="Under Review (Government)">Under Review (Government)</option>
                  <option value="Approved (Government)">Approved (Government)</option>
                  <option value="Revise and Resubmit (Government)">Revise & Resubmit (Government)</option>
                  <option value="Completed">Completed / Closed Out</option>
                </select>
              </div>
            </div>

             {/* Submittal Dates tracking */}
            <h4 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100 pb-0.5 mt-1">Turnaround & Approval Tracking</h4>
            <div className="grid grid-cols-2 gap-3">
              {/* Third Party tracking */}
              <div className="space-y-2.5 bg-amber-50/20 p-2.5 rounded border border-amber-200/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">1st Gate: Third-Party Reviewer</span>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Actual Submission Date</label>
                  <input
                    type="date"
                    value={actualSubmissionDate}
                    onChange={e => setActualSubmissionDate(e.target.value)}
                    className="w-full px-1.5 py-0.5 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-mono disabled:bg-slate-100"
                    disabled={isFormDisabled}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Response Date</label>
                  <input
                    type="date"
                    value={thirdPartyResponseDate}
                    onChange={e => setThirdPartyResponseDate(e.target.value)}
                    className="w-full px-1.5 py-0.5 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-mono disabled:bg-slate-100"
                    disabled={isFormDisabled}
                  />
                </div>
              </div>

              {/* Gov tracking */}
              {status === 'Revise and Resubmit (Third-Party)' ? (
                <div className="bg-rose-50/40 p-2.5 rounded border border-rose-200/50 flex flex-col justify-center text-rose-800 text-[10px] space-y-1.5 leading-relaxed">
                  <span className="font-bold uppercase tracking-wider block">2nd Gate: Government Body</span>
                  <p className="font-semibold text-[9px]">⚠️ Bypassed & Closed</p>
                  <p className="text-rose-700 font-medium">
                    This submittal was returned for Revise and Resubmit at the 1st Gate. No date is set for the 2nd Gate on this ticket.
                  </p>
                  <p className="text-slate-500 font-medium text-[9px]">
                    Use the <strong>"Generate Revision Ticket"</strong> button below to spawn the next revision (e.g. {ticketToEdit ? `${ticketToEdit.itemNumber}.${ticketToEdit.revision + 1}` : '1.1'}).
                  </p>
                </div>
              ) : (status === 'Pending Submission' || status === 'Under Review (Third-Party)') ? (
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200/60 flex flex-col justify-center text-slate-500 text-[10px] space-y-1.5 leading-relaxed">
                  <span className="font-bold uppercase tracking-wider block text-slate-600">2nd Gate: Government Body</span>
                  <p className="font-semibold text-[9px] text-slate-400">🔒 Locked</p>
                  <p className="text-[9.5px]">
                    Government submission is locked. It opens automatically once the 1st Gate (Third-Party Review) is marked as <strong>Accepted</strong> or <strong>Accepted with Notes</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 bg-purple-50/20 p-2.5 rounded border border-purple-200/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">2nd Gate: Government Body</span>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Government Sub Date</label>
                    <input
                      type="date"
                      value={govSubmissionDate}
                      onChange={e => setGovSubmissionDate(e.target.value)}
                      className="w-full px-1.5 py-0.5 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white font-mono disabled:bg-slate-100"
                      disabled={isFormDisabled}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Approval/Response Date</label>
                    <input
                      type="date"
                      value={govResponseDate}
                      onChange={e => setGovResponseDate(e.target.value)}
                      className="w-full px-1.5 py-0.5 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white font-mono disabled:bg-slate-100"
                      disabled={isFormDisabled}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Fully Completed Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Fully Completed Date</label>
                <input
                  type="date"
                  value={completionDate}
                  onChange={e => setCompletionDate(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-mono disabled:bg-slate-100"
                  disabled={isFormDisabled}
                />
              </div>
              <div className="flex items-end">
                {ticketToEdit && ticketToEdit.status !== 'Completed' && canCreateTicket && (
                  <button
                    type="button"
                    onClick={handleSpawnRevision}
                    className="w-full py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer uppercase tracking-wider h-7"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Generate Revision Ticket
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Remarks & Peer Notes</label>
              <textarea
                placeholder="Include feedback, corrections, or key details..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={2}
                className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-100"
                disabled={isFormDisabled}
              />
            </div>

            <div className="flex justify-end gap-1.5 mt-1 border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-[11px] border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              {!isFormDisabled && (
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-xs uppercase tracking-wider cursor-pointer"
                >
                  {ticketToEdit ? 'Save Changes' : 'Create Ticket'}
                </button>
              )}
            </div>
          </form>

          {/* Right Column: Revision history and Hour logging (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4 border-l border-slate-150 pl-2 lg:pl-4">
            
            {/* 1. Revision History Chain */}
            {ticketToEdit && (
              <div className="space-y-1 bg-slate-50/50 p-2 border border-slate-200 rounded">
                <h4 className="font-bold text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-100 pb-0.5 flex items-center justify-between">
                  <span>Submittal Revision Chain</span>
                  <span className="text-[9px] text-slate-400 font-mono">Item {ticketToEdit.itemNumber}</span>
                </h4>
                <div className="mt-2 space-y-1 max-h-[110px] overflow-y-auto">
                  {revisionChain.map((rev, idx) => {
                    const isCurrent = rev.id === ticketToEdit.id;
                    return (
                      <div
                        key={rev.id}
                        onClick={() => {
                          if (!isCurrent && onSelectTicket) {
                            onSelectTicket(rev);
                          }
                        }}
                        className={`p-1.5 rounded text-[11px] flex justify-between items-center border transition-all ${
                          isCurrent
                            ? 'bg-blue-50/50 border-blue-300 font-semibold cursor-default'
                            : 'bg-white border-slate-200 text-slate-500 cursor-pointer hover:bg-blue-50/30 hover:border-blue-200 hover:text-slate-700'
                        }`}
                        title={isCurrent ? 'Currently viewing' : 'Click to view details of this revision'}
                      >
                        <div className="flex flex-col">
                          <span className={`font-bold flex items-center gap-1 ${isCurrent ? 'text-blue-800' : 'text-slate-700'}`}>
                            Ticket {rev.ticketCode}
                            {!isCurrent && <span className="text-[8px] text-blue-500 font-normal tracking-tight">(View)</span>}
                          </span>
                          <span className="text-[9px] text-slate-400 truncate max-w-[130px]">
                            {rev.status}
                          </span>
                        </div>
                        <div className="text-right text-[9px] font-mono">
                          <span className="text-slate-400 block">{rev.startDate}</span>
                          {isCurrent ? (
                            <span className="text-blue-600 font-bold uppercase text-[8px]">Active</span>
                          ) : (
                            <span className="text-slate-400 font-bold uppercase text-[8px]">Rev {rev.revision}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Turnaround Metrics Summary Card */}
            {ticketToEdit && (
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[11px] space-y-2 shadow-2xs">
                <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                  Cycle Time Analytics
                </h5>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white p-1 rounded border border-slate-150">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Prep Time</span>
                    <strong className="text-xs text-slate-800 font-mono">
                      {prepTime !== null ? `${prepTime} Days` : 'N/A'}
                    </strong>
                  </div>
                  <div className="bg-white p-1 rounded border border-slate-150">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">3rd Party Turn</span>
                    <strong className="text-xs text-amber-800 font-mono">
                      {turnTime !== null ? `${turnTime} Days` : 'N/A'}
                    </strong>
                  </div>
                </div>
                {govTurnTime !== null && (
                  <div className="bg-white p-1 rounded border border-slate-150 text-center">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Government Turnaround</span>
                    <strong className="text-xs text-purple-800 font-mono">{govTurnTime} Days</strong>
                  </div>
                )}
              </div>
            )}

            {/* 3. Labor Hours Logger Sub-form */}
            <div className="bg-blue-50/15 border border-blue-100 rounded p-2.5 flex flex-col gap-2">
              <h4 className="font-bold text-slate-700 text-[10px] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Hour Logger
                </span>
                <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold border border-blue-200">
                  {totalTicketHours} HRS
                </span>
              </h4>

              {ticketToEdit ? (
                <form onSubmit={handleLocalLogHours} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Hours <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={logHours}
                        onChange={e => setLogHours(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-2 py-0.5 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Date</label>
                      <input
                        type="date"
                        value={logDate}
                        onChange={e => setLogDate(e.target.value)}
                        className="w-full px-1.5 py-0.5 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Duties performed</label>
                    <input
                      type="text"
                      placeholder="e.g., Drafting connection details"
                      value={logDesc}
                      onChange={e => setLogDesc(e.target.value)}
                      className="w-full px-2 py-0.5 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-0.5 cursor-pointer uppercase h-7"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log Hours
                  </button>
                </form>
              ) : (
                <p className="text-[10px] text-slate-400 italic font-medium">Please create and save this submittal ticket first before you log productivity hours.</p>
              )}

              {/* List of existing hour logs */}
              {ticketHourLogs.length > 0 && (
                <div className="mt-1 max-h-[100px] overflow-y-auto space-y-1 divide-y divide-slate-100 pr-1">
                  {ticketHourLogs.map(log => (
                    <div key={log.id} className="pt-1 text-[10px] flex justify-between items-start text-slate-500 font-mono">
                      <div>
                        <span className="font-bold text-slate-700 block">{log.hours} HRS <span className="font-normal text-slate-400 text-[9px] font-sans">on {log.date}</span></span>
                        <span className="text-slate-500 block truncate max-w-[170px] font-sans">{log.description}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 italic font-sans">{log.user}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
