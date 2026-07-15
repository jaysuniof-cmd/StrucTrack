import React, { useState, useMemo, useEffect } from 'react';
import { Project, Ticket, HourLog, RegistryUser } from '../types';
import { SimulatedEmail } from './SimulatedEmailDispatch';
import {
  Clock,
  User,
  Check,
  X,
  Send,
  Calendar,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';

interface PayrollManagerProps {
  users: RegistryUser[];
  tickets: Ticket[];
  hourLogs: HourLog[];
  projects: Project[];
  currentUser: any; // AppUser from parent state
  onTriggerEmail: (email: SimulatedEmail) => void;
}

interface WeeklyPayrollItem {
  projectCode: string;
  projectName: string;
  hours: number;
  descriptions: string[];
}

interface DayPayrollBreakdown {
  dateString: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Monday, Jul 13"
  items: WeeklyPayrollItem[];
  totalHours: number;
}

interface SubmittedTimesheet {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  weekStartDate: string; // Sunday YYYY-MM-DD
  weekEndDate: string; // Saturday YYYY-MM-DD
  supervisorId: string;
  supervisorName: string;
  supervisorEmail: string;
  dailyBreakdown: DayPayrollBreakdown[];
  totalHours: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedAt: string;
  reviewedAt?: string;
  remarks?: string;
}

// Helper to format date cleanly
const formatLocalDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

// Helper to get Sunday of the week for a given date YYYY-MM-DD
const getSundayOfWeekStr = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day;
  const sunday = new Date(d.setDate(diff));
  return sunday.toISOString().split('T')[0];
};

