import React from 'react';
import { ArrowLeft, ArrowRight, Play, RotateCcw, X } from 'lucide-react';
import { PageView, VolunteerProfile } from '../types';

export interface DemoStageInfo {
  stage: number;
  title: string;
  summary: string;
  targetPage: PageView;
}

export const DEMO_STAGES: DemoStageInfo[] = [
  {
    stage: 1,
    title: 'Stage 1 — Meet the Volunteer',
    summary:
      'Review Alex Tan (Eunos), adjust weekend/public holiday availability and 15/30/45/60 min travel limits.',
    targetPage: 'volunteers',
  },
  {
    stage: 2,
    title: 'Stage 2 — Find My Mission',
    summary:
      'Click "Find My Mission" to see ranked Singapore shifts with match reasons, then register Alex for a shift.',
    targetPage: 'volunteers',
  },
  {
    stage: 3,
    title: 'Stage 3 — A Charity Faces a Problem',
    summary:
      'Inspect EastCare Food Pantry’s 10/10 Eunos shift, then simulate 1 volunteer cancellation (10 → 9).',
    targetPage: 'charities',
  },
  {
    stage: 4,
    title: 'Stage 4 — Rescue a Shift',
    summary:
      'Run Rescue a Shift to rank replacements, invite Alex, switch to Alex to accept, and restore 10/10 confirmed.',
    targetPage: 'charities',
  },
  {
    stage: 5,
    title: 'Stage 5 — Business Value & Corporate CSR',
    summary:
      'Review the before-and-after Rescue summary and how corporate CSR teams track employee participation.',
    targetPage: 'corporate',
  },
];

interface DemoToolbarProps {
  demoActive: boolean;
  demoStage: number;
  currentPage: PageView;
  activeVolunteerId: string;
  volunteers: VolunteerProfile[];
  onSetStage: (stage: number) => void;
  onNavigate: (page: PageView) => void;
  onSelectVolunteer: (volunteerId: string) => void;
  onResetDemo: () => void;
  onExitDemo: () => void;
}

export const DemoToolbar: React.FC<DemoToolbarProps> = ({
  demoActive,
  demoStage,
  currentPage,
  activeVolunteerId,
  volunteers,
  onSetStage,
  onNavigate,
  onSelectVolunteer,
  onResetDemo,
  onExitDemo,
}) => {
  if (!demoActive) return null;

  const currentInfo = DEMO_STAGES[demoStage - 1] ?? DEMO_STAGES[0];

  return (
    <div
      role="region"
      aria-label="Guided Demo Presentation Toolbar"
      className="bg-slate-900 text-white border-b border-slate-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Stage Progress & Guidance */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-700 text-white text-xs font-semibold whitespace-nowrap shrink-0">
            <Play className="w-3 h-3" />
            <span>Demo {demoStage}/5</span>
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
          {/* Role Switcher */}
          <div className="inline-flex items-center rounded-lg bg-slate-800 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => onNavigate('volunteers')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                currentPage === 'volunteers'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Volunteer
            </button>
            <button
              type="button"
              onClick={() => onNavigate('charities')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                currentPage === 'charities'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Charity
            </button>
            <button
              type="button"
              onClick={() => onNavigate('corporate')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                currentPage === 'corporate'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Corporate
            </button>
          </div>

          {/* Active Volunteer Quick Switch */}
          {currentPage === 'volunteers' && (
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
            disabled={demoStage >= DEMO_STAGES.length}
            onClick={() => onSetStage(demoStage + 1)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 rounded-lg cursor-pointer disabled:cursor-not-allowed"
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
            onClick={onExitDemo}
            aria-label="Exit Demo Mode"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
