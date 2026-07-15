import React, { useState, useMemo } from 'react';
import { Project, Ticket, HourLog } from '../types';
import { getDaysDiff } from '../utils/storage';
import { Download, Search, Filter, RefreshCw, FileSpreadsheet } from 'lucide-react';

interface SheetsReportProps {
  project: Project;
  tickets: Ticket[];
  hourLogs: HourLog[];
}

export default function SheetsReport({ project, tickets, hourLogs }: SheetsReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  // Column definitions for the Spreadsheet
  const columns = [
    { label: 'Item Code', key: 'ticketCode', letter: 'A', width: 'w-20' },
    { label: 'Submittal Task / Item', key: 'title', letter: 'B', width: 'w-56' },
    { label: 'Status', key: 'status', letter: 'C', width: 'w-44' },
    { label: 'Start Date', key: 'startDate', letter: 'D', width: 'w-28' },
    { label: 'Target Sub Date', key: 'targetSubmissionDate', letter: 'E', width: 'w-32' },
    { label: 'Actual Sub Date', key: 'actualSubmissionDate', letter: 'F', width: 'w-32' },
    { label: 'Prep Time (Days)', key: 'prepDays', letter: 'G', width: 'w-32' },
    { label: '3rd Party Resp Date', key: 'thirdPartyResponseDate', letter: 'H', width: 'w-36' },
    { label: 'Turnaround (Days)', key: 'turnaroundDays', letter: 'I', width: 'w-32' },
    { label: 'Assignee', key: 'assignee', letter: 'J', width: 'w-36' },
    { label: 'Issuer', key: 'creatorName', letter: 'K', width: 'w-36' },
    { label: 'Total Hours', key: 'loggedHours', letter: 'L', width: 'w-24' },
    { label: 'Remarks', key: 'remarks', letter: 'M', width: 'w-64' },
    { label: 'Latest Activity', key: 'activity', letter: 'N', width: 'w-72' },
  ];

  // Process tickets for the selected project
  const processedData = useMemo(() => {
    // Filter to project's tickets
    let projectTickets = tickets.filter(t => t.projectId === project.id);

    // Apply search
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      projectTickets = projectTickets.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.ticketCode.toLowerCase().includes(q) ||
          t.assignee.toLowerCase().includes(q) ||
          t.remarks.toLowerCase().includes(q)
      );
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      projectTickets = projectTickets.filter(t => t.status === statusFilter);
    }

    // Sort by Item Number and then Revision number (ascending)
    projectTickets.sort((a, b) => {
      const itemA = parseFloat(a.itemNumber) || 0;
      const itemB = parseFloat(b.itemNumber) || 0;
      if (itemA !== itemB) return itemA - itemB;
      return a.revision - b.revision;
    });

    return projectTickets.map(ticket => {
      // Get all hour logs for this ticket
      const ticketLogs = hourLogs.filter(h => h.ticketId === ticket.id);
      const totalHours = ticketLogs.reduce((sum, log) => sum + log.hours, 0);

      // Prep days: Actual submission date - Start date
      let prepDays: number | string = 'N/A';
      if (ticket.actualSubmissionDate) {
        const diff = getDaysDiff(ticket.startDate, ticket.actualSubmissionDate);
        prepDays = diff !== null ? `${diff} days` : 'N/A';
      }

      // Review turnaround days: Response date - Actual submission date
      let turnaroundDays: number | string = 'N/A';
      if (ticket.actualSubmissionDate && ticket.thirdPartyResponseDate) {
        const diff = getDaysDiff(ticket.actualSubmissionDate, ticket.thirdPartyResponseDate);
        turnaroundDays = diff !== null ? `${diff} days` : 'N/A';
      }

      return {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        title: ticket.title,
        status: ticket.status,
        startDate: ticket.startDate,
        targetSubmissionDate: ticket.targetSubmissionDate,
        actualSubmissionDate: ticket.actualSubmissionDate || 'Pending',
        prepDays,
        thirdPartyResponseDate: ticket.thirdPartyResponseDate || 'Pending',
        turnaroundDays,
        assignee: ticket.assignee,
        creatorName: ticket.creatorName || 'System',
        loggedHours: totalHours,
        remarks: ticket.remarks || 'No remarks',
        activity: ticket.history[ticket.history.length - 1] || 'No activity',
      };
    });
  }, [tickets, project.id, searchQuery, statusFilter, hourLogs]);

  // Aggregate stats
  const totalHoursAgg = useMemo(() => {
    return processedData.reduce((sum, row) => sum + row.loggedHours, 0);
  }, [processedData]);

  // Generate CSV data and trigger download
  const downloadCSV = () => {
    const csvRows = [];
    
    // Add Metadata header
    csvRows.push(`PROJECT REPORT: ${project.name} (${project.code})`);
    csvRows.push(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`);
    csvRows.push('');

    // Add Columns headers
    csvRows.push(columns.map(c => `"${c.label}"`).join(','));

    // Add Data rows
    processedData.forEach(row => {
      const vals = [
        row.ticketCode,
        row.title,
        row.status,
        row.startDate,
        row.targetSubmissionDate,
        row.actualSubmissionDate,
        row.prepDays,
        row.thirdPartyResponseDate,
        row.turnaroundDays,
        row.assignee,
        row.creatorName,
        row.loggedHours,
        row.remarks,
        row.activity
      ];
      csvRows.push(vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });

    // Add Summary Row
    csvRows.push('');
    csvRows.push(`"Total Items","${processedData.length}"`);
    csvRows.push(`"Total Productivity Hours","${totalHoursAgg}"`);

    // Create Blob and download
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${project.code}_Submittal_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status List for filters
  const allStatuses = [
    'Pending Submission',
    'Under Review (Third-Party)',
    'Accepted (Third-Party)',
    'Accepted with Notes (Third-Party)',
    'Revise and Resubmit (Third-Party)',
    'Under Review (Government)',
    'Approved (Government)',
    'Revise and Resubmit (Government)',
    'Completed'
  ];

  // Selected cell value to show in formula bar
  const formulaBarValue = useMemo(() => {
    if (!selectedCell) return 'Select a cell to view its formula / exact value';
    const rowObj = processedData[selectedCell.row - 1];
    if (!rowObj) {
      if (selectedCell.row === 0) {
        return `Header Column: ${columns[selectedCell.col].label} (${columns[selectedCell.col].letter})`;
      }
      return '';
    }
    const colKey = columns[selectedCell.col].key as keyof typeof rowObj;
    const val = rowObj[colKey];
    return `Cell ${columns[selectedCell.col].letter}${selectedCell.row + 1}: ${val}`;
  }, [selectedCell, processedData]);

  return (
    <div id="sheets-report-wrapper" className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Spreadsheet Header / Toolbar */}
      <div className="p-2 border-b border-slate-200 bg-emerald-50/70 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-700 text-white rounded">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              Google Sheets Live Report: {project.name}
            </h3>
            <p className="text-[9px] text-slate-500 font-medium">Interactive grid formatted as a spreadsheet. Double-click or select cells to inspect.</p>
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sheet..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 text-[11px] rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 h-7"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-1.5 py-1 text-[11px] rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 h-7"
            >
              <option value="ALL">All Statuses</option>
              {allStatuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Download CSV button */}
          <button
            onClick={downloadCSV}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded shadow-xs transition-all cursor-pointer h-7 uppercase tracking-wider"
          >
            <Download className="w-3 h-3" />
            Export (.CSV)
          </button>
        </div>
      </div>

      {/* Google Sheets Formula Bar */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-600">
        <span className="font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded border border-emerald-200 select-none">
          {selectedCell ? `${columns[selectedCell.col].letter}${selectedCell.row + 1}` : 'FX'}
        </span>
        <div className="h-3 w-[1px] bg-slate-300 mx-0.5"></div>
        <input
          type="text"
          readOnly
          value={formulaBarValue}
          className="flex-1 bg-white border border-slate-200 rounded px-2 py-0.5 focus:outline-none select-all text-slate-700 text-[10px]"
        />
      </div>

      {/* Spreadsheet Main Canvas */}
      <div className="overflow-auto max-h-[500px] bg-slate-100">
        <table className="w-full border-collapse bg-white table-fixed select-none">
          {/* Column Letters Row (A, B, C...) */}
          <thead>
            <tr className="bg-slate-50 text-[9px] font-bold text-slate-400 font-mono text-center">
              {/* Top-Left empty cell for row indexes */}
              <th className="w-8 border-r border-b border-slate-200 bg-slate-100 sticky left-0 top-0 z-30 select-none"></th>
              {columns.map((col, index) => (
                <th
                  key={index}
                  className={`${col.width} border-r border-b border-slate-200 bg-slate-50 py-0.5 font-semibold text-slate-500 sticky top-0 z-20 hover:bg-slate-200 transition-colors`}
                  onClick={() => setSelectedCell({ row: 0, col: index })}
                >
                  {col.letter}
                </th>
              ))}
            </tr>

            {/* Column Label Headers (A1, B1...) */}
            <tr className="bg-slate-100/50 text-[10px] font-bold uppercase text-slate-600 tracking-wider">
              <th className="border-r border-b border-slate-200 bg-slate-100 sticky left-0 z-20 text-center font-mono text-slate-400 py-1">
                1
              </th>
              {columns.map((col, index) => (
                <td
                  key={index}
                  className="border-r border-b border-slate-200 px-2 py-1 font-semibold bg-slate-50/80 text-slate-700 text-left truncate sticky top-[18px] z-10 font-sans shadow-xs"
                  onClick={() => setSelectedCell({ row: 0, col: index })}
                >
                  {col.label}
                </td>
              ))}
            </tr>
          </thead>

          {/* Spreadsheet Data Rows */}
          <tbody className="divide-y divide-slate-100">
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-10 bg-white text-slate-400 text-[11px] font-mono">
                  No matching items found. Add submittal tickets or adjust filters.
                </td>
              </tr>
            ) : (
              processedData.map((row, rowIndex) => {
                const rowNum = rowIndex + 2; // Rows start at 2 since headers are row 1
                return (
                  <tr key={row.id} className="hover:bg-blue-50/10 text-[11px] text-slate-700 font-sans transition-colors">
                    {/* Row index indicator */}
                    <td className="border-r border-b border-slate-200 bg-slate-100 sticky left-0 z-10 text-center font-mono text-slate-400 font-bold select-none text-[9px] py-1">
                      {rowNum}
                    </td>

                    {/* Data Cells */}
                    {columns.map((col, colIndex) => {
                      const value = row[col.key as keyof typeof row] ?? '';
                      const isSelected = selectedCell?.row === rowNum - 1 && selectedCell?.col === colIndex;

                      // Highlight different statuses beautifully
                      let cellStyle = "text-left px-2 py-1 truncate border-r border-b border-slate-150 relative";
                      if (isSelected) {
                        cellStyle += " ring-1 ring-emerald-500 bg-emerald-50/15 z-10";
                      }

                      // Dynamic alignment or fonts for cells
                      let textStyle = "text-slate-800";
                      if (col.key === 'ticketCode') textStyle = "font-mono font-bold text-slate-500";
                      if (col.key === 'startDate' || col.key === 'targetSubmissionDate' || col.key === 'actualSubmissionDate' || col.key === 'thirdPartyResponseDate') {
                        textStyle = "font-mono text-slate-500 text-[10px]";
                      }
                      if (col.key === 'loggedHours') {
                        textStyle = "font-mono font-bold text-right text-indigo-600 block pr-1";
                      }

                      // Badge styles inside sheet cells for status
                      let statusBadge = null;
                      if (col.key === 'status') {
                        let badgeColor = "bg-slate-100 text-slate-700";
                        if (row.status === 'Completed') badgeColor = "bg-emerald-100 text-emerald-800 font-bold border border-emerald-200";
                        else if (row.status.includes('Revise')) badgeColor = "bg-rose-100 text-rose-800 border border-rose-200";
                        else if (row.status.includes('Accepted') || row.status.includes('Approved')) badgeColor = "bg-blue-100 text-blue-800 border border-blue-200";
                        else if (row.status.includes('Review')) badgeColor = "bg-amber-100 text-amber-800 border border-amber-200";
                        statusBadge = (
                          <span className={`px-1 py-0.2 rounded text-[8px] font-bold uppercase inline-block ${badgeColor}`}>
                            {row.status.replace(' (Third-Party)', '').replace(' (Government)', '')}
                          </span>
                        );
                      }

                      return (
                        <td
                          key={colIndex}
                          className={cellStyle}
                          onClick={() => setSelectedCell({ row: rowNum - 1, col: colIndex })}
                        >
                          {col.key === 'status' && statusBadge ? (
                            statusBadge
                          ) : (
                            <span className={textStyle}>{value}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}

            {/* Total Aggregate Row (like a spreadsheet bottom sum) */}
            {processedData.length > 0 && (
              <tr className="bg-slate-50 font-bold text-[11px] border-t-2 border-slate-300">
                <td className="border-r border-slate-200 bg-slate-150 sticky left-0 z-10 text-center font-mono text-slate-400 font-bold text-[9px] py-1">
                  {processedData.length + 2}
                </td>
                {columns.map((col, colIndex) => {
                  let val = '';
                  let align = 'text-left';
                  if (colIndex === 0) {
                    val = 'SUM';
                  } else if (colIndex === 1) {
                    val = `Total: ${processedData.length} items`;
                  } else if (col.key === 'loggedHours') {
                    val = `${totalHoursAgg} hrs`;
                    align = 'text-right pr-2 font-mono text-indigo-600';
                  }

                  return (
                    <td
                      key={colIndex}
                      className={`border-r border-b border-slate-200 px-2 py-1 font-bold text-slate-700 ${align}`}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Grid statistics footer */}
      <div className="px-2 py-1.5 bg-emerald-50/30 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-600 font-mono">
        <div className="flex items-center gap-3">
          <span>PROJECT: <strong className="text-slate-800">{project.name.toUpperCase()} ({project.code})</strong></span>
          <span className="w-[1px] h-2.5 bg-slate-300"></span>
          <span>ITEMS: <strong className="text-slate-800">{processedData.length}</strong></span>
          <span className="w-[1px] h-2.5 bg-slate-300"></span>
          <span>PRODUCTIVITY: <strong className="text-indigo-600">{totalHoursAgg} HRS</strong></span>
        </div>
        <div className="text-[9px] text-slate-400">
          SHEET TEMPLATE V2.4.0 • FORMULA ENGINE
        </div>
      </div>
    </div>
  );
}
