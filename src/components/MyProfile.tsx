import React, { useState, useEffect } from 'react';
import { Project, RegistryUser, ProfileChangeRequest } from '../types';
import { AppUser, fetchProfileChangeRequestsDb, saveProfileChangeRequestDb } from '../utils/firebase';
import { 
  User, 
  Mail, 
  Briefcase, 
  Clock, 
  Calendar, 
  DollarSign, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  History, 
  ArrowRight,
  RefreshCw,
  X,
  FileEdit
} from 'lucide-react';

interface MyProfileProps {
  currentUser: AppUser | null;
  projects: Project[];
  users?: AppUser[];
}

export default function MyProfile({ currentUser, projects, users = [] }: MyProfileProps) {
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Drafter');
  const [supervisor, setSupervisor] = useState('');
  const [dateOfEngagement, setDateOfEngagement] = useState('');
  const [rate, setRate] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Load requests history for this user
  const loadRequests = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const allReqs = await fetchProfileChangeRequestsDb();
      const myReqs = allReqs.filter(r => r.userId === currentUser.uid);
      // Sort newest first
      myReqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(myReqs);
    } catch (err) {
      console.error('Failed to load profile requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [currentUser]);

  // Pre-fill form state when opening it
  const openForm = () => {
    if (!currentUser) return;
    setName(currentUser.name || '');
    setEmail(currentUser.email || '');
    setRole(currentUser.role || 'Drafter');
    setSupervisor(currentUser.supervisor || '');
    setDateOfEngagement(currentUser.dateOfEngagement || '');
    setRate(currentUser.rate || 0);
    setCurrency(currentUser.currency || 'USD');
    setSelectedProjectIds(currentUser.projectIds || []);
    setIsFormOpen(true);
    setSuccessMsg('');
    setErrorMsg('');
  };

  // Submit Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setErrorMsg('');
    setSuccessMsg('');

    // Check if there is already a pending request
    const pendingRequest = requests.find(r => r.status === 'Pending');
    if (pendingRequest) {
      setErrorMsg('You already have a pending change request. Please wait for an administrator to review it.');
      return;
    }

    const requestId = 'req_' + Date.now();
    const newRequest: ProfileChangeRequest = {
      id: requestId,
      userId: currentUser.uid,
      userName: currentUser.name || 'Anonymous',
      userEmail: currentUser.email,
      requestedData: {
        name,
        email,
        role,
        supervisor,
        dateOfEngagement,
        rate,
        currency,
        projectIds: selectedProjectIds
      },
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    try {
      await saveProfileChangeRequestDb(newRequest);
      setSuccessMsg('Your profile change request has been successfully submitted for Admin approval!');
      setIsFormOpen(false);
      loadRequests();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit profile change request.');
    }
  };

  if (!currentUser) {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p>Please authenticate to view your profile.</p>
      </div>
    );
  }

  const hasPendingRequest = requests.some(r => r.status === 'Pending');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Profile Header Widget */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 text-white shadow-md p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-5 select-none">
          <User className="w-64 h-64" />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 relative">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 border-2 border-white/20 flex items-center justify-center text-2xl font-black uppercase font-sans shadow-md">
              {currentUser.name ? currentUser.name.slice(0, 2) : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold uppercase tracking-tight">{currentUser.name}</h2>
                {currentUser.isAdmin && (
                  <span className="bg-emerald-500 text-slate-950 font-black text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded">
                    Admin Access
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                Role: {currentUser.role || 'Unspecified'}
              </p>
            </div>
          </div>

          <button 
            disabled={hasPendingRequest}
            onClick={openForm}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition flex items-center gap-1.5 shadow-sm ${
              hasPendingRequest
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-white hover:bg-slate-100 text-slate-900'
            }`}
          >
            <FileEdit className="w-4 h-4" />
            {hasPendingRequest ? 'Pending Review' : 'Request Profile Update'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-medium rounded border border-emerald-200 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 text-rose-800 text-xs font-medium rounded border border-rose-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: User Details + Request History */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Left Col: Core Professional Card */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-2xs">
          <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> Registry Credentials
          </h3>

          <div className="space-y-3.5">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Supervisor</p>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                {currentUser.supervisor || <span className="italic font-normal text-slate-400">None Assigned</span>}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Engagement Date</p>
              <p className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {currentUser.dateOfEngagement || <span className="italic font-normal text-slate-400">Not Recorded</span>}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Standard Hourly Rate</p>
              <p className="text-xs font-bold text-indigo-650 mt-0.5 font-mono">
                {currentUser.rate !== undefined && currentUser.rate !== null ? (
                  `${currentUser.rate.toLocaleString()} ${currentUser.currency || 'USD'}`
                ) : (
                  <span className="italic font-normal text-slate-400">Not Configured</span>
                )}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Allocated Projects</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {currentUser.projectIds && currentUser.projectIds.length > 0 ? (
                  currentUser.projectIds.map(pid => {
                    const proj = projects.find(p => p.id === pid);
                    return (
                      <span key={pid} className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded border border-slate-200">
                        {proj ? `${proj.code} - ${proj.name}` : pid}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[10px] italic text-slate-400">No projects assigned yet</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Request Logs */}
        <div className="md:col-span-3 bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-2xs flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 shrink-0">
            <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <History className="w-3.5 h-3.5" /> Request Review Log
            </h3>
            <button 
              onClick={loadRequests}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-600 transition disabled:opacity-40"
              title="Refresh request records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[350px] pr-1">
            {requests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-350" />
                <p>No profile modification requests recorded.</p>
              </div>
            ) : (
              requests.map((r) => (
                <div key={r.id} className="p-3 border border-slate-150 rounded bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="text-[10px] text-slate-550 font-mono">
                      Request ID: <span className="font-bold">{r.id.slice(-6)}</span>
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      r.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-600 grid grid-cols-2 gap-x-3 gap-y-1 mt-1 border-t border-dashed border-slate-200 pt-2">
                    <div>
                      <span className="text-slate-400 font-semibold">Name: </span>
                      <span className="font-medium text-slate-800">{r.requestedData.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Rate: </span>
                      <span className="font-mono text-slate-800 font-bold">{r.requestedData.rate} {r.requestedData.currency}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Supervisor: </span>
                      <span className="font-medium text-slate-800">{r.requestedData.supervisor || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Projects: </span>
                      <span className="font-medium text-slate-800">
                        {r.requestedData.projectIds && r.requestedData.projectIds.length > 0
                          ? r.requestedData.projectIds.map(pid => projects.find(p => p.id === pid)?.code || pid).join(', ')
                          : 'None'}
                      </span>
                    </div>
                  </div>

                  {r.adminRemarks && (
                    <div className="bg-white border border-slate-200 p-2 rounded text-[9px] text-slate-600 mt-1.5">
                      <strong className="text-slate-700 uppercase tracking-wide">Review Remarks:</strong> {r.adminRemarks}
                    </div>
                  )}

                  <div className="text-[9px] text-slate-400 font-mono text-right mt-1.5">
                    Submitted: {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* POPUP: EDIT PROFILE REQUEST FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col my-auto max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Request Profile Modification
                </h3>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitRequest} className="p-4 space-y-4 overflow-y-auto">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                Your submission goes to administrators. Changes will apply immediately upon approval.
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Full Name</label>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Professional Email</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Company Role</label>
                  <select
                    disabled
                    value={role}
                    className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs text-slate-500 cursor-not-allowed focus:outline-none"
                  >
                    <option value="Drafter">Drafter</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Proposed Supervisor</label>
                  <select
                    value={supervisor}
                    onChange={(e) => setSupervisor(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-500"
                  >
                    <option value="">None Assigned</option>
                    {supervisor && !users.some(u => u.name === supervisor && u.status === 'Approved') && (
                      <option value={supervisor}>{supervisor} (Previous/Custom)</option>
                    )}
                    {users
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
                <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Requested Projects Assignment</label>
                <div className="border border-slate-200 rounded p-2 max-h-[85px] overflow-y-auto space-y-1.5 bg-slate-50/50">
                  {projects.map(p => {
                    const isChecked = selectedProjectIds.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-[10px] text-slate-600 font-medium cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedProjectIds(selectedProjectIds.filter(id => id !== p.id));
                            } else {
                              setSelectedProjectIds([...selectedProjectIds, p.id]);
                            }
                          }}
                        />
                        <span>{p.name}</span>
                      </label>
                    );
                  })}
                  {projects.length === 0 && (
                    <span className="text-[9px] text-slate-400 italic">No projects available for registration</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400"><Calendar className="w-3 h-3 inline mr-0.5" /> ENGAGEMENT DATE</label>
                  <input 
                    type="date"
                    value={dateOfEngagement}
                    onChange={(e) => setDateOfEngagement(e.target.value)}
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
                      value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1 col-span-1">
                    <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">CURR</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-1 py-1 text-[10px] font-bold text-slate-700 focus:outline-none"
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
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer transition h-8"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer transition h-8 flex items-center gap-1 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Request
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
