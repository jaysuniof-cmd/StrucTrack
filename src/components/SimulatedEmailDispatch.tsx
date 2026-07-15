import React, { useState } from 'react';
import { Mail, Clock, ShieldAlert, Trash2, CheckCircle, AlertTriangle, Send, LogOut, CheckCircle2 } from 'lucide-react';

export interface SimulatedEmail {
  id: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  timestamp: string;
  actionType: 'created' | 'updated' | 'revision' | 'hours';
  deliveryStatus?: 'Simulated' | 'SentViaGmail' | 'Error';
  deliveryError?: string;
}

interface SimulatedEmailDispatchProps {
  emails: SimulatedEmail[];
  onClear: () => void;
  googleUser?: any;
  googleToken?: string | null;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
  onResendEmail?: (email: SimulatedEmail) => Promise<void>;
}

export default function SimulatedEmailDispatch({
  emails,
  onClear,
  googleUser,
  googleToken,
  onGoogleSignIn,
  onGoogleSignOut,
  onResendEmail
}: SimulatedEmailDispatchProps) {
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleResend = async (email: SimulatedEmail) => {
    if (!onResendEmail) return;
    setResendingId(email.id);
    setResendStatus(null);
    try {
      await onResendEmail(email);
      setResendStatus('Success');
    } catch (err: any) {
      setResendStatus(err.message || 'Error occurred');
    } finally {
      setTimeout(() => {
        setResendingId(null);
        setResendStatus(null);
      }, 3000);
    }
  };

  return (
    <div id="email-dispatch-container" className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden flex flex-col h-full">
      
      {/* Header bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
            <Mail className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Notification Dispatch Center
            </h4>
            <p className="text-[9px] text-slate-400">Triggered in real-time when submittals are created, edited, updated or logged.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {emails.length > 0 && (
            <button
              onClick={onClear}
              className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border border-rose-200 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {/* Google Authentication Control Bar */}
      <div className="bg-slate-900 text-slate-100 px-4 py-2.5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${googleToken ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider">
              {googleToken ? 'Gmail Live Connected' : 'Gmail Sandbox Offline'}
            </p>
            <p className="text-[9px] text-slate-400">
              {googleToken
                ? `Authorized as ${googleUser?.email || 'authenticated user'}`
                : 'Connect your real Gmail account to dispatch actual emails.'}
            </p>
          </div>
        </div>

        {googleToken ? (
          <button
            onClick={onGoogleSignOut}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded border border-slate-700 cursor-pointer transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Disconnect
          </button>
        ) : (
          onGoogleSignIn && (
            <button
              onClick={onGoogleSignIn}
              className="gsi-material-button flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded px-3 py-1 cursor-pointer transition-all h-7"
              id="btn-connect-gmail"
            >
              <div className="w-3.5 h-3.5 shrink-0">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">Sign in with Google</span>
            </button>
          )
        )}
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[220px] max-h-[350px]">
        {emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-1">
            <Mail className="w-8 h-8 text-slate-300" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Notification Dispatch Idle</p>
            <p className="text-[10px] text-slate-400 max-w-[280px]">No emails have been dispatched. Create a submittal ticket, modify a task, or log hours to see logs.</p>
          </div>
        ) : (
          [...emails].reverse().map(email => {
            let typeBadge = "bg-blue-100 text-blue-800 border-blue-200";
            if (email.actionType === 'updated') typeBadge = "bg-amber-100 text-amber-800 border-amber-200";
            if (email.actionType === 'revision') typeBadge = "bg-rose-100 text-rose-800 border-rose-200";
            if (email.actionType === 'hours') typeBadge = "bg-purple-100 text-purple-800 border-purple-200";

            return (
              <div
                key={email.id}
                className="border border-slate-200 rounded overflow-hidden text-[11px] shadow-2xs font-mono bg-slate-50/20"
              >
                {/* Simulated Email Envelope Header */}
                <div className="bg-slate-100/80 p-2 border-b border-slate-200 space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold">
                      FROM: {googleToken ? `${googleUser?.displayName || 'StructTrack PM'} <${googleUser?.email}>` : 'StructTrack Notification Engine <noreply@structtrack.io>'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] px-1 py-0.1 font-bold uppercase rounded border ${typeBadge}`}>
                        {email.actionType}
                      </span>
                    </div>
                  </div>
                  <div className="text-slate-700">
                    <span className="font-bold text-slate-400">TO: </span>
                    <span className="font-bold text-blue-600">{email.recipientName}</span> &lt;{email.recipientEmail}&gt;
                  </div>
                  <div className="text-slate-800 font-bold">
                    <span className="text-slate-400 font-normal">SUBJECT: </span>
                    {email.subject}
                  </div>
                  
                  {/* Real Delivery Status Badge */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 pt-1.5 mt-1 border-t border-slate-200/60 font-sans">
                    <div className="text-[8px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Dispatched {email.timestamp}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {email.deliveryStatus === 'SentViaGmail' ? (
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded uppercase">
                          <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
                          Sent via Gmail
                        </span>
                      ) : email.deliveryStatus === 'Error' ? (
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1 py-0.2 rounded uppercase" title={email.deliveryError}>
                          <ShieldAlert className="w-2.5 h-2.5 text-rose-500" />
                          Gmail Delivery Fail
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1 py-0.2 rounded uppercase">
                          Simulated Only
                        </span>
                      )}

                      {/* Manual Send/Resend button via Gmail */}
                      {googleToken && onResendEmail && (
                        <button
                          disabled={resendingId !== null}
                          onClick={() => handleResend(email)}
                          className="px-1.5 py-0.2 text-[8px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300 rounded font-bold uppercase cursor-pointer flex items-center gap-0.5 transition-colors disabled:opacity-50"
                        >
                          <Send className="w-2 h-2" />
                          {resendingId === email.id ? (resendStatus || 'Sending...') : (email.deliveryStatus === 'SentViaGmail' ? 'Resend' : 'Send via Gmail')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <div className="p-3 bg-white text-slate-700 whitespace-pre-wrap text-[10px] font-mono leading-relaxed border-t border-slate-150">
                  {email.body}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

