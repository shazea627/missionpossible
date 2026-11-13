import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  HeartHandshake,
  MapPin,
  Navigation,
  Users,
  X,
} from 'lucide-react';
import { AvailabilitySlot, Opportunity, PageView, VolunteerSubTab } from '../types';
import { SLOT_LABELS } from '../utils/matching';
import { MissionPossibleLogo } from './MissionPossibleLogo';

interface HomeViewProps {
  opportunities: Opportunity[];
  onNavigate: (page: PageView) => void;
  onOpenVolunteerTab: (tab: VolunteerSubTab) => void;
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
  onOpenVolunteerTab,
  onNotify,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot>('saturday-morning');
  const [showOrgChooser, setShowOrgChooser] = useState(false);

  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [orgType, setOrgType] = useState<'Charity / NGO' | 'Corporate CSR'>('Charity / NGO');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submittedOrg, setSubmittedOrg] = useState<string | null>(null);

  const previewMatches = useMemo(
    () =>
      opportunities
        .filter((opp) => opp.slot === selectedSlot && opp.spotsFilled < opp.spotsTotal)
        .slice(0, 3),
    [opportunities, selectedSlot]
  );

  const fallbackMatches = useMemo(
    () =>
      previewMatches.length > 0
        ? previewMatches
        : opportunities.filter((opp) => opp.slot === selectedSlot).slice(0, 3),
    [previewMatches, opportunities, selectedSlot]
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
      'Request received',
      `We will get in touch with ${orgName.trim()} within 1 business day.`
    );
    setOrgName('');
    setEmail('');
    setNotes('');
  };

  return (
    <div className="bg-[#FAFAF9]">
      {/* 1. Customer-Centric Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-teal-700 mb-3">
              Volunteering across Singapore
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-slate-900 leading-[1.08] text-balance">
              Make time for good.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              Discover volunteering opportunities that fit your schedule, interests and location.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => onOpenVolunteerTab('discover')}
                className="inline-flex items-center justify-center gap-2 px-6 min-h-[46px] text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                <span>Find a Mission</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowOrgChooser(true)}
                className="inline-flex items-center justify-center gap-2 px-5 min-h-[46px] text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                <span>I&apos;m an Organisation</span>
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
              <span>Browse without creating an account</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>See travel time before you commit</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>Save directly to your calendar</span>
            </div>
          </div>

          {/* Right Column: Interactive Upcoming Missions Explorer (No Account Needed) */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="h-full bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Upcoming opportunities near you
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Pick when you&apos;re free to preview open missions
                    </p>
                  </div>
                </div>

                {/* Segmented Time Selector */}
                <div
                  className="mt-4 grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg"
                  role="tablist"
                  aria-label="Choose when you are free"
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
                        className={`px-2 min-h-[40px] text-xs sm:text-sm font-medium rounded-md transition-colors truncate cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                          active
                            ? 'bg-white text-slate-900 shadow-sm font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {SLOT_LABELS[slot]
                          .replace(' Mornings', ' AM')
                          .replace(' Afternoons', ' PM')
                          .replace('Public Holidays', 'Holidays')}
                      </button>
                    );
                  })}
                </div>

                {/* Upcoming Opportunities List */}
                <div className="mt-4 divide-y divide-slate-100">
                  {fallbackMatches.map((opp) => {
                    const spotsLeft = Math.max(0, opp.spotsTotal - opp.spotsFilled);
                    return (
                      <div key={opp.id} className="py-4 first:pt-2 last:pb-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                              {opp.title}
                            </p>
                            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                              {opp.charityName} <span aria-hidden="true">·</span> {opp.cause}
                            </p>
                          </div>
                          <span
                            className={`font-mono-tabular text-xs font-semibold shrink-0 mt-0.5 ${
                              spotsLeft > 0 ? 'text-teal-700' : 'text-slate-500'
                            }`}
                          >
                            {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Waitlist open'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1.5 line-clamp-2">
                          {opp.description}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {opp.dateLabel} · {opp.timeLabel}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {opp.location}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500">
                  {opportunities.length} upcoming missions across Singapore
                </span>
                <button
                  type="button"
                  onClick={() => onOpenVolunteerTab('discover')}
                  className="text-sm font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
                >
                  <span>Browse all missions</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. How Easy It Is To Get Started */}
      <section className="border-t border-slate-200 bg-white py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              Volunteering that works around real life
            </h2>
            <p className="mt-2.5 text-base text-slate-600 leading-relaxed">
              No long forms or confusing sign-ups. See what fits your week, how long it takes to
              get there, and show up ready to help.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#FAFAF9] border border-slate-200 rounded-2xl p-6 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                1. Share when you&apos;re free
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Pick mornings, evenings, weekends, or public holidays—whether you have two hours
                once in a while or every Saturday.
              </p>
            </div>

            <div className="bg-[#FAFAF9] border border-slate-200 rounded-2xl p-6 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Navigation className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                2. Find missions close by
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Search from your home or workplace postal code, check travel time and directions,
                and review exactly what you will be doing.
              </p>
            </div>

            <div className="bg-[#FAFAF9] border border-slate-200 rounded-2xl p-6 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">
                3. Confirm and stay on track
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Reserve your spot in one tap, add it to your calendar, get departure reminders, and
                keep track of your completed hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Clear Entry Points for Volunteers, Charities & Companies */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="max-w-2xl mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Choose how you&apos;d like to get started
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Dedicated spaces for individual volunteers, charity coordinators, and company CSR
            teams.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Individual Volunteers */}
          <article className="bg-white border border-slate-200 rounded-2xl p-7 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700">
                <Users className="w-4 h-4" />
                <span>For Volunteers</span>
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                Find a mission that fits your week
              </h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                Explore local causes, check travel times, plan your route, and manage your
                volunteering calendar in one place.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onOpenVolunteerTab('discover')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 min-h-[44px] text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
              >
                <span>Find a Mission</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </article>

          {/* Charity Coordinators */}
          <article className="bg-white border border-slate-200 rounded-2xl p-7 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700">
                <HeartHandshake className="w-4 h-4" />
                <span>For Charities &amp; Non-Profits</span>
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                Keep every shift reliably staffed
              </h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                Post upcoming shifts, spot staffing gaps early, find vetted replacements when
                someone cancels, and record attendance cleanly.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onNavigate('charities')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 min-h-[44px] text-sm font-semibold text-slate-800 bg-[#FAFAF9] border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <span>Open Charity Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </article>

          {/* Corporate CSR Managers */}
          <article className="bg-white border border-slate-200 rounded-2xl p-7 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700">
                <Building2 className="w-4 h-4" />
                <span>For Companies &amp; CSR Teams</span>
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900 mt-2">
                Organise employee volunteering with less admin
              </h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                Partner with community charities, invite staff to team activities, monitor
                sign-ups, and export clear participation summaries.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onNavigate('corporate')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 min-h-[44px] text-sm font-semibold text-slate-800 bg-[#FAFAF9] border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <span>Open Corporate CSR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* 4. Organisation Onboarding Request */}
      <section className="border-t border-slate-200 bg-white py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                Bring MissionPossible to your charity or workplace
              </h2>
              <p className="mt-3 text-base text-slate-600 leading-relaxed">
                Tell us a little about your team and our community support team will help you set up
                your first volunteering activities.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Guided UEN verification for registered charities</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Easy team event planning for company CSR coordinators</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Always free for individual volunteers</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-7 bg-[#FAFAF9] border border-slate-200 rounded-2xl p-6 sm:p-8">
              {submittedOrg ? (
                <div className="py-4">
                  <div className="flex items-center gap-2.5 text-teal-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      Thank you — we&apos;ve received {submittedOrg}&apos;s request
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Someone from our team will follow up within 1 business day.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmittedOrg(null)}
                    className="mt-5 px-4 min-h-[42px] text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Send another request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} noValidate className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="home-org-name"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Organisation Name
                      </label>
                      <input
                        id="home-org-name"
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. EastCare Food Pantry"
                        className="w-full px-3.5 min-h-[44px] text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="home-work-email"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Work Email
                      </label>
                      <input
                        id="home-work-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@organisation.sg"
                        className="w-full px-3.5 min-h-[44px] text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="home-org-type"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Organisation Type
                    </label>
                    <select
                      id="home-org-type"
                      value={orgType}
                      onChange={(e) =>
                        setOrgType(e.target.value as 'Charity / NGO' | 'Corporate CSR')
                      }
                      className="w-full px-3.5 min-h-[44px] text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      <option value="Charity / NGO">Charity / Non-Profit Organisation</option>
                      <option value="Corporate CSR">Company / Corporate CSR Programme</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="home-notes"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      How can we help? (Optional)
                    </label>
                    <textarea
                      id="home-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Share upcoming dates, volunteer group size, or cause areas..."
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  {formError && (
                    <p role="alert" className="text-xs font-medium text-red-600">
                      {formError}
                    </p>
                  )}

                  <div className="pt-1 flex flex-wrap items-center justify-between gap-4">
                    <span className="text-xs text-slate-500">Response within 1 business day</span>
                    <button
                      type="submit"
                      className="px-5 min-h-[44px] text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Get in Touch
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Customer Footer (No pitch or presentation clutter) */}
      <footer className="border-t border-slate-200 bg-[#FAFAF9] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <MissionPossibleLogo size={26} showWordmark />
            <p className="mt-2 text-xs text-slate-500">
              The right volunteer. The right cause. The right time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => onOpenVolunteerTab('discover')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Discover Missions
            </button>
            <button
              type="button"
              onClick={() => onOpenVolunteerTab('calendar')}
              className="hover:text-slate-900 cursor-pointer"
            >
              My Calendar
            </button>
            <button
              type="button"
              onClick={() => onNavigate('charities')}
              className="hover:text-slate-900 cursor-pointer"
            >
              For Charities
            </button>
            <button
              type="button"
              onClick={() => onNavigate('corporate')}
              className="hover:text-slate-900 cursor-pointer"
            >
              For Companies
            </button>
            <button
              type="button"
              onClick={() => onNavigate('pricing')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Plans
            </button>
          </div>
          <p className="text-xs text-slate-400">
            &copy; 2026 MissionPossible
          </p>
        </div>
      </footer>

      {/* Organisation Role Chooser Modal ("I'm an Organisation") */}
      {showOrgChooser && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org-chooser-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="org-chooser-title" className="font-display text-xl font-bold text-slate-900">
                  Which organisation workspace do you need?
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Select your role to go straight to your workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOrgChooser(false)}
                aria-label="Close"
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowOrgChooser(false);
                  onNavigate('charities');
                }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 transition-colors flex items-start gap-3.5 cursor-pointer"
              >
                <HeartHandshake className="w-5 h-5 text-teal-700 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-display text-base font-bold text-slate-900">
                    Charity Coordinator
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Post shifts, check volunteer staffing, find replacements for cancellations, and
                    record attendance.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOrgChooser(false);
                  onNavigate('corporate');
                }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-teal-600 hover:bg-teal-50/40 transition-colors flex items-start gap-3.5 cursor-pointer"
              >
                <Building2 className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-display text-base font-bold text-slate-900">
                    Corporate CSR Manager
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Find charity partners, plan employee volunteering events, track sign-ups, and
                    export CSR reports.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
