import React from 'react';
import { Calendar, CheckCircle2, MessageSquare, Navigation, X } from 'lucide-react';
import { WhatsAppReminderPayload } from '../utils/notifications';

interface WhatsAppReminderModalProps {
  payload: WhatsAppReminderPayload | null;
  isAttendanceConfirmed: boolean;
  onClose: () => void;
  onViewMission: (opportunityId: string) => void;
  onPlanJourney: (opportunityId: string) => void;
  onConfirmAttendance: (opportunityId: string) => void;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  payload,
  isAttendanceConfirmed,
  onClose,
  onViewMission,
  onPlanJourney,
  onConfirmAttendance,
}) => {
  if (!payload) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-sim-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-xl">
        {/* Explicit Simulation Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <MessageSquare className="w-4 h-4 text-teal-400 shrink-0" />
            <div className="min-w-0">
              <p id="wa-sim-title" className="text-xs font-bold truncate">
                Simulated WhatsApp Shift Reminder · Preview Only
              </p>
              <p className="text-[11px] text-slate-300 truncate">
                No external WhatsApp message was sent · {payload.sentAtSg} SGT
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close simulated reminder"
            className="p-1 text-slate-300 hover:text-white rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Frame Simulation */}
        <div className="bg-[#EFEAE2] p-5 space-y-4">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span className="font-semibold text-slate-800">
              MissionPossible Volunteer Alerts (Simulated)
            </span>
            <span className="font-mono-tabular">Simulated · {payload.offsetLabel}</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2 text-xs text-slate-800">
            {payload.messageLines.map((line, i) => (
              <p key={i} className={i === 0 ? 'font-semibold text-slate-900' : 'leading-relaxed'}>
                {line}
              </p>
            ))}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>{payload.recipientLabel}</span>
              <span className="font-mono-tabular">SGT (UTC+8)</span>
            </div>
          </div>

          {/* Interactive In-App Action Buttons */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-700">
              Interactive Quick Actions (updates live MissionPossible dashboards):
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onViewMission(payload.opportunity.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                <span>View My Mission</span>
              </button>

              <button
                type="button"
                onClick={() => onPlanJourney(payload.opportunity.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-teal-700" />
                <span>Plan My Journey</span>
              </button>

              <button
                type="button"
                onClick={() => onConfirmAttendance(payload.opportunity.id)}
                disabled={isAttendanceConfirmed}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                  isAttendanceConfirmed
                    ? 'bg-teal-100 text-teal-900 cursor-default'
                    : 'bg-teal-700 text-white hover:bg-teal-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isAttendanceConfirmed ? 'Attendance Confirmed' : 'Confirm Attendance'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
