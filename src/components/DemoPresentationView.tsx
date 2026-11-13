import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Layers,
  Play,
  Presentation,
  RotateCcw,
} from 'lucide-react';
import { PageView } from '../types';
import { DEMO_STAGES } from './DemoToolbar';
import { MissionPossibleLogo } from './MissionPossibleLogo';

interface DemoPresentationViewProps {
  totalVolunteers: number;
  totalCharities: number;
  totalOpportunities: number;
  totalBookings: number;
  totalCorporates: number;
  onemapConfigured: boolean;
  holidaysSource: 'live' | 'demo';
  holidaysRateLimited?: boolean;
  weatherSource: 'live' | 'unavailable';
  weatherRateLimited?: boolean;
  dataGovAuthMode?: 'keyless-public' | 'optional-key-configured';
  onStartGuidedDemo: (stage?: number) => void;
  onNavigate: (page: PageView) => void;
  onResetDemo: () => void;
}

const SLIDE_TITLES = [
  '01. MissionPossible Identity',
  '02. The Coordination Gap',
  '03. Matching Engine & Rescue a Shift',
  '04. Stakeholder Value',
  '05. Business Model Canvas',
  '06. Revenue & Rollout',
];

export const DemoPresentationView: React.FC<DemoPresentationViewProps> = ({
  totalVolunteers,
  totalCharities,
  totalOpportunities,
  totalBookings,
  totalCorporates,
  onemapConfigured,
  holidaysSource,
  holidaysRateLimited = false,
  weatherSource,
  weatherRateLimited = false,
  dataGovAuthMode = 'keyless-public',
  onStartGuidedDemo,
  onNavigate,
  onResetDemo,
}) => {
  const [activeTab, setActiveTab] = useState<'demo' | 'pitch'>('demo');
  const [slideIndex, setSlideIndex] = useState(0);
  const [showOriginalBmc, setShowOriginalBmc] = useState(false);

  useEffect(() => {
    if (activeTab !== 'pitch') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setSlideIndex((prev) => Math.min(SLIDE_TITLES.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setSlideIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Demo & Pitch Control Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-xs font-semibold text-teal-700">
            3–5 Minute Live Startup Pitch &amp; Guided Walkthrough
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
            Demo Mode &amp; Pitch Deck
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Launch the 5-stage live pitch walkthrough across Alex (Eunos), EastCare Food Pantry,
            and Corporate CSR—or present the Miro Business Model Canvas slides.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('demo')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'demo'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-teal-700" />
              <span>5-Stage Demo Guide</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pitch')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'pitch'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Presentation className="w-3.5 h-3.5 text-teal-700" />
              <span>Pitch Deck &amp; BMC</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onResetDemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {activeTab === 'demo' ? (
        <div className="space-y-6">
          {/* Demo Dataset Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-500">Volunteers</p>
              <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">
                {totalVolunteers}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-500">Charities</p>
              <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">
                {totalCharities}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-500">SG Shifts</p>
              <p className="font-mono-tabular text-2xl font-bold text-teal-700 mt-1">
                {totalOpportunities}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-500">Bookings</p>
              <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">
                {totalBookings}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-500">Corporates</p>
              <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">
                {totalCorporates}
              </p>
            </div>
          </div>

          {/* 5-Stage Guided Pitch Launcher */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  5-Stage Guided Pitch Script
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click Launch Demo from Stage 1 or jump directly into any stage with the
                  persistent presentation toolbar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onStartGuidedDemo(1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Launch Stage 1 Demo</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {DEMO_STAGES.map((s) => (
                <div
                  key={s.stage}
                  className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{s.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{s.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartGuidedDemo(s.stage)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-[#FAFAF9] border border-slate-300 hover:bg-slate-100 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Jump to Stage {s.stage}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Singapore API Transparency Matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="font-display text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              Singapore API Integration Transparency
            </h2>
            <div className="mt-3 divide-y divide-slate-100 text-xs sm:text-sm">
              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">OneMap Search, Routing &amp; Map Tiles</p>
                  <p className="text-xs text-slate-500">
                    Tiles load from onemap.gov.sg; live Search &amp; Routing require server-side
                    ONEMAP_EMAIL / ONEMAP_PASSWORD. Without credentials, routing shows
                    &ldquo;Travel time unavailable&rdquo; alongside exact distance.
                  </p>
                </div>
                <span className="font-mono-tabular text-xs font-semibold text-amber-700 shrink-0">
                  {onemapConfigured ? 'Live API Active' : 'Needs Server Credentials'}
                </span>
              </div>
              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">data.gov.sg Public Holidays (MOM)</p>
                  <p className="text-xs text-slate-500">
                    CKAN Datastore dataset d_8ef23381f9417e4d4254ee8b4dcdb176 · Keyless public access
                    (no API key required).
                  </p>
                </div>
                <span
                  className={`font-mono-tabular text-xs font-semibold shrink-0 ${
                    holidaysSource === 'live' ? 'text-teal-700' : 'text-amber-700'
                  }`}
                >
                  {holidaysSource === 'live'
                    ? dataGovAuthMode === 'optional-key-configured'
                      ? 'Live Open API (Server Key)'
                      : 'Live Open API (Keyless)'
                    : holidaysRateLimited
                    ? 'Rate Limited (Fallback Active)'
                    : 'Unavailable (Fallback Active)'}
                </span>
              </div>
              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">data.gov.sg 4-Day &amp; 24-Hr Weather (NEA)</p>
                  <p className="text-xs text-slate-500">
                    api-open.data.gov.sg keyless public outlook; dates beyond range show
                    &ldquo;Forecast not yet available&rdquo;.
                  </p>
                </div>
                <span
                  className={`font-mono-tabular text-xs font-semibold shrink-0 ${
                    weatherSource === 'live' ? 'text-teal-700' : 'text-amber-700'
                  }`}
                >
                  {weatherSource === 'live'
                    ? dataGovAuthMode === 'optional-key-configured'
                      ? 'Live Open API (Server Key)'
                      : 'Live Open API (Keyless)'
                    : weatherRateLimited
                    ? 'Rate Limited'
                    : 'Unavailable'}
                </span>
              </div>
              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">Charity Verification &amp; Calendar Export</p>
                  <p className="text-xs text-slate-500">
                    Links to charities.gov.sg (no auto-verification) · ICS file download active
                    (Google Calendar OAuth disabled).
                  </p>
                </div>
                <span className="font-mono-tabular text-xs font-semibold text-slate-700 shrink-0">
                  Manual Registry + .ics Active
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Presentation Slide Viewer */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {SLIDE_TITLES.map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => setSlideIndex(idx)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  slideIndex === idx
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 min-h-[460px] flex flex-col justify-between">
            {slideIndex === 0 && (
              <div className="my-auto max-w-3xl">
                <MissionPossibleLogo size={42} showWordmark />
                <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mt-6 leading-tight text-balance">
                  The right volunteer. The right cause. The right time.
                </h2>
                <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                  Making volunteering accessible to everyone while helping charities fill
                  volunteering shifts more efficiently across Singapore.
                </p>
              </div>
            )}

            {slideIndex === 1 && (
              <div className="my-auto space-y-6">
                <div>
                  <p className="font-mono-tabular text-xs font-semibold text-teal-700">
                    Slide 02 · Problem Statement
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                    Listing opportunities is not enough—shifts still go unfilled
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-5">
                    <p className="font-semibold text-slate-900">Volunteers</p>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Spend too much effort searching for short shifts that actually fit their
                      schedule and commute time.
                    </p>
                  </div>
                  <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-5">
                    <p className="font-semibold text-slate-900">Charities</p>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Lose coordinator time when volunteers cancel last minute, struggling to find
                      skilled, available replacements.
                    </p>
                  </div>
                  <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-5">
                    <p className="font-semibold text-slate-900">Companies</p>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Find it difficult to coordinate employee volunteering and compile verified CSR
                      participation reports.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {slideIndex === 2 && (
              <div className="my-auto space-y-6">
                <div>
                  <p className="font-mono-tabular text-xs font-semibold text-teal-700">
                    Slide 03 · Competitive Advantage
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                    Matching real availability + Rescue a Shift replacement engine
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3 text-sm text-slate-600">
                    <p>
                      <strong className="text-slate-900">1. Find My Mission:</strong> Matches
                      weekly &amp; public holiday availability, OneMap travel limits (15/30/45/60
                      min), skills, and cause interests.
                    </p>
                    <p>
                      <strong className="text-slate-900">2. Rescue a Shift:</strong> Screens
                      eligible replacements, excludes conflicting commitments, enforces mandatory
                      skills, and sends 1-click invitations.
                    </p>
                  </div>
                  <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                    <p className="text-xs font-semibold text-slate-500">Live Pitch Walkthrough</p>
                    <p className="text-sm text-slate-700 mt-2">
                      Demonstrate EastCare Food Pantry recovering from 9/10 back to 10/10 confirmed
                      volunteers with Alex from Eunos.
                    </p>
                    <button
                      type="button"
                      onClick={() => onStartGuidedDemo(1)}
                      className="mt-4 text-xs font-semibold text-teal-700 hover:text-teal-800 text-left cursor-pointer"
                    >
                      Launch 5-Stage Guided Demo &rarr;
                    </button>
                  </div>
                </div>
              </div>
            )}

            {slideIndex === 3 && (
              <div className="my-auto space-y-6">
                <div>
                  <p className="font-mono-tabular text-xs font-semibold text-teal-700">
                    Slide 04 · Value Propositions
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                    Shared infrastructure turning goodwill into organised social impact
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-semibold text-teal-700">Volunteers</p>
                    <p className="font-display text-base font-bold text-slate-900 mt-1">
                      Opportunities that fit real availability
                    </p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Close to home or work, minimal registration friction, and flexible durations.
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-semibold text-teal-700">Charities</p>
                    <p className="font-display text-base font-bold text-slate-900 mt-1">
                      Fewer unfilled shifts &amp; less admin
                    </p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Reliable shift coverage, fast cancellation replacement, and attendance logs.
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-semibold text-amber-700">Companies</p>
                    <p className="font-display text-base font-bold text-slate-900 mt-1">
                      Simpler employee volunteering &amp; reporting
                    </p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Organised CSR activities, participation tracking, and exportable impact data.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {slideIndex === 4 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono-tabular text-xs font-semibold text-teal-700">
                      Slide 05 · Miro Business Model Canvas
                    </p>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                      MissionPossible Business Model Canvas
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOriginalBmc((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-[#FAFAF9] border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    {showOriginalBmc ? (
                      <>
                        <Layers className="w-3.5 h-3.5" />
                        <span>Structured Canvas View</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>View Team Miro Canvas</span>
                      </>
                    )}
                  </button>
                </div>

                {showOriginalBmc ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-[#FAFAF9] p-2">
                    <img
                      src="/assets/aistudio/New_team_13_Nov_ab1b6caa.jpg"
                      alt="MissionPossible team Business Model Canvas board"
                      referrerPolicy="no-referrer"
                      className="w-full max-h-[420px] object-contain mx-auto rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                    <div className="border border-slate-200 rounded-xl p-3 bg-[#FAFAF9]">
                      <p className="font-bold text-slate-900 mb-1.5">Key Partners</p>
                      <p className="text-slate-600 leading-relaxed">
                        Charities, NGOs, Corporate CSR &amp; HR, Volunteer centres, Community &amp;
                        religious groups, Trusts &amp; foundations.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="border border-slate-200 rounded-xl p-3 bg-[#FAFAF9]">
                        <p className="font-bold text-slate-900 mb-1">Key Activities</p>
                        <p className="text-slate-600 leading-relaxed">
                          Onboard partners, match availability to volunteer shifts, manage
                          confirmations &amp; cancellations, track attendance, generate CSR report.
                        </p>
                      </div>
                      <div className="border border-slate-200 rounded-xl p-3 bg-[#FAFAF9]">
                        <p className="font-bold text-slate-900 mb-1">Key Resources</p>
                        <p className="text-slate-600 leading-relaxed">
                          Volunteer &amp; opportunity database, Matching engine, Charity
                          relationship, Data security &amp; compliance, Singpass validation.
                        </p>
                      </div>
                    </div>
                    <div className="border border-teal-600 rounded-xl p-3 bg-teal-50/50">
                      <p className="font-bold text-teal-900 mb-1.5">Value Propositions</p>
                      <p className="text-slate-700 leading-relaxed">
                        Shared digital infrastructure connecting people, charities &amp; businesses:
                        fit real availability, fewer unfilled shifts, simpler CSR reporting.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="border border-slate-200 rounded-xl p-3 bg-[#FAFAF9]">
                        <p className="font-bold text-slate-900 mb-1">Customer Relationships</p>
                        <p className="text-slate-600 leading-relaxed">
                          Self-service for volunteers, Guided onboarding for charities, Dedicated
                          support for corporate clients.
                        </p>
                      </div>
                      <div className="border border-slate-200 rounded-xl p-3 bg-[#FAFAF9]">
                        <p className="font-bold text-slate-900 mb-1">Channels</p>
                        <p className="text-slate-600 leading-relaxed">
                          Corporate HR &amp; CSR partnerships, Charity &amp; volunteer-centre
                          referrals, Employee &amp; community invitations.
                        </p>
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-3 bg-[#FAFAF9]">
                      <p className="font-bold text-slate-900 mb-1.5">Customer Segments</p>
                      <p className="text-slate-600 leading-relaxed">
                        <strong>Paying:</strong> Companies with CSR programmes; large charities &amp;
                        volunteer centres.
                        <br />
                        <strong>Users:</strong> Individual volunteers &amp; charities.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {slideIndex === 5 && (
              <div className="my-auto space-y-6">
                <div>
                  <p className="font-mono-tabular text-xs font-semibold text-teal-700">
                    Slide 06 · Revenue Streams
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                    Three revenue streams funding free volunteer access
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="border border-slate-200 rounded-xl p-5">
                    <p className="font-mono-tabular text-xs font-bold text-teal-700">01.</p>
                    <p className="font-display text-base font-bold text-slate-900 mt-1">
                      Corporate Annual Subscriptions
                    </p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Annual membership fees for companies to manage CSR initiatives, organise
                      employee volunteering, and track social impact.
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-5">
                    <p className="font-mono-tabular text-xs font-bold text-teal-700">02.</p>
                    <p className="font-display text-base font-bold text-slate-900 mt-1">
                      Optional Charity Management Subscriptions
                    </p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Affordable optional plans for charities requiring scheduling, event
                      coordination, donation management, and activity tracking.
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-5">
                    <p className="font-mono-tabular text-xs font-bold text-amber-700">03.</p>
                    <p className="font-display text-base font-bold text-slate-900 mt-1">
                      Enterprise Onboarding &amp; Reporting
                    </p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Customised corporate onboarding, CSR programme setup, consolidated impact
                      reports, and participation analytics.
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('pricing')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                  >
                    View full pricing breakdown &rarr;
                  </button>
                </div>
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <span className="font-mono-tabular text-xs text-slate-500">
                Slide {slideIndex + 1} of {SLIDE_TITLES.length} · Use arrow keys to navigate
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={slideIndex === 0}
                  onClick={() => setSlideIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={slideIndex === SLIDE_TITLES.length - 1}
                  onClick={() =>
                    setSlideIndex((prev) => Math.min(SLIDE_TITLES.length - 1, prev + 1))
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
