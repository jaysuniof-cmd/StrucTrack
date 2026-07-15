import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  UserPlus, 
  Building, 
  AlertCircle, 
  LogOut, 
  RefreshCw, 
  CheckCircle,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { registerWithEmail, loginWithEmail, logoutUser, AppUser } from '../utils/firebase';

interface UserAuthProps {
  onAuthSuccess?: (user: AppUser) => void;
  currentUser: AppUser | null;
  onLogout: () => void;
}

export default function UserAuth({ onAuthSuccess, currentUser, onLogout }: UserAuthProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Drafter');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your full name.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        
        const appUser = await registerWithEmail(name.trim(), email.trim(), role, password);
        setSuccessMsg('Account registered successfully!');
        onAuthSuccess(appUser);
      } else {
        const appUser = await loginWithEmail(email.trim(), password);
        if (appUser) {
          onAuthSuccess(appUser);
        } else {
          throw new Error('User profile data not found.');
        }
      }
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message || 'Authentication failed.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already in use by another account.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        friendlyMessage = 'Invalid email or password.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // If user is logged in but not approved or rejected
  if (currentUser) {
    if (currentUser.status === 'Pending') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-8 max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-amber-50 text-amber-500 rounded-full animate-pulse border border-amber-200">
                <Loader2 className="w-12 h-12 animate-spin text-amber-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800">Approval Pending</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Hello, <span className="font-semibold text-slate-700">{currentUser.name}</span>.<br />
                Your application for the <span className="font-semibold text-slate-700">{currentUser.role}</span> role is currently awaiting approval from an administrator.
              </p>
            </div>

            <div className="bg-amber-50/50 rounded-lg p-3.5 border border-amber-100 text-left text-xs text-amber-800 space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-amber-600 block">Required Steps:</span>
              <p>1. Contact <span className="font-mono bg-amber-100/60 px-1 rounded">admin@gmail.com</span> to request approval.</p>
              <p>2. Once approved, this screen will refresh automatically.</p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-lg border border-slate-200 hover:border-slate-300 font-medium text-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Status
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 hover:border-rose-300 font-medium text-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (currentUser.status === 'Rejected') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-8 max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-rose-50 text-rose-500 rounded-full border border-rose-200">
                <ShieldAlert className="w-12 h-12 text-rose-600 animate-bounce" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800">Registration Rejected</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Hello, <span className="font-semibold text-slate-700">{currentUser.name}</span>.<br />
                Your account registration request has been rejected by an administrator.
              </p>
            </div>

            <div className="bg-rose-50/50 rounded-lg p-3.5 border border-rose-100 text-left text-xs text-rose-800">
              Please contact the systems administrator at <span className="font-mono bg-rose-100/60 px-1 rounded">admin@gmail.com</span> if you believe this is a misunderstanding.
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={onLogout}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 hover:border-slate-300 font-medium text-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out / Exit
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 overflow-hidden font-sans">
      
      {/* Decorative branding side panel (Desktop) */}
      <div className="md:w-1/2 bg-slate-950 p-12 flex flex-col justify-between text-slate-100 relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
        <div className="absolute inset-0 bg-radial-gradient from-slate-900 to-slate-950 opacity-50 pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="p-2 bg-emerald-800 text-white rounded">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold tracking-tight text-xl text-white">StructTrack Pro</h1>
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Structural Submittal & Hours Tracker</p>
          </div>
        </div>

        <div className="relative z-10 my-12 space-y-4 max-w-lg hidden md:block">
          <span className="text-xs uppercase font-bold text-emerald-500 tracking-widest font-mono">Professional Workspace</span>
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Streamlined Submittals & Accurate Production Engineering Logs.
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            A comprehensive workspace engineered specifically for structural consulting offices to maintain revision control, submit to third-party peer reviewers or government councils, and log drafting production hours.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-500 flex justify-between items-center hidden md:flex">
          <span>Enterprise Secure v2.1</span>
          <span>© 2026 StructTrack Inc</span>
        </div>
      </div>

      {/* Main Auth Form Container */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-900 md:bg-slate-900">
        <div className="bg-slate-950 border border-slate-800/80 shadow-2xl rounded-2xl p-8 max-w-md w-full space-y-6">
          <div className="space-y-1 text-center md:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-100">
              {isRegister ? 'Create Workspace Account' : 'Workspace Sign In'}
            </h2>
            <p className="text-xs text-slate-400">
              {isRegister ? 'Join your team on the structural workflow tracker.' : 'Sign in to access your projects and log sheets.'}
            </p>
          </div>

          {/* Form Actions Toggle */}
          <div className="bg-slate-900 p-1 rounded-lg flex border border-slate-800">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${!isRegister ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${isRegister ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* Name field (Register only) */}
            {isRegister && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-600 transition"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Workspace Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Role selection (Register only) */}
            {isRegister && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Team Role</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-600 transition appearance-none cursor-pointer"
                  >
                    <option value="Drafter">Drafter / Detailer</option>
                    <option value="Supervisor">Supervisor / Manager</option>
                    <option value="Requester">Requester / Client</option>
                  </select>
                </div>
              </div>
            )}

            {/* Feedback messages */}
            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg flex gap-2 text-rose-400 text-xs items-start">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-lg flex gap-2 text-emerald-400 text-xs items-start">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{successMsg}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-2 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2.5 shadow-lg shadow-emerald-950/50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              ) : (
                'Sign In to Workspace'
              )}
            </button>
          </form>

          {/* Test Admin credentials hint */}
          <div className="bg-emerald-950/30 border border-emerald-900/40 p-3.5 rounded-lg text-left text-[11px] text-emerald-400 space-y-1 leading-relaxed">
            <span className="font-bold uppercase tracking-wider text-[9px] text-emerald-300 block">⭐ System Testing Credentials:</span>
            <p>
              Use <span className="font-mono bg-emerald-900/40 px-1.5 py-0.5 rounded text-white font-bold">admin@gmail.com</span> with password <span className="font-mono bg-emerald-900/40 px-1.5 py-0.5 rounded text-white font-bold">12345678</span> to automatically receive **Admin** overall access, approve users, allocate projects, and customize trackers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
