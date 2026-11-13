import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, MapPin, Play, ShieldCheck } from 'lucide-react';
import { AvailabilitySlot, Opportunity, PageView } from '../types';
import { SLOT_LABELS } from '../utils/matching';
import { MissionPossibleLogo } from './MissionPossibleLogo';

interface HomeViewProps {
  opportunities: Opportunity[];
  onNavigate: (page: PageView) => void;
  onLaunchDemo: () => void;
  onNotify: (title: string, description?: string) => void;
}

const PREVIEW_SLOTS: AvailabilitySlot[] = [
  'saturday-morning',
  'sunday-afternoon',
  'public-holiday',
];

export const HomeView: React.FC<HomeViewProps> = ({
  opportunities,
  onNavigate,
  onLaunchDemo,
  onNotify,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot>('saturday-morning');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [orgType, setOrgType] = useState<'Charity / NGO' | 'Corporate CSR' | 'Volunteer Centre'>(
    'Corporate CSR'
  );
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submittedOrg, setSubmittedOrg] = useState<string | null>(null);

  const previewMatches = useMemo(
    () => opportunities.filter((opp) => opp.slot === selectedSlot).slice(0, 3),
    [opportunities, selectedSlot]
  );

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!orgName.trim()) {
      setFormError('Please enter your organisation name.');
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setFormError('Please enter a valid work email address.');
      return;
    }

    setSubmittedOrg(orgName.trim());
    onNotify(
      'Onboarding request received',
      `Our partnerships team will contact ${orgName.trim()} within 1 business day.`
    );
    setOrgName('');
    setEmail('');
    setNotes('');
  };

  return (
    <div className="bg-[#FAFAF9]">
      {/* 1. Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-14 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Focal Narrative */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-sm font-medium text-teal-700 tracking-tight mb-4">
              Singapore Volunteering Infrastructure · OneMap, data.gov.sg &amp; Charity Portal Ready
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-slate-900 leading-[1.08] text-balance">
              The right volunteer. The right cause. The right time.
            </h1>
            <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              MissionPossible makes volunteering accessible to everyone while helping charities fill
              volunteering shifts more efficiently—matching real availability and Singapore travel
              convenience to real staffing needs.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onLaunchDemo}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                <Play className="w-4 h-4" />
                <span>Launch Demo</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('volunteers')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                <span>Find My Mission</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                Singpass-ready trust model
              </span>
              <span aria-hidden="true">·</span>
              <span>Rescue a Shift replacement workflow</span>
              <span aria-hidden="true">·</span>
              <span>Singapore public holiday &amp; weather context</span>
            </div>
          </div>

          {/* Right Column: Live Matching Mechanism Preview */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="h-full bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Availability-First Shift Preview
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select a weekly or public holiday window to preview matching shifts
                    </p>
                  </div>
                  <span className="font-mono-tabular text-xs font-semibold text-teal-700">
                    {previewMatches.length} shifts
                  </span>
                </div>

                {/* Segmented Time Selector */}
                <div
                  className="mt-4 grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg"
                  role="tablist"
                  aria-label="Preview availability slot"
                >
                  {PREVIEW_SLOTS.map((slot) => {
                    const active = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-2 py-2 text-xs font-medium rounded-md transition-colors truncate cursor-pointer ${
                          active
                            ? 'bg-white text-slate-900 shadow-sm font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {SLOT_LABELS[slot]
                          .replace(' Mornings', ' AM')
                          .replace(' Afternoons', ' PM')
                          .replace('Public Holidays', 'Public Hol.')}
                      </button>
                    );
                  })}
                </div>

                {/* Matched Opportunities List */}
                <div className="mt-4 divide-y divide-slate-100">
                  {previewMatches.map((opp) => {
                    const spotsLeft = Math.max(0, opp.spotsTotal - opp.spotsFilled);
                    return (
                      <div key={opp.id} className="py-3.5 first:pt-2 last:pb-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {opp.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {opp.charityName} <span aria-hidden="true">·</span> {opp.cause}
                            </p>
                          </div>
                          <span className="font-mono-tabular text-xs font-semibold text-teal-700 shrink-0">
                            {spotsLeft > 0 ? `${spotsLeft} open` : 'Full (10/10)'}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {opp.dateLabel} · {opp.timeLabel}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            S{opp.postalCode}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500">
                  15 volunteers · 6 charities · 12 SG shifts
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('volunteers')}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Open Find My Mission</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 4-Column Ecosystem Strip */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 bg-white border border-slate-200 rounded-2xl p-6">
          <div>
            <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-slate-900">15</p>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Active volunteer profiles across Eunos, Bedok, Toa Payoh &amp; Jurong East
            </p>
          </div>
          <div className="lg:border-l lg:border-slate-200 lg:pl-6">
            <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-slate-900">6</p>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Community charity partners with Charity Portal UEN verification links
            </p>
          </div>
          <div className="lg:border-l lg:border-slate-200 lg:pl-6">
            <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-teal-700">12</p>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Singapore volunteer shifts spanning 6 cause areas &amp; public holidays
            </p>
          </div>
          <div className="lg:border-l lg:border-slate-200 lg:pl-6">
            <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-slate-900">3</p>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Corporate CSR partner programmes tracking employee volunteering hours
            </p>
          </div>
        </div>
      </section>

      {/* 3. Core Stakeholder Value Propositions */}
      <section className="border-t border-slate-200 bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              Matching real availability to real staffing needs—reducing unfilled shifts
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              Our competitive advantage is not simply listing opportunities. MissionPossible links
              volunteer schedules, Singapore travel convenience, charity Rescue a Shift workflows,
              and corporate CSR reporting.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-[#FAFAF9] border border-slate-200 rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <p className="font-mono-tabular text-xs font-semibold text-teal-700">
                  01. For Individual Volunteers
                </p>
                <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                  Opportunities that fit real availability &amp; travel limits
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Discover meaningful opportunities close to home or work, filter by 15/30/45/60-minute
                  travel limits, participate even with a few hours to spare, and match public
                  holidays automatically.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500">Free forever · Self-service booking</span>
                <button
                  type="button"
                  onClick={() => onNavigate('volunteers')}
                  className="text-sm font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <span>Open Volunteer Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-3 bg-[#FAFAF9] border border-slate-200 rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <p className="font-mono-tabular text-xs font-semibold text-teal-700">
                  02. For Charities &amp; NGOs
                </p>
                <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                  Rescue a Shift when volunteers cancel
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Fill volunteer shifts more reliably, identify conflict-free skilled replacements in
                  seconds, and cut time spent manually chasing confirmations.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => onNavigate('charities')}
                  className="text-sm font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <span>Open Charity Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-3 bg-[#FAFAF9] border border-slate-200 rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <p className="font-mono-tabular text-xs font-semibold text-amber-700">
                  03. For Corporate CSR
                </p>
                <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                  Simplify employee CSR coordination
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Organise team activities across departments, distinguish completed hours from
                  planned events, and export social impact summaries.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => onNavigate('corporate')}
                  className="text-sm font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <span>Open Corporate CSR</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Workflow Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              See MissionPossible in action
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Explore an end-to-end shift cancellation and Rescue a Shift recovery across the
              volunteer, charity, and corporate portals.
            </p>
          </div>
          <button
            type="button"
            onClick={onLaunchDemo}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Launch interactive demo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <article className="bg-white border border-slate-200 rounded-2xl p-7">
            <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-500">
                Rescue a Shift · EastCare Food Pantry
              </span>
              <span className="font-mono-tabular text-sm font-bold text-teal-700">
                10 → 9 → 10 Confirmed
              </span>
            </div>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              When a volunteer cancels on a full 10-volunteer Eunos Food Distribution shift, Rescue
              a Shift screens eligible volunteers for schedule conflicts and required skills, then
              invites a nearby replacement in seconds.
            </p>
          </article>

          <article className="bg-white border border-slate-200 rounded-2xl p-7">
            <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-500">
                Singapore Context · Live Open Data &amp; Mapping
              </span>
              <span className="font-mono-tabular text-sm font-bold text-teal-700">
                Trusted Data Sources
              </span>
            </div>
            <p className="mt-4 text-base text-slate-800 leading-relaxed">
              Official Singapore public holidays and 4-day weather outlooks sync from data.gov.sg,
              alongside OneMap spatial display, Charity Portal UEN verification links, and instant
              .ics calendar downloads.
            </p>
          </article>
        </div>
      </section>

      {/* 5. Partner Onboarding Lead Capture */}
      <section className="border-t border-slate-200 bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                Onboard your charity or corporate CSR programme
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                Charities receive guided UEN verification via the Singapore Charity Portal. Corporate
                teams receive dedicated onboarding, employee campaign setup, and exportable CSR
                reporting.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Authoritative charity UEN &amp; IPC verification workflow</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Corporate annual subscriptions &amp; enterprise CSR onboarding</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Volunteer access remains free forever</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-7 bg-[#FAFAF9] border border-slate-200 rounded-2xl p-6 sm:p-8">
              {submittedOrg ? (
                <div className="py-6">
                  <div className="flex items-center gap-2.5 text-teal-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      Request received for {submittedOrg}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Thank you for your interest in MissionPossible. Our partnerships team will
                    follow up with your organisation within 1 business day.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmittedOrg(null)}
                    className="mt-5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Submit another enquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} noValidate className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="home-org-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Organisation Name
                      </label>
                      <input
                        id="home-org-name"
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Pacific Horizon Group"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                    <div>
                      <label htmlFor="home-work-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Work Email
                      </label>
                      <input
                        id="home-work-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="csr@company.sg"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="home-org-type" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Organisation Type
                    </label>
                    <select
                      id="home-org-type"
                      value={orgType}
                      onChange={(e) =>
                        setOrgType(
                          e.target.value as 'Charity / NGO' | 'Corporate CSR' | 'Volunteer Centre'
                        )
                      }
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      <option value="Corporate CSR">Corporate CSR &amp; HR Programme</option>
                      <option value="Charity / NGO">Registered Charity / NGO</option>
                      <option value="Volunteer Centre">Community / Volunteer Centre</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="home-notes" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Programme Goals (Optional)
                    </label>
                    <textarea
                      id="home-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Estimated volunteer team size, preferred causes, or reporting timeline..."
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  {formError && (
                    <p role="alert" className="text-xs font-medium text-red-600">
                      {formError}
                    </p>
                  )}

                  <div className="pt-1 flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500">
                      1-business-day response · No obligation
                    </span>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Request Onboarding Call
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-[#FAFAF9] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <MissionPossibleLogo size={26} showWordmark />
            <p className="mt-2 text-xs text-slate-500">
              The right volunteer. The right cause. The right time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600">
            <button type="button" onClick={() => onNavigate('volunteers')} className="hover:text-slate-900 cursor-pointer">
              Volunteers
            </button>
            <button type="button" onClick={() => onNavigate('charities')} className="hover:text-slate-900 cursor-pointer">
              Charities
            </button>
            <button type="button" onClick={() => onNavigate('corporate')} className="hover:text-slate-900 cursor-pointer">
              Corporate CSR
            </button>
            <button type="button" onClick={() => onNavigate('pricing')} className="hover:text-slate-900 cursor-pointer">
              Pricing
            </button>
            <button type="button" onClick={() => onNavigate('demo')} className="hover:text-slate-900 cursor-pointer">
              Demo &amp; Pitch
            </button>
          </div>
          <p className="text-xs text-slate-400">
            &copy; 2026 MissionPossible · Connecting Singapore volunteers, charities, and corporate CSR.
          </p>
        </div>
      </footer>
    </div>
  );
};
