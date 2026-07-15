import React, { useMemo, useState } from 'react';
import { Ticket } from '../types';
import { getDaysDiff } from '../utils/storage';
import { Calendar as CalendarIcon, User, Clock, AlertCircle, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';

interface GanttChartProps {
  tickets: Ticket[];
  projectStartDate: string;
  projectEndDate: string;
  onTicketClick?: (ticket: Ticket) => void;
  levels?: string[];
  components?: string[];
}

export default function GanttChart({
  tickets,
  projectStartDate,
  projectEndDate,
  onTicketClick,
  levels,
  components
}: GanttChartProps) {
  const [viewMode, setViewMode] = useState<'gantt' | 'calendar'>('gantt');

  // Calendar view Month/Year state
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const start = new Date(projectStartDate);
    return isNaN(start.getTime()) ? new Date() : start;
  });

  // Determine Gantt start and end boundaries
  const { minDate, maxDate, dateRangeDays } = useMemo(() => {
    let start = new Date(projectStartDate);
    let end = new Date(projectEndDate);

    if (isNaN(start.getTime())) start = new Date();
    if (isNaN(end.getTime())) end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days default

    // Incorporate ticket dates to expand boundaries if needed
    tickets.forEach(t => {
      const dates = [
        t.startDate,
        t.targetSubmissionDate,
        t.actualSubmissionDate,
        t.thirdPartyResponseDate,
        t.govSubmissionDate,
        t.govResponseDate,
        t.completionDate
      ].filter(Boolean) as string[];

      dates.forEach(dStr => {
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) {
          if (d < start) start = d;
          if (d > end) end = d;
        }
      });
    });

    // Add a bit of padding (e.g. 5 days before and after)
    const finalStart = new Date(start.getTime() - 5 * 24 * 60 * 60 * 1000);
    const finalEnd = new Date(end.getTime() + 10 * 24 * 60 * 60 * 1000);
    const diff = Math.ceil((finalEnd.getTime() - finalStart.getTime()) / (1000 * 60 * 60 * 24));

    return {
      minDate: finalStart,
      maxDate: finalEnd,
      dateRangeDays: diff > 0 ? diff : 30
    };
  }, [tickets, projectStartDate, projectEndDate]);

  const sortedTickets = useMemo(() => {
    const listLevels = levels || ['Substructure', '1st Floor', '2nd Floor', '3rd Floor', 'Roof'];
    const listComponents = components || ['Foundations', 'Columns', 'Beams', 'Slabs', 'Walls', 'Retaining Walls'];
    
    return [...tickets].sort((a, b) => {
      const levelA = a.structureLevel || '';
      const levelB = b.structureLevel || '';
      
      const idxLevelA = listLevels.indexOf(levelA);
      const idxLevelB = listLevels.indexOf(levelB);
      
      const realIdxA = idxLevelA === -1 ? 9999 : idxLevelA;
      const realIdxB = idxLevelB === -1 ? 9999 : idxLevelB;
      
      if (realIdxA !== realIdxB) {
        return realIdxA - realIdxB;
      }
      
      const compA = a.structureComponent || '';
      const compB = b.structureComponent || '';
      
      const idxCompA = listComponents.indexOf(compA);
      const idxCompB = listComponents.indexOf(compB);
      
      const realCompIdxA = idxCompA === -1 ? 9999 : idxCompA;
      const realCompIdxB = idxCompB === -1 ? 9999 : idxCompB;
      
      if (realCompIdxA !== realCompIdxB) {
        return realCompIdxA - realCompIdxB;
      }
      
      return a.ticketCode.localeCompare(b.ticketCode, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [tickets, levels, components]);

  // Helper to calculate percentage offset from the left
  const getPercentOffset = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 0;
    const diff = date.getTime() - minDate.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(100, (days / dateRangeDays) * 100));
  };

  // Generate ticks for the grid timeline (weekly)
  const timelineTicks = useMemo(() => {
    const ticks = [];
    const intervalDays = Math.max(7, Math.ceil(dateRangeDays / 10)); // target around 10 grid lines
    
    const current = new Date(minDate);
    while (current < maxDate) {
      ticks.push({
        dateStr: current.toISOString().split('T')[0],
        label: current.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        percent: getPercentOffset(current.toISOString().split('T')[0])
      });
      current.setDate(current.getDate() + intervalDays);
    }
    return ticks;
  }, [minDate, maxDate, dateRangeDays]);

  // Calendar generation logic
  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    // First day of current month (Sunday is 0, Monday is 1, etc.)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Total days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Days in previous month
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({
        date: d,
        dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        isCurrentMonth: false,
        dayNum: d.getDate()
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      cells.push({
        date: dateObj,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: true,
        dayNum: d
      });
    }

    // Next month padding days to complete 6 weeks (42 cells)
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        isCurrentMonth: false,
        dayNum: i
      });
    }

    return cells;
  }, [calendarMonth]);

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const handleResetMonth = () => {
    const start = new Date(projectStartDate);
    setCalendarMonth(isNaN(start.getTime()) ? new Date() : start);
  };

  if (tickets.length === 0) {
    return (
      <div id="gantt-empty-state" className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded border border-dashed border-slate-300">
        <CalendarIcon className="w-10 h-10 text-slate-400 mb-2" />
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">No submittal tickets drafted yet for this project.</p>
        <p className="text-[11px] text-slate-400 mt-1">Add a submittal ticket using the button above to visualize schedules.</p>
      </div>
    );
  }

  // Check if a ticket spans across a date
  const isTicketSpanningDate = (ticket: Ticket, cellDateStr: string) => {
    const start = ticket.startDate;
    const end = ticket.completionDate || ticket.targetSubmissionDate || ticket.startDate;
    return cellDateStr >= start && cellDateStr <= end;
  };

  // Status-based badge styling helper
  const getStatusStyles = (status: string) => {
    if (status === 'Completed') {
      return {
        bg: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600',
        dot: 'bg-emerald-200'
      };
    }
    if (status.includes('Revise')) {
      return {
        bg: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600',
        dot: 'bg-rose-200'
      };
    }
    if (status.includes('Accepted') || status.includes('Approved')) {
      return {
        bg: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700',
        dot: 'bg-blue-200'
      };
    }
    if (status.includes('Review')) {
      return {
        bg: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600',
        dot: 'bg-amber-200'
      };
    }
    return {
      bg: 'bg-slate-600 hover:bg-slate-700 text-white border-slate-700',
      dot: 'bg-slate-300'
    };
  };

  return (
    <div id="gantt-container" className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Control Header with Toggles */}
      <div className="p-3 border-b border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-3 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              Project Schedule & View Mode
            </h3>
            <p className="text-[10px] text-slate-400">Track and view active engineering approvals, revisions, and milestone dates.</p>
          </div>
        </div>

        {/* Schedule Toggles */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Quick Stats Helper */}
          <div className="hidden lg:flex items-center gap-2.5 text-[10px] font-mono text-slate-500 border-r border-slate-200 pr-3 mr-1">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Draft</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>Peer</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              <span>Gov</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Complete</span>
            </div>
          </div>

          <div className="inline-flex bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'gantt'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              Gantt Timeline
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarIcon className="w-3 h-3" />
              Calendar View
            </button>
          </div>
        </div>
      </div>

      {/* RENDER VIEWMODE: GANTT */}
      {viewMode === 'gantt' && (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Gantt Header Row */}
            <div className="flex border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 bg-slate-50/50 tracking-wider">
              {/* Task Info Label Column */}
              <div className="w-1/4 p-2.5 border-r border-slate-200 shrink-0">Submittal Item / Task</div>
              {/* Timeline Scales */}
              <div className="w-3/4 relative h-8 shrink-0">
                {timelineTicks.map((tick, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-slate-200/50 pt-2 pl-1.5 h-full text-[9px] text-slate-400 font-mono"
                    style={{ left: `${tick.percent}%` }}
                  >
                    {tick.label.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Body Rows */}
            <div className="divide-y divide-slate-100">
              {sortedTickets.map(ticket => {
                const startPct = getPercentOffset(ticket.startDate);
                const targetSubPct = getPercentOffset(ticket.targetSubmissionDate);
                const actualSubPct = ticket.actualSubmissionDate ? getPercentOffset(ticket.actualSubmissionDate) : null;
                const reviewEndPct = ticket.thirdPartyResponseDate ? getPercentOffset(ticket.thirdPartyResponseDate) : null;
                const govSubPct = ticket.govSubmissionDate ? getPercentOffset(ticket.govSubmissionDate) : null;
                const govEndPct = ticket.govResponseDate ? getPercentOffset(ticket.govResponseDate) : null;
                const completedPct = ticket.completionDate ? getPercentOffset(ticket.completionDate) : null;

                const draftEndPct = actualSubPct ?? Math.min(100, getPercentOffset(new Date().toISOString().split('T')[0]));
                const draftWidth = Math.max(1, draftEndPct - startPct);

                let peerReviewStart = actualSubPct;
                let peerReviewEnd = null;
                if (peerReviewStart !== null) {
                  peerReviewEnd = reviewEndPct ?? Math.min(100, getPercentOffset(new Date().toISOString().split('T')[0]));
                }
                const peerReviewWidth = peerReviewStart !== null && peerReviewEnd !== null ? Math.max(1, peerReviewEnd - peerReviewStart) : 0;

                let govStart = govSubPct ?? (reviewEndPct && ticket.status.includes('Government') ? reviewEndPct : null);
                let govEnd = null;
                if (govStart !== null) {
                  govEnd = govEndPct ?? completedPct ?? Math.min(100, getPercentOffset(new Date().toISOString().split('T')[0]));
                }
                const govWidth = govStart !== null && govEnd !== null ? Math.max(1, govEnd - govStart) : 0;

                let badgeStyle = "bg-slate-100 text-slate-700 border border-slate-200";
                if (ticket.status === 'Completed') badgeStyle = "bg-emerald-100 text-emerald-800 border border-emerald-200";
                else if (ticket.status.includes('Revise')) badgeStyle = "bg-rose-100 text-rose-800 border border-rose-200";
                else if (ticket.status.includes('Accepted') || ticket.status.includes('Approved')) badgeStyle = "bg-blue-100 text-blue-800 border border-blue-200";
                else if (ticket.status.includes('Review')) badgeStyle = "bg-amber-100 text-amber-800 border border-amber-200";

                return (
                  <div
                    key={ticket.id}
                    id={`gantt-row-${ticket.id}`}
                    className="flex hover:bg-slate-50 transition-colors group cursor-pointer items-center"
                    onClick={() => onTicketClick?.(ticket)}
                  >
                    <div className="w-1/4 p-2.5 border-r border-slate-150 shrink-0 text-[11px] flex flex-col gap-0.5 justify-center h-12">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="font-semibold text-slate-800 truncate" title={ticket.title}>
                          #{ticket.ticketCode} - {ticket.title}
                        </span>
                        <span className={`text-[8px] px-1.5 py-0.2 font-bold uppercase rounded ${badgeStyle}`}>
                          {ticket.status.replace(' (Third-Party)', '').replace(' (Government)', '').replace('Submission', 'Sub')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono">
                        <span className="flex items-center gap-0.5 font-bold text-slate-500 uppercase">
                          <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          {ticket.assignee}
                        </span>
                        <span>•</span>
                        {ticket.structureLevel && (
                          <span className="text-blue-600 font-bold uppercase">{ticket.structureLevel}</span>
                        )}
                      </div>
                    </div>

                    <div className="w-3/4 relative h-12 shrink-0 flex items-center bg-transparent">
                      {timelineTicks.map((tick, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none h-full"
                          style={{ left: `${tick.percent}%` }}
                        ></div>
                      ))}

                      <div className="absolute inset-x-0 h-6 flex items-center">
                        <div
                          className="absolute w-1 h-5 bg-red-400 rounded-sm z-20 group-hover:bg-red-500"
                          style={{ left: `${targetSubPct}%` }}
                          title={`Target Submission Date: ${ticket.targetSubmissionDate}`}
                        >
                          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[8px] bg-red-100 text-red-700 px-0.5 font-bold rounded">TARGET</span>
                        </div>

                        <div
                          className="absolute h-4.5 bg-blue-500 rounded-sm shadow-2xs flex items-center justify-center text-[9px] text-white font-bold truncate px-1 transition-all group-hover:brightness-105"
                          style={{
                            left: `${startPct}%`,
                            width: `${draftWidth}%`
                          }}
                          title={`Drafting Phase: ${ticket.startDate} to ${ticket.actualSubmissionDate || 'current'}`}
                        >
                          {draftWidth > 5 && 'DRAFT'}
                        </div>

                        {peerReviewWidth > 0 && peerReviewStart !== null && (
                          <div
                            className="absolute h-4.5 bg-amber-500 rounded-none shadow-2xs flex items-center justify-center text-[9px] text-white font-bold truncate px-1 transition-all group-hover:brightness-105"
                            style={{
                              left: `${peerReviewStart}%`,
                              width: `${peerReviewWidth}%`
                            }}
                            title={`Third-Party Peer Review: ${ticket.actualSubmissionDate} to ${ticket.thirdPartyResponseDate || 'current'}`}
                          >
                            {peerReviewWidth > 5 && 'PEER'}
                          </div>
                        )}

                        {govWidth > 0 && govStart !== null && (
                          <div
                            className={`absolute h-4.5 bg-purple-500 shadow-2xs flex items-center justify-center text-[9px] text-white font-bold truncate px-1 transition-all group-hover:brightness-105 ${completedPct ? '' : 'rounded-r-sm'}`}
                            style={{
                              left: `${govStart}%`,
                              width: `${govWidth}%`
                            }}
                            title={`Government Review: ${ticket.govSubmissionDate || ticket.thirdPartyResponseDate} to ${ticket.govResponseDate || 'current'}`}
                          >
                            {govWidth > 5 && 'GOV'}
                          </div>
                        )}

                        {completedPct !== null && (
                          <div
                            className="absolute h-4.5 bg-emerald-500 rounded-r-sm shadow-2xs flex items-center justify-center text-[9px] text-white font-bold px-1 transition-all group-hover:brightness-105"
                            style={{
                              left: `${completedPct}%`,
                              width: '2%'
                            }}
                            title={`Completed on: ${ticket.completionDate}`}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEWMODE: CALENDAR */}
      {viewMode === 'calendar' && (
        <div className="p-4 space-y-4">
          
          {/* Calendar Header Controls */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors border border-slate-200 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-800 font-mono w-32 text-center">
                {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h4>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors border border-slate-200 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetMonth}
                className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 transition-colors rounded cursor-pointer"
              >
                Reset to Project Start
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-400 tracking-wider">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
            {calendarCells.map((cell, idx) => {
              const activeOnCell = tickets.filter(t => isTicketSpanningDate(t, cell.dateStr));
              const isToday = cell.dateStr === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={idx}
                  className={`min-h-[90px] bg-white p-1 rounded flex flex-col justify-between transition-all relative group ${
                    cell.isCurrentMonth ? '' : 'bg-slate-50/50 opacity-40'
                  } ${isToday ? 'ring-1 ring-blue-500 bg-blue-50/10' : ''}`}
                >
                  {/* Day number header */}
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`text-[10px] font-bold font-mono px-1 rounded ${
                        isToday ? 'bg-blue-600 text-white rounded' : 'text-slate-600'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {activeOnCell.length > 0 && cell.isCurrentMonth && (
                      <span className="text-[8px] text-slate-400 font-bold uppercase">
                        {activeOnCell.length} {activeOnCell.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>

                  {/* Badges container */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[64px] scrollbar-thin">
                    {activeOnCell.map(t => {
                      const styles = getStatusStyles(t.status);
                      const isTicketStart = t.startDate === cell.dateStr;
                      const isTicketTarget = t.targetSubmissionDate === cell.dateStr;
                      const isTicketCompleted = t.completionDate === cell.dateStr;

                      return (
                        <div
                          key={t.id}
                          onClick={() => onTicketClick?.(t)}
                          className={`px-1 py-0.5 rounded text-[8px] font-medium leading-tight cursor-pointer border border-transparent truncate text-left transition-colors flex items-center justify-between ${styles.bg}`}
                          title={`#${t.ticketCode} - ${t.title} (${t.status})`}
                        >
                          <span className="truncate">
                            #{t.ticketCode} {t.title}
                          </span>
                          {isTicketCompleted && <span className="text-[7px] bg-white/20 px-0.5 font-bold uppercase shrink-0 rounded ml-0.5">✓</span>}
                          {!isTicketCompleted && isTicketTarget && <span className="text-[7px] bg-red-600/30 text-white px-0.5 font-bold uppercase shrink-0 rounded ml-0.5">SUB</span>}
                          {!isTicketCompleted && !isTicketTarget && isTicketStart && <span className="text-[7px] bg-blue-600/30 text-white px-0.5 font-bold uppercase shrink-0 rounded ml-0.5">IN</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-left text-[9px] text-slate-400 font-mono uppercase tracking-wider">
            💡 Calendar Legend: Labels show active task spans. Flags: <span className="font-bold text-slate-700">IN</span> = Start Date, <span className="font-bold text-red-600">SUB</span> = Target Submission, <span className="font-bold text-emerald-600">✓</span> = Closed out.
          </p>
        </div>
      )}

    </div>
  );
}
