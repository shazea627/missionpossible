import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  Plus,
  X,
} from 'lucide-react';
import {
  CauseCategory,
  CorporateCampaign,
  CorporateOrg,
} from '../types';

interface CorporateDashboardProps {
  corporates: CorporateOrg[];
  showStage5Summary?: boolean;
  onCreateCampaign: (
    corporateId: string,
    campaign: Omit<CorporateCampaign, 'id' | 'registeredParticipants' | 'hoursCompleted' | 'status'>
  ) => void;
  onNotify: (title: string, description?: string) => void;
}

const CAUSES: CauseCategory[] = [
  'Food Distribution',
  'Elderly Companionship',
  'Beach Cleanup',
  'Tutoring Children',
  'Animal Shelter Support',
  'Community Gardening',
];

export const CorporateDashboard: React.FC<CorporateDashboardProps> = ({
  corporates,
  showStage5Summary = false,
  onCreateCampaign,
  onNotify,
}) => {
  const [selectedCorpId, setSelectedCorpId] = useState<string>(corporates[0]?.id ?? 'corp-01');
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');

  // New campaign state
  const [title, setTitle] = useState('');
  const [charityName, setCharityName] = useState('EastCare Food Pantry');
  const [cause, setCause] = useState<CauseCategory>('Food Distribution');
  const [dateLabel, setDateLabel] = useState('06 Dec 2026');
  const [departmentScope, setDepartmentScope] = useState('All Departments');
  const [targetParticipants, setTargetParticipants] = useState(30);
  const [formError, setFormError] = useState('');

  const activeCorp = useMemo(
    () => corporates.find((c) => c.id === selectedCorpId) ?? corporates[0],
    [corporates, selectedCorpId]
  );

  const totalHeadcount = activeCorp.departments.reduce((s, d) => s + d.headcount, 0);
  const totalParticipants = activeCorp.departments.reduce((s, d) => s + d.participants, 0);
  const completedHours = activeCorp.departments.reduce((s, d) => s + d.hoursLogged, 0);
  const participationRate = Math.round((totalParticipants / totalHeadcount) * 1000) / 10;

  const upcomingCampaigns = activeCorp.campaigns.filter((c) => c.status !== 'Completed');
  const completedCampaigns = activeCorp.campaigns.filter((c) => c.status === 'Completed');
  const upcomingRegistrations = upcomingCampaigns.reduce(
    (s, c) => s + c.registeredParticipants,
    0
  );

  const charityPartners = Array.from(new Set(activeCorp.campaigns.map((c) => c.charityName)));

  // Activities & Hours by Cause
  const causeBreakdown = useMemo(() => {
    const map = new Map<CauseCategory, number>();
    activeCorp.departments.forEach((d) => {
      map.set(d.topCause, (map.get(d.topCause) ?? 0) + d.hoursLogged);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [activeCorp]);

  const filteredDepartments = useMemo(() => {
    if (!deptSearch.trim()) return activeCorp.departments;
    const q = deptSearch.toLowerCase();
    return activeCorp.departments.filter(
      (d) => d.department.toLowerCase().includes(q) || d.topCause.toLowerCase().includes(q)
    );
  }, [activeCorp.departments, deptSearch]);

  const maxMonthlyHours = Math.max(...activeCorp.monthlyHours.map((m) => m.hours));

  const handleCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!title.trim()) {
      setFormError('Please enter an activity title.');
      return;
    }
    onCreateCampaign(activeCorp.id, {
      title: title.trim(),
      charityName,
      cause,
      dateLabel: dateLabel.trim() || '06 Dec 2026',
      departmentScope,
      targetParticipants: Number(targetParticipants) || 25,
    });
    setTitle('');
    setShowCampaignForm(false);
  };

  const handleDownloadCsv = () => {
    const header =
      'Organisation,Department,Headcount,Active Participants,Participation Rate (%),Completed Hours,Primary Cause\n';
    const rows = activeCorp.departments
      .map(
        (d) =>
          `"${activeCorp.name}","${d.department}",${d.headcount},${d.participants},${d.participationRate},${d.hoursLogged},"${d.topCause}"`
      )
      .join('\n');
    const summary = `\n"${activeCorp.name}","TOTAL",${totalHeadcount},${totalParticipants},${participationRate},${completedHours},"All Causes"`;
    const blob = new Blob([header + rows + summary], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MissionPossible_${activeCorp.id}_CSR_Impact_Summary.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify(
      'Impact summary exported',
      `Downloaded MissionPossible_${activeCorp.id}_CSR_Impact_Summary.csv`
    );
  };

  const handleCopySummary = async () => {
    const summaryText = `MissionPossible CSR Impact Summary — ${activeCorp.name}\n• Completed Impact: ${completedHours.toLocaleString()} employee hours across ${completedCampaigns.length} completed event(s)\n• Participation Rate: ${totalParticipants}/${totalHeadcount} (${participationRate}%)\n• Planned Activities: ${upcomingCampaigns.length} upcoming event(s) with ${upcomingRegistrations} employee registrations\n• Charity Partners: ${charityPartners.join(', ')}`;
    try {
      await navigator.clipboard.writeText(summaryText);
      onNotify('Summary copied to clipboard', 'Ready to paste into CSR reports.');
    } catch {
      onNotify('Impact summary ready', 'Use Download CSV to export full metrics.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Stage 5 Before & After Illustrative Summary Banner (Shown during Stage 5 Demo) */}
      {showStage5Summary && (
        <section
          aria-label="Stage 5 Business Value Summary"
          className="bg-white border border-teal-600 rounded-2xl p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <p className="font-mono-tabular text-xs font-semibold text-teal-700">
                Stage 5 — Business Value Summary
              </p>
              <h2 className="font-display text-xl font-bold text-slate-900 mt-0.5">
                Before &amp; After: Rescue a Shift + Corporate CSR Tracking
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Guided interactive walkthrough summary
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[#FAFAF9] border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-700">Before MissionPossible</p>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                <li>• 1 unexpected volunteer cancellation leaves shift at 9 / 10</li>
                <li>• Coordinator manually searches spreadsheets &amp; WhatsApp groups</li>
                <li>• High risk of unfilled shift and lost volunteer hours</li>
              </ul>
            </div>
            <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-4">
              <p className="text-xs font-bold text-teal-900">After MissionPossible</p>
              <ul className="mt-2 space-y-1.5 text-xs text-teal-900">
                <li>• Conflict-free skilled replacement identified and invited in seconds</li>
                <li>• Volunteer accepts in 1 click — shift restored to 10 / 10 confirmed</li>
                <li>• Volunteer, charity, and corporate records update automatically</li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div>
              <p className="text-xs text-slate-500">Shift Recovery Speed</p>
              <p className="font-mono-tabular text-xl font-bold text-teal-700 mt-0.5">&lt; 30 sec</p>
              <p className="text-[11px] text-slate-500">From cancellation to invite</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Eligible Volunteers Screened</p>
              <p className="font-mono-tabular text-xl font-bold text-slate-900 mt-0.5">15 pool</p>
              <p className="text-[11px] text-slate-500">Conflicts &amp; skills checked</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Shift Fulfilment Restored</p>
              <p className="font-mono-tabular text-xl font-bold text-teal-700 mt-0.5">100%</p>
              <p className="text-[11px] text-slate-500">10 / 10 confirmed volunteers</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Manual Follow-ups Avoided</p>
              <p className="font-mono-tabular text-xl font-bold text-slate-900 mt-0.5">10+ msgs</p>
              <p className="text-[11px] text-slate-500">Automated matching &amp; outreach</p>
            </div>
          </div>
        </section>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
              <Building2 className="w-4 h-4" />
              {activeCorp.plan}
            </span>
            <span aria-hidden="true">·</span>
            <span>{activeCorp.sector}</span>
            <span aria-hidden="true">·</span>
            <span>{activeCorp.enrolledEmployees} Enrolled Employees</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            {activeCorp.name}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Organise corporate volunteering activities, distinguish completed impact from planned
            events, and export participation summaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <select
            value={activeCorp.id}
            onChange={(e) => setSelectedCorpId(e.target.value)}
            aria-label="Switch corporate organisation"
            className="px-3.5 py-2.5 text-sm bg-[#FAFAF9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            {corporates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowCampaignForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showCampaignForm ? 'Close Form' : 'Plan CSR Event'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Impact Summary</span>
          </button>
        </div>
      </div>

      {/* Inline New Campaign Builder */}
      {showCampaignForm && (
        <form
          onSubmit={handleCampaignSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            Plan New Corporate Volunteering Event
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="camp-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Event Title
              </label>
              <input
                id="camp-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Year-End Eunos Pantry Drive"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="camp-charity" className="block text-xs font-semibold text-slate-700 mb-1">
                Charity Partner
              </label>
              <select
                id="camp-charity"
                value={charityName}
                onChange={(e) => setCharityName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="EastCare Food Pantry">EastCare Food Pantry</option>
                <option value="SilverBridge Befrienders">SilverBridge Befrienders</option>
                <option value="EastCoast Coastal Stewards">EastCoast Coastal Stewards</option>
                <option value="BrightSteps Learning Circle">BrightSteps Learning Circle</option>
                <option value="Chinatown Urban Growers">Chinatown Urban Growers</option>
              </select>
            </div>
            <div>
              <label htmlFor="camp-cause" className="block text-xs font-semibold text-slate-700 mb-1">
                Cause Area
              </label>
              <select
                id="camp-cause"
                value={cause}
                onChange={(e) => setCause(e.target.value as CauseCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                {CAUSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="camp-dept" className="block text-xs font-semibold text-slate-700 mb-1">
                Department Scope
              </label>
              <select
                id="camp-dept"
                value={departmentScope}
                onChange={(e) => setDepartmentScope(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="All Departments">All Departments</option>
                {activeCorp.departments.map((d) => (
                  <option key={d.department} value={d.department}>
                    {d.department}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="camp-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Planned Date
              </label>
              <input
                id="camp-date"
                type="text"
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="camp-spots" className="block text-xs font-semibold text-slate-700 mb-1">
                Target Employee Participants
              </label>
              <input
                id="camp-spots"
                type="number"
                min={5}
                value={targetParticipants}
                onChange={(e) => setTargetParticipants(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>
          </div>
          {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCampaignForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
            >
              Create Planned Event
            </button>
          </div>
        </form>
      )}

      {/* KPI Strip: Clearly Separating Completed Impact vs Planned Activities */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs text-slate-500">Completed Volunteering Hours</p>
          <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">
            {completedHours.toLocaleString()} hrs
          </p>
          <p className="text-xs text-teal-700 mt-1">Completed impact log</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs text-slate-500">Employee Participation Rate</p>
          <p className="font-mono-tabular text-2xl font-bold text-teal-700 mt-1">
            {participationRate}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {totalParticipants} of {totalHeadcount} employees
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs text-slate-500">Upcoming Planned Registrations</p>
          <p className="font-mono-tabular text-2xl font-bold text-amber-700 mt-1">
            {upcomingRegistrations} staff
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Across {upcomingCampaigns.length} planned event(s)
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs text-slate-500">Active Charity Partners</p>
          <p className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1">
            {charityPartners.length}
          </p>
          <p className="text-xs text-slate-500 mt-1 truncate">{charityPartners.join(', ')}</p>
        </div>
      </div>

      {/* Analytics Row: Monthly Hours Chart + Cause Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Monthly Volunteer Hours Bar Chart */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Completed Monthly Volunteering Hours
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Completed employee hours by month (Jun – Nov 2026)
            </p>
          </div>

          <div className="mt-6 flex items-end justify-between gap-3 h-48 pt-4">
            {activeCorp.monthlyHours.map((item) => {
              const heightPct = Math.round((item.hours / maxMonthlyHours) * 100);
              return (
                <div
                  key={item.month}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                >
                  <span className="font-mono-tabular text-xs font-semibold text-slate-700">
                    {item.hours}
                  </span>
                  <div className="w-full max-w-[42px] bg-slate-100 rounded-t-md h-32 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-teal-700 rounded-t-md transition-all duration-300"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Volunteering Activities by Cause */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Volunteering Activities by Cause
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Completed employee hours distributed across Singapore community causes
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {causeBreakdown.map(([causeName, hrs]) => {
              const pct = Math.round((hrs / completedHours) * 100);
              return (
                <div key={causeName}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-800">{causeName}</span>
                    <span className="font-mono-tabular text-slate-600">
                      {hrs} hrs ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-700 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Planned vs Completed Corporate Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-display text-base font-bold text-slate-900">
              Upcoming &amp; Planned Events ({upcomingCampaigns.length})
            </h2>
            <span className="text-xs font-medium text-amber-700">Planned Activities</span>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {upcomingCampaigns.map((camp) => {
              const pct = Math.min(
                100,
                Math.round((camp.registeredParticipants / camp.targetParticipants) * 100)
              );
              return (
                <div key={camp.id} className="py-3.5 first:pt-1 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{camp.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {camp.charityName} · {camp.cause} · {camp.dateLabel}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-amber-700 shrink-0">
                      {camp.status}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono-tabular text-xs text-slate-600 shrink-0">
                      {camp.registeredParticipants}/{camp.targetParticipants} registered
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-display text-base font-bold text-slate-900">
              Completed Events ({completedCampaigns.length})
            </h2>
            <span className="text-xs font-medium text-teal-700">Completed Impact</span>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {completedCampaigns.map((camp) => (
              <div key={camp.id} className="py-3.5 first:pt-1 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{camp.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {camp.charityName} · {camp.cause} · {camp.dateLabel}
                    </p>
                  </div>
                  <span className="font-mono-tabular text-xs font-bold text-teal-700 shrink-0">
                    {camp.hoursCompleted} hrs completed
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {camp.registeredParticipants} employees participated ({camp.departmentScope})
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Participation Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Department Participation Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Completed hours and participation rates per business unit
            </p>
          </div>
          <input
            type="text"
            value={deptSearch}
            onChange={(e) => setDeptSearch(e.target.value)}
            placeholder="Filter department or cause..."
            aria-label="Filter department table"
            className="px-3.5 py-2 text-xs bg-[#FAFAF9] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 w-full sm:w-64"
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-2.5 pr-4">Department</th>
                <th className="py-2.5 pr-4">Primary Cause</th>
                <th className="py-2.5 pr-4 text-right">Headcount</th>
                <th className="py-2.5 pr-4 text-right">Active Staff</th>
                <th className="py-2.5 pr-4 text-right">Participation</th>
                <th className="py-2.5 text-right">Completed Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredDepartments.map((dept) => (
                <tr key={dept.department} className="hover:bg-slate-50/70">
                  <td className="py-3 pr-4 font-semibold text-slate-900">{dept.department}</td>
                  <td className="py-3 pr-4 text-xs text-slate-600">{dept.topCause}</td>
                  <td className="py-3 pr-4 text-right font-mono-tabular text-slate-700">
                    {dept.headcount}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono-tabular text-slate-700">
                    {dept.participants}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono-tabular font-semibold text-teal-700">
                    {dept.participationRate}%
                  </td>
                  <td className="py-3 text-right font-mono-tabular font-semibold text-slate-900">
                    {dept.hoursLogged.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exportable Impact Summary Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="csr-report-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs font-semibold text-teal-700">
                  MissionPossible Exportable CSR Impact Summary
                </p>
                <h2 id="csr-report-title" className="font-display text-xl font-bold text-slate-900 mt-1">
                  {activeCorp.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                aria-label="Close impact summary preview"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4 bg-[#FAFAF9] border border-slate-200 rounded-xl p-4">
              <div>
                <p className="text-xs text-slate-500">Completed Hours</p>
                <p className="font-mono-tabular text-xl font-bold text-slate-900 mt-0.5">
                  {completedHours.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Participation Rate</p>
                <p className="font-mono-tabular text-xl font-bold text-teal-700 mt-0.5">
                  {participationRate}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Planned Registrations</p>
                <p className="font-mono-tabular text-xl font-bold text-amber-700 mt-0.5">
                  {upcomingRegistrations}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Record Scope &amp; Separation</p>
              <p className="leading-relaxed">
                This summary strictly separates {completedHours.toLocaleString()} completed
                volunteering hours from {upcomingRegistrations} planned upcoming employee
                registrations across {charityPartners.length} partner charities.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-teal-700 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Charity Partners: {charityPartners.join(', ')}</span>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Summary</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV Summary</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