export default function PayrollManager({
  users,
  tickets,
  hourLogs,
  projects,
  currentUser,
  onTriggerEmail
}: PayrollManagerProps) {
  
  // The specific employee user is ALWAYS the logged-in current user (payroll request is for yourself)
  const activeEmployee = useMemo(() => {
    if (!currentUser) return null;
    // Find matching record in Registry
    const registryRecord = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (registryRecord) {
      return registryRecord;
    }
    // Fallback to current app user details
    return {
      id: currentUser.uid,
      name: currentUser.name || 'Current User',
      email: currentUser.email,
      role: currentUser.role || 'Drafter',
      projectIds: currentUser.projectIds || []
    } as RegistryUser;
  }, [users, currentUser]);

  // Determine selectable approvers based on user roles
  const selectableApprovers = useMemo(() => {
    if (!currentUser) return [];

    const isSupervisor = currentUser.role?.toLowerCase().includes('supervisor') || currentUser.role?.toLowerCase().includes('manager');

    // Find all supervisors in the registry excluding the current user themselves
    const supervisors = users.filter(u => 
      u.email.toLowerCase() !== currentUser.email.toLowerCase() && 
      (u.role.toLowerCase().includes('supervisor') || u.role.toLowerCase().includes('manager'))
    );

    if (isSupervisor) {
      // If a supervisor has no other supervisor, admin shall approve.
      // Let's get admins
      const admins = users.filter(u => 
        u.role.toLowerCase() === 'admin' || 
        u.email.toLowerCase() === 'admin@gmail.com' || 
        u.email.toLowerCase() === 'jaysuniof@gmail.com'
      );

      // Return union of other supervisors and admins
      return [...supervisors, ...admins];
    } else {
      // Regular user: can select any supervisor
      return supervisors;
    }
  }, [users, currentUser]);

  // Selection States
  const [targetDateStr, setTargetDateStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [supervisorReviewRemarks, setSupervisorReviewRemarks] = useState('');

  // Persisted Submitted Timesheets State
  const [submittedTimesheets, setSubmittedTimesheets] = useState<SubmittedTimesheet[]>(() => {
    const data = localStorage.getItem('structtrack_submitted_timesheets');
    return data ? JSON.parse(data) : [];
  });

  const saveTimesheets = (sheets: SubmittedTimesheet[]) => {
    setSubmittedTimesheets(sheets);
    localStorage.setItem('structtrack_submitted_timesheets', JSON.stringify(sheets));
  };

  // Select default supervisor when list changes
  useEffect(() => {
    if (selectableApprovers.length > 0) {
      // Check if current selection is still in list, otherwise reset
      if (!selectableApprovers.some(s => s.id === selectedSupervisorId)) {
        setSelectedSupervisorId(selectableApprovers[0].id);
      }
    } else {
      setSelectedSupervisorId('');
    }
  }, [selectableApprovers, selectedSupervisorId]);

  // Selected Supervisor object
  const activeSupervisor = useMemo(() => {
    return selectableApprovers.find(u => u.id === selectedSupervisorId) || selectableApprovers[0] || null;
  }, [selectableApprovers, selectedSupervisorId]);

  // Snapped Week boundaries (Sunday to Saturday)
  const weekBoundaries = useMemo(() => {
    const sunStr = getSundayOfWeekStr(targetDateStr);
    const sunDate = new Date(sunStr + 'T00:00:00');
    
    const satDate = new Date(sunDate);
    satDate.setDate(sunDate.getDate() + 6);
    const satStr = satDate.toISOString().split('T')[0];

    return {
      sundayStr: sunStr,
      saturdayStr: satStr,
      sundayLabel: formatLocalDate(sunStr),
      saturdayLabel: formatLocalDate(satStr)
    };
  }, [targetDateStr]);

  // Generate date list for the 7 days (Sunday - Saturday)
  const weekDaysList = useMemo(() => {
    const list: { dateStr: string; label: string }[] = [];
    const sunDate = new Date(weekBoundaries.sundayStr + 'T00:00:00');
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunDate);
      d.setDate(sunDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      list.push({ dateStr, label });
    }
    return list;
  }, [weekBoundaries]);

  // Compute daily breakdown of hours for the active employee and week
  const activeWeekBreakdown = useMemo(() => {
    if (!activeEmployee) return [];

    const employeeName = activeEmployee.name;

    // Filter logs for this user and this week
    const filteredLogs = hourLogs.filter(log => {
      const isUser = log.user.toLowerCase() === employeeName.toLowerCase();
      const isWithinWeek = log.date >= weekBoundaries.sundayStr && log.date <= weekBoundaries.saturdayStr;
      return isUser && isWithinWeek;
    });

    // For each of the 7 days, group hours by project
    const breakdown: DayPayrollBreakdown[] = weekDaysList.map(day => {
      const dayLogs = filteredLogs.filter(l => l.date === day.dateStr);
      
      const projectGroupsMap: { [projId: string]: WeeklyPayrollItem } = {};

      dayLogs.forEach(log => {
        const ticket = tickets.find(t => t.id === log.ticketId);
        const projectId = ticket?.projectId || 'unassigned';
        const project = projects.find(p => p.id === projectId);
        
        const projectCode = project?.code || 'GEN-IND';
        const projectName = project?.name || 'General / Indirect';

        if (!projectGroupsMap[projectId]) {
          projectGroupsMap[projectId] = {
            projectCode,
            projectName,
            hours: 0,
            descriptions: []
          };
        }
        projectGroupsMap[projectId].hours += log.hours;
        if (log.description && !projectGroupsMap[projectId].descriptions.includes(log.description)) {
          projectGroupsMap[projectId].descriptions.push(log.description);
        }
      });

      const items = Object.values(projectGroupsMap);
      const dayTotalHours = items.reduce((sum, item) => sum + item.hours, 0);

      return {
        dateString: day.dateStr,
        dayLabel: day.label,
        items,
        totalHours: dayTotalHours
      };
    });

    return breakdown;
  }, [activeEmployee, hourLogs, weekBoundaries, weekDaysList, tickets, projects]);

  // Total hours for the selected week
  const totalWeeklyHours = useMemo(() => {
    return activeWeekBreakdown.reduce((sum, day) => sum + day.totalHours, 0);
  }, [activeWeekBreakdown]);

  // Check if a timesheet already exists for this user and week
  const existingSubmission = useMemo(() => {
    if (!activeEmployee) return null;
    return submittedTimesheets.find(
      sheet => sheet.userId === activeEmployee.id && sheet.weekStartDate === weekBoundaries.sundayStr
    ) || null;
  }, [activeEmployee, weekBoundaries, submittedTimesheets]);

  // Timesheets currently awaiting review by the logged-in user
  const timesheetsForReview = useMemo(() => {
    if (!currentUser) return [];

    // Admin can see and approve all pending timesheets
    if (currentUser.isAdmin || currentUser.role === 'Admin') {
      return submittedTimesheets.filter(t => t.status === 'Pending');
    }

    // Supervisor can see pending timesheets submitted to them
    return submittedTimesheets.filter(t => 
      t.status === 'Pending' && 
      (t.supervisorId === currentUser.uid || t.supervisorEmail?.toLowerCase() === currentUser.email?.toLowerCase())
    );
  }, [submittedTimesheets, currentUser]);

  // Navigation handlers for week
  const handlePrevWeek = () => {
    const currSun = new Date(weekBoundaries.sundayStr + 'T00:00:00');
    currSun.setDate(currSun.getDate() - 7);
    setTargetDateStr(currSun.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const currSun = new Date(weekBoundaries.sundayStr + 'T00:00:00');
    currSun.setDate(currSun.getDate() + 7);
    setTargetDateStr(currSun.toISOString().split('T')[0]);
  };

  // Submit Payroll to Supervisor/Admin for Approval
  const handleSubmitTimesheet = () => {
    if (!activeEmployee) {
      setFeedback({ type: 'error', message: 'No active employee context.' });
      return;
    }
    if (!activeSupervisor) {
      setFeedback({ type: 'error', message: 'Please select a supervisor or administrator to approve this timesheet.' });
      return;
    }
    if (totalWeeklyHours === 0) {
      setFeedback({ type: 'error', message: 'No labor hours logged for this week. Cannot submit an empty timesheet.' });
      return;
    }

    const timesheetId = `ts_${Date.now()}`;
    const newTimesheet: SubmittedTimesheet = {
      id: timesheetId,
      userId: activeEmployee.id,
      userName: activeEmployee.name,
      userEmail: activeEmployee.email,
      weekStartDate: weekBoundaries.sundayStr,
      weekEndDate: weekBoundaries.saturdayStr,
      supervisorId: activeSupervisor.id,
      supervisorName: activeSupervisor.name,
      supervisorEmail: activeSupervisor.email,
      dailyBreakdown: activeWeekBreakdown.filter(day => day.totalHours > 0),
      totalHours: totalWeeklyHours,
      status: 'Pending',
      submittedAt: new Date().toLocaleString()
    };

    // Replace previous submission for same week & user
    const filteredSheets = submittedTimesheets.filter(
      sheet => !(sheet.userId === activeEmployee.id && sheet.weekStartDate === weekBoundaries.sundayStr)
    );

    const updatedSheets = [...filteredSheets, newTimesheet];
    saveTimesheets(updatedSheets);

    // Dispatch simulated notification email
    let itemsBreakdownStr = '';
    activeWeekBreakdown.forEach(day => {
      if (day.totalHours > 0) {
        itemsBreakdownStr += `\n📅 ${day.dayLabel} (Total: ${day.totalHours} hrs):\n`;
        day.items.forEach(item => {
          itemsBreakdownStr += `   - Project [${item.projectCode}] ${item.projectName}: ${item.hours} hrs\n`;
          if (item.descriptions.length > 0) {
            itemsBreakdownStr += `     Notes: "${item.descriptions.join(', ')}"\n`;
          }
        });
      }
    });

    const emailBody = `Hi ${activeSupervisor.name},

A new weekly payroll timesheet has been generated and sent to you for review and approval.

EMPLOYEE DETAILS:
--------------------------------------------------
Name:       ${activeEmployee.name}
Email:      ${activeEmployee.email}
Role:       ${activeEmployee.role}

PAYROLL WEEK DETAILS (Sun - Sat):
--------------------------------------------------
Span:       ${weekBoundaries.sundayLabel} to ${weekBoundaries.saturdayLabel}
Total:      ${totalWeeklyHours} Hours

DAILY WORK LOG & PROJECT BREAKDOWN:
--------------------------------------------------${itemsBreakdownStr}
--------------------------------------------------

Please review these project log entries in the StructTrack Approvals Console to approve or reject.

Best regards,
StructTrack Payroll Engine`;

    const simulatedEmail: SimulatedEmail = {
      id: `em_ts_${Date.now()}`,
      recipientName: activeSupervisor.name,
      recipientEmail: activeSupervisor.email,
      subject: `[Payroll Approval Request] Timesheet Submission for ${activeEmployee.name} (${weekBoundaries.sundayStr})`,
      body: emailBody,
      timestamp: new Date().toLocaleTimeString(),
      actionType: 'hours'
    };

    onTriggerEmail(simulatedEmail);

    setFeedback({
      type: 'success',
      message: `Weekly Timesheet successfully submitted to "${activeSupervisor.name}" and notification email dispatched!`
    });

    setTimeout(() => setFeedback(null), 5000);
  };

  // Approve/Reject Timesheet
  const handleReviewTimesheet = (id: string, status: 'Approved' | 'Rejected') => {
    const updated = submittedTimesheets.map(sheet => {
      if (sheet.id === id) {
        return {
          ...sheet,
          status,
          reviewedAt: new Date().toLocaleString(),
          remarks: supervisorReviewRemarks.trim() || undefined
        };
      }
      return sheet;
    });

    saveTimesheets(updated);

    // Notify employee of approval/rejection
    const reviewedSheet = updated.find(s => s.id === id);
    if (reviewedSheet) {
      const emailBody = `Hi ${reviewedSheet.userName},

Your weekly payroll timesheet for the period ${formatLocalDate(reviewedSheet.weekStartDate)} to ${formatLocalDate(reviewedSheet.weekEndDate)} has been reviewed by ${currentUser?.name || reviewedSheet.supervisorName}.

DECISION STATUS:
--------------------------------------------------
Status:     ${status.toUpperCase()}
Reviewed:   ${new Date().toLocaleString()}
Remarks:    "${supervisorReviewRemarks.trim() || 'No remarks provided.'}"

TIMESHEET SUMMARY:
--------------------------------------------------
Total hours approved: ${reviewedSheet.totalHours} hrs

If your timesheet was rejected, please review the remarks, modify any incorrect hours in your submittal logs, and resubmit for approval.

Best regards,
StructTrack Payroll Engine`;

      const employeeEmail: SimulatedEmail = {
        id: `em_rev_${Date.now()}`,
        recipientName: reviewedSheet.userName,
        recipientEmail: reviewedSheet.userEmail,
        subject: `[Payroll Decision] Timesheet for ${formatLocalDate(reviewedSheet.weekStartDate)} was ${status.toUpperCase()}`,
        body: emailBody,
        timestamp: new Date().toLocaleTimeString(),
        actionType: 'hours'
      };

      onTriggerEmail(employeeEmail);
    }

    setSupervisorReviewRemarks('');
    setFeedback({
      type: 'success',
      message: `Timesheet has been marked as ${status} and the employee has been notified!`
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDeleteTimesheet = (id: string) => {
    if (confirm('Are you sure you want to permanently delete this timesheet record?')) {
      const updated = submittedTimesheets.filter(s => s.id !== id);
      saveTimesheets(updated);
    }
  };

  return (
    <div id="payroll-manager-container" className="space-y-4">
      
      {/* Upper banner alerting of system requirements */}
      <div className="bg-slate-900 text-slate-100 p-4 border border-slate-800 rounded shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Personal Payroll Generation & Sign-off Flow
          </h3>
          <p className="text-[11px] text-slate-300 mt-1 max-w-[650px]">
            Generate your official project labor timesheet spanning <strong>Sunday through Saturday</strong>.
            This module aggregates your logged hours per project per day and submits them to your Supervisor or Administrator for sign-off.
          </p>
        </div>
        <div className="bg-slate-800 px-3 py-1.5 border border-slate-700 rounded text-center shrink-0">
          <span className="text-[9px] text-slate-400 block uppercase font-bold">Secure Lock</span>
          <span className="text-[11px] font-mono font-bold text-emerald-400">SELF-SUBMIT ONLY</span>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded border text-[11px] font-medium flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <AlertCircle className={`w-4 h-4 shrink-0 ${feedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`} />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Generator vs. Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Hand: Timesheet Generator (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                1. Compile My Weekly Timesheet
              </h4>
              <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-100 uppercase">
                {activeEmployee?.role}
              </span>
            </div>

            {/* Locked user presentation & Date Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Generating Payroll For</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 font-bold">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="uppercase">{activeEmployee?.name}</span>
                  <span className="text-[9px] font-mono font-medium text-slate-400">({activeEmployee?.email})</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Select Week (Any Day in Week)</label>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={targetDateStr}
                    onChange={e => setTargetDateStr(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono text-slate-700 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Week navigation control bar */}
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded border border-slate-200">
              <button
                onClick={handlePrevWeek}
                className="p-1 hover:bg-slate-200 text-slate-600 rounded transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev Week
              </button>
              
              <div className="text-center">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">PAYROLL PERIOD</span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {weekBoundaries.sundayLabel} – {weekBoundaries.saturdayLabel}
                </span>
              </div>

              <button
                onClick={handleNextWeek}
                className="p-1 hover:bg-slate-200 text-slate-600 rounded transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase"
              >
                Next Week
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Generated Breakdown Listing per Day */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">My Daily Logged Hours:</h5>
                <span className="text-[11px] font-bold text-slate-600 font-mono">
                  Weekly Sum: <span className="text-rose-600 font-extrabold text-xs">{totalWeeklyHours} hrs</span>
                </span>
              </div>

              {totalWeeklyHours === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded p-4 bg-slate-50/50">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">No Labor Logged This Week</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[280px] mx-auto">
                    You have not logged any productivity hours for this period. 
                  </p>
                  <p className="text-[10px] text-blue-600 font-medium mt-3">
                    💡 Tip: Log structural drafting hours directly inside your active submittal tickets.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {activeWeekBreakdown.map((day, dIdx) => (
                    <div
                      key={dIdx}
                      className={`border p-2.5 rounded transition-colors ${
                        day.totalHours > 0 ? 'bg-white border-slate-300 shadow-2xs' : 'bg-slate-50/30 border-slate-150 opacity-60'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                          {day.dayLabel}
                        </span>
                        {day.totalHours > 0 ? (
                          <span className="text-[10px] font-bold font-mono bg-blue-50 text-blue-700 px-1.5 rounded border border-blue-100">
                            {day.totalHours} hrs
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">0.0 hrs</span>
                        )}
                      </div>

                      {day.items.length > 0 ? (
                        <div className="space-y-1.5 pl-2 border-l border-slate-200">
                          {day.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="text-[10px] text-slate-700 flex flex-col sm:flex-row sm:justify-between items-start gap-1">
                              <div>
                                <span className="font-bold bg-slate-100 text-slate-800 text-[9px] px-1 rounded mr-1 font-mono uppercase border">
                                  {item.projectCode}
                                </span>
                                <span className="font-medium text-slate-800">{item.projectName}</span>
                                {item.descriptions.length > 0 && (
                                  <p className="text-[9px] text-slate-400 italic mt-0.5">
                                    &ldquo;{item.descriptions.join(', ')}&rdquo;
                                  </p>
                                )}
                              </div>
                              <div className="text-slate-900 font-mono font-bold shrink-0">
                                {item.hours} hrs
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[9px] text-slate-400 italic pl-2">No projects worked on today.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submission Section */}
            {totalWeeklyHours > 0 && (
              <div className="bg-slate-50/80 p-3.5 border border-slate-200 rounded space-y-3.5">
                <div className="space-y-1">
                  <h5 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Request Sign-off / Approval
                  </h5>
                  <p className="text-[10px] text-slate-400">
                    Submit this timesheet for approval. 
                    {currentUser?.role?.toLowerCase().includes('supervisor') 
                      ? ' As a Supervisor, if you have no reporting supervisor, your request will default to an Administrator.'
                      : ' Regular team members submit to their designated Supervisor.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <select
                      value={selectedSupervisorId}
                      onChange={e => setSelectedSupervisorId(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 bg-white font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase tracking-wider"
                    >
                      {selectableApprovers.length === 0 ? (
                        <option value="">No valid approvers available</option>
                      ) : (
                        selectableApprovers.map(sup => (
                          <option key={sup.id} value={sup.id}>
                            {sup.role.toUpperCase()}: {sup.name.toUpperCase()} ({sup.email})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <button
                    onClick={handleSubmitTimesheet}
                    disabled={selectableApprovers.length === 0}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-[10px] uppercase tracking-wider rounded shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 h-8 whitespace-nowrap"
                  >
                    <Send className="w-3 h-3" />
                    Request Approval
                  </button>
                </div>

                {existingSubmission && (
                  <div className="p-2 bg-amber-50 text-amber-800 text-[10px] rounded border border-amber-200 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Notice: You have already submitted a timesheet for this week with status: <strong className="uppercase">{existingSubmission.status}</strong>. Resubmitting will replace it.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Hand: Approvals console + History List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Supervisor Console (Only displays if supervisor/admin or has timesheets to review) */}
          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                2. My Approvals Console
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Review, sign off, or reject submittals sent to you by team members.</p>
            </div>

            {timesheetsForReview.length === 0 ? (
              <div className="text-center py-6 border border-slate-100 rounded bg-slate-50/50">
                <CheckCircle2 className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">No Pending Approvals</p>
                <p className="text-[9px] text-slate-400 mt-0.5">You have no timesheets currently awaiting your review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {timesheetsForReview.map(sheet => (
                  <div key={sheet.id} className="border border-amber-200 bg-amber-50/20 rounded p-3 space-y-3 text-[11px]">
                    <div className="flex justify-between items-start gap-1">
                      <div>
                        <p className="font-bold text-slate-800 text-xs uppercase">{sheet.userName}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{sheet.userEmail}</p>
                        <p className="text-[10px] text-slate-600 mt-1">
                          Week: <strong className="font-mono">{sheet.weekStartDate}</strong> to <strong className="font-mono">{sheet.weekEndDate}</strong>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block text-[9px] bg-amber-100 text-amber-800 font-bold uppercase px-1.5 rounded border border-amber-200">
                          Pending
                        </span>
                        <span className="block text-[11px] font-mono font-bold text-rose-600 mt-1">
                          {sheet.totalHours} hrs
                        </span>
                      </div>
                    </div>

                    {/* Daily breakdown inside review */}
                    <div className="border-t border-b border-dashed border-slate-200 py-2 my-1 max-h-[140px] overflow-y-auto pr-1 space-y-1.5 bg-white/60 p-1.5 rounded">
                      {sheet.dailyBreakdown.map((day, idx) => (
                        <div key={idx} className="text-[10px] border-b border-slate-100 last:border-none pb-1 last:pb-0">
                          <div className="flex justify-between font-bold text-slate-700 text-[9px]">
                            <span>{day.dayLabel}</span>
                            <span className="font-mono">{day.totalHours} hrs</span>
                          </div>
                          {day.items.map((it, iIdx) => (
                            <div key={iIdx} className="pl-1.5 text-[9px] text-slate-500 flex justify-between">
                              <span>[{it.projectCode}] {it.projectName}</span>
                              <span className="font-mono">{it.hours} hrs</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Review actions input */}
                    <div className="space-y-2">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">My Remarks / Feedback</label>
                      <textarea
                        placeholder="e.g. Approved. Solid work. Or: Please fix hours logged on Monday."
                        value={supervisorReviewRemarks}
                        onChange={e => setSupervisorReviewRemarks(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        rows={2}
                      />
                      
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleReviewTimesheet(sheet.id, 'Rejected')}
                          className="px-2.5 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                          <ThumbsDown className="w-3 h-3" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleReviewTimesheet(sheet.id, 'Approved')}
                          className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historical Records and Archive */}
          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                3. Timesheet Archives
              </h4>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {submittedTimesheets.length} Total
              </span>
            </div>

            {submittedTimesheets.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No historical records in archive.</p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {[...submittedTimesheets].reverse().map(sheet => {
                  let badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
                  if (sheet.status === 'Approved') badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  if (sheet.status === 'Rejected') badgeClass = "bg-rose-100 text-rose-800 border-rose-200";

                  const isOwner = sheet.userId === activeEmployee?.id;
                  const canDelete = isOwner || currentUser?.isAdmin || currentUser?.role === 'Admin';

                  return (
                    <div key={sheet.id} className="border border-slate-100 hover:border-slate-200 p-2.5 rounded text-[11px] space-y-1 bg-slate-50/20 relative">
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteTimesheet(sheet.id)}
                          className="absolute right-2 top-2 p-1 text-slate-300 hover:text-rose-600 rounded cursor-pointer transition-colors"
                          title="Delete record"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="pr-5 font-bold text-slate-800 uppercase">
                        {sheet.userName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {formatLocalDate(sheet.weekStartDate)} - {formatLocalDate(sheet.weekEndDate)}
                      </div>
                      
                      <div className="flex items-center gap-2 pt-1">
                        <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${badgeClass}`}>
                          {sheet.status}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-600">
                          {sheet.totalHours} hours
                        </span>
                        <span className="text-[8px] text-slate-400 uppercase">
                          App: {sheet.supervisorName}
                        </span>
                      </div>

                      {sheet.remarks && (
                        <p className="text-[10px] text-slate-400 bg-white/60 p-1 border rounded italic mt-1.5">
                          <strong>Remarks:</strong> &ldquo;{sheet.remarks}&rdquo;
                        </p>
                      )}

                      <div className="text-[8px] text-slate-400 font-mono pt-1 flex justify-between">
                        <span>Submitted: {sheet.submittedAt}</span>
                        {sheet.reviewedAt && <span>Reviewed: {sheet.reviewedAt}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
