import React from 'react';
import { ArrowLeft, ArrowRight, Play, RotateCcw, X } from 'lucide-react';
import { PageView, VolunteerProfile, VolunteerSubTab } from '../types';

export type DemoSequenceType = 'volunteer-journey' | 'charity-rescue';

export interface DemoStageInfo {
  stage: number;
  stepTag: string;
  title: string;
  summary: string;
  targetPage: PageView;
  targetSubTab?: VolunteerSubTab;
}

export const VOLUNTEER_JOURNEY_STAGES: DemoStageInfo[] = [
  {
    stage: 1,
    stepTag: 'Find',
    title: 'Step 1 (Find) — Meet Alex near Eunos & Find Bedok Shift',
    summary:
      'Discover Bedok South Community Food Pack & Delivery with travel compatibility and OneMap matching.',
    targetPage: 'volunteers',
    targetSubTab: 'discover',
  },
  {
    stage: 2,
    stepTag: 'Register',
    title: 'Step 2 (Register) — Register with Conflict Detection',
    summary:
      'Click Register on the Bedok Food Pack shift; overlapping commitments are checked automatically.',
    targetPage: 'volunteers',
    targetSubTab: 'discover',
  },
  {
    stage: 3,
    stepTag: 'Schedule',
    title: 'Step 3 (Schedule) — Inspect My Mission Calendar',
    summary:
      'Review the confirmed shift alongside Singapore public holidays, availability controls, and .ics export.',
    targetPage: 'volunteers',
    targetSubTab: 'calendar',
  },
  {
    stage: 4,
    stepTag: 'Route',
    title: 'Step 4 (Route) — Plan My Journey & Departure Time',
    summary:
      'View OneMap travel time, 10/15/30-min arrival buffer, Suggested Departure Time (SGT), and multi-mission feasibility.',
    targetPage: 'volunteers',
    targetSubTab: 'route-planner',
  },
  {
    stage: 5,
    stepTag: 'Remind',
    title: 'Step 5 (Remind) — WhatsApp Opt-In & Simulated Reminder',
    summary:
      'Set 24h & 1h reminder preferences inside Profile, preview the simulated WhatsApp card, and click Send Preview Reminder.',
    targetPage: 'volunteers',
    targetSubTab: 'profile',
  },
  {
    stage: 6,
    stepTag: 'Attend',
    title: 'Step 6 (Attend) — Confirm Attendance Across Portals',
    summary:
      'Confirm pre-shift attendance from the reminder and inspect EastCare Food Pantry’s updated live roster.',
    targetPage: 'charities',
  },
];

export const DEMO_STAGES: DemoStageInfo[] = [
  {
    stage: 1,
    stepTag: 'Profile',
    title: 'Stage 1 — Meet the Volunteer',
    summary:
      'Review Alex Tan (Eunos), adjust weekend/public holiday availability and 15/30/45/60 min travel limits.',
    targetPage: 'volunteers',
    targetSubTab: 'discover',
  },
  {
    stage: 2,
    stepTag: 'Match',
    title: 'Stage 2 — Find My Mission',
    summary:
      'Click "Find My Mission" to see ranked Singapore shifts with match reasons, then register Alex for a shift.',
    targetPage: 'volunteers',
    targetSubTab: 'discover',
  },
  {
    stage: 3,
    stepTag: 'Problem',
    title: 'Stage 3 — A Charity Faces a Problem',
    summary:
      'Inspect EastCare Food Pantry’s 10/10 Eunos shift, then simulate 1 volunteer cancellation (10 → 9).',
    targetPage: 'charities',
  },
  {
    stage: 4,
    stepTag: 'Rescue',
    title: 'Stage 4 — Rescue a Shift',
    summary:
      'Run Rescue a Shift to rank replacements, invite Alex, switch to Alex to accept, and restore 10/10 confirmed.',
    targetPage: 'charities',
  },
  {
    stage: 5,
    stepTag: 'Impact',
    title: 'Stage 5 — Business Value & Corporate CSR',
    summary:
      'Review the before-and-after Rescue summary and how corporate CSR teams track employee participation.',
    targetPage: 'corporate',
  },
];

interface DemoToolbarProps {
  demoActive: boolean;
  demoSequence: DemoSequenceType;
  demoStage: number;
  currentPage: PageView;
  activeVolunteerId: string;
  volunteers: VolunteerProfile[];
  onChangeSequence: (seq: DemoSequenceType) => void;
  onSetStage: (stage: number, seq?: DemoSequenceType) => void;
  onNavigate: (page: PageView) => void;
  onSelectVolunteer: (volunteerId: string) => void;
  onResetDemo: () => void;
  onExitDemo: () => void;
}

export const DemoToolbar: React.FC<DemoToolbarProps> = ({
  demoActive,
  demoSequence,
  demoStage,
  currentPage,
  activeVolunteerId,
  volunteers,
  onChangeSequence,
  onSetStage,
  onNavigate,
  onSelectVolunteer,
  onResetDemo,
  onExitDemo,
}) => {
  if (!demoActive) return null;

  const stages =
    demoSequence === 'volunteer-journey' ? VOLUNTEER_JOURNEY_STAGES : DEMO_STAGES;
  const currentInfo = stages[demoStage - 1] ?? stages[0];
  const progressPct = Math.round((demoStage / stages.length) * 100);

  return (
    <div
      role="region"
      aria-label="Guided Demo Presentation Toolbar"
      className="bg-slate-900 text-white border-b border-slate-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Stage Progress & Guidance */}
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-700 text-white text-xs font-mono-tabular font-semibold whitespace-nowrap shrink-0">
              <Play className="w-3 h-3" />
              <span>
                Step {demoStage}/{stages.length}
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {currentInfo.title}
              </p>
              <p className="text-xs text-slate-300 truncate">{currentInfo.summary}</p>
            </div>
          </div>

          {/* Presentation Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Sequence Switcher */}
            <div className="inline-flex items-center rounded-lg bg-slate-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onChangeSequence('volunteer-journey')}
                className={`px-2.5 py-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer ${
                  demoSequence === 'volunteer-journey'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                6-Step Journey
              </button>
              <button
                type="button"
                onClick={() => onChangeSequence('charity-rescue')}
                className={`px-2.5 py-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer ${
                  demoSequence === 'charity-rescue'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                5-Stage Rescue Pitch
              </button>
            </div>

            {/* Active Volunteer Quick Switch */}
            {(currentPage === 'volunteers' || currentPage === 'calendar') && (
              <select
                value={activeVolunteerId}
                onChange={(e) => onSelectVolunteer(e.target.value)}
                aria-label="Switch active volunteer profile"
                className="px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {volunteers.slice(0, 6).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.startingLocation.label.split(' ')[0]})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              disabled={demoStage <= 1}
              onClick={() => onSetStage(demoStage - 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous Step</span>
            </button>
            <button
              type="button"
              disabled={demoStage >= stages.length}
              onClick={() => onSetStage(demoStage + 1)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-40 rounded-lg cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onResetDemo}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('demo')}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
            >
              Guide
            </button>

            <button
              type="button"
              onClick={onExitDemo}
              aria-label="Exit Demo Mode"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visual Step Breadcrumb & Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
            {stages.map((s) => (
              <button
                key={s.stage}
                type="button"
                onClick={() => onSetStage(s.stage)}
                className={`cursor-pointer ${
                  s.stage === demoStage
                    ? 'text-amber-400 font-bold'
                    : s.stage < demoStage
                    ? 'text-teal-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.stage}. {s.stepTag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

