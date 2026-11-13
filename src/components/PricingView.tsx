import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface PricingViewProps {
  onNotify: (title: string, description?: string) => void;
}

export const PricingView: React.FC<PricingViewProps> = ({ onNotify }) => {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!orgName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setError('Please enter your organisation name and a valid work email.');
      return;
    }
    onNotify(
      `Plan request submitted for ${selectedPlan}`,
      `Onboarding details sent to ${contactEmail.trim()}.`
    );
    setSelectedPlan(null);
    setOrgName('');
    setContactEmail('');
  };

  const charityProPrice = billingCycle === 'annual' ? 'S$490' : 'S$49';
  const charityProCadence = billingCycle === 'annual' ? 'per year (2 months free)' : 'per month';

  const corporatePrice = billingCycle === 'annual' ? 'S$4,800' : 'S$450';
  const corporateCadence = billingCycle === 'annual' ? 'per year' : 'per month';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
      {/* Header & Billing Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-teal-700">
            MissionPossible Plans &amp; Revenue Architecture
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mt-2 text-balance">
            Free for volunteers. Sustainable infrastructure for charities and corporates.
          </h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Our pricing follows a clear civic model: individual volunteers always join free, small
            charities access core shift matching at zero cost, and corporate CSR subscriptions fund
            shared ecosystem reliability.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start shrink-0">
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              billingCycle === 'annual'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Annual Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
        </div>
      </div>

      {/* 4 Pricing Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {/* Tier 1: Individual Volunteers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">For Individual Volunteers</p>
            <h2 className="font-display text-xl font-bold text-slate-900 mt-1">Community Access</h2>
            <div className="mt-4 pb-4 border-b border-slate-100">
              <p className="font-mono-tabular text-3xl font-bold text-slate-900">Free</p>
              <p className="text-xs text-slate-500 mt-1">Always free for volunteers</p>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <span>Singpass MyInfo single-click verification</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <span>Real-time weekly availability &amp; skill matching</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <span>Verified volunteer hours transcript</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() =>
              onNotify('Volunteer access is open', 'Switch to the Volunteers tab to book shifts.')
            }
            className="mt-6 w-full px-4 py-2.5 text-xs font-semibold text-slate-800 bg-[#FAFAF9] border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Start Volunteering Free
          </button>
        </div>

        {/* Tier 2: Charity Management Subscription */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-teal-700">For Charities &amp; NGOs</p>
            <h2 className="font-display text-xl font-bold text-slate-900 mt-1">
              Charity Management
            </h2>
            <div className="mt-4 pb-4 border-b border-slate-100">
              <p className="font-mono-tabular text-3xl font-bold text-slate-900">
                {charityProPrice}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Core shift listing free · Pro {charityProCadence}
              </p>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <span>Automated waitlist &amp; cancellation recovery</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <span>Multi-event scheduling &amp; attendance check-in</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <span>Donation &amp; volunteer activity tracking</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPlan('Charity Management Pro')}
            className="mt-6 w-full px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            Choose Charity Plan
          </button>
        </div>

        {/* Tier 3: Corporate Annual Subscription (Primary Highlighted) */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-teal-300">For Companies with CSR Programmes</p>
            <h2 className="font-display text-xl font-bold text-white mt-1">
              Corporate Annual
            </h2>
            <div className="mt-4 pb-4 border-b border-slate-800">
              <p className="font-mono-tabular text-3xl font-bold text-white">{corporatePrice}</p>
              <p className="text-xs text-slate-400 mt-1">
                {corporateCadence} · Up to 250 employees
              </p>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-200">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Department volunteering campaigns &amp; reservations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Live employee participation &amp; hours analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Audit-ready ESG &amp; CSR impact report exports</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPlan('Corporate Annual Subscription')}
            className="mt-6 w-full px-4 py-2.5 text-xs font-semibold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-lg transition-colors cursor-pointer"
          >
            Start Corporate CSR Plan
          </button>
        </div>

        {/* Tier 4: Enterprise Onboarding & Reporting Services */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-700">For Large Enterprises &amp; Trusts</p>
            <h2 className="font-display text-xl font-bold text-slate-900 mt-1">
              Enterprise Services
            </h2>
            <div className="mt-4 pb-4 border-b border-slate-100">
              <p className="font-mono-tabular text-3xl font-bold text-slate-900">Custom</p>
              <p className="text-xs text-slate-500 mt-1">Annual contract · 250+ staff</p>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <span>Customised corporate onboarding &amp; programme setup</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <span>Consolidated multi-entity CSR &amp; donation tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <span>Dedicated account manager &amp; HRIS SSO sync</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPlan('Enterprise Onboarding & Reporting')}
            className="mt-6 w-full px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            Contact Enterprise Sales
          </button>
        </div>
      </div>

      {/* Concrete Comparison Matrix */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-slate-900 pb-4 border-b border-slate-100">
          Plan Limits &amp; Operational Capabilities
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-3 pr-4">Capability</th>
                <th className="py-3 pr-4">Volunteers</th>
                <th className="py-3 pr-4">Charity Pro</th>
                <th className="py-3 pr-4">Corporate Annual</th>
                <th className="py-3">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 pr-4 font-medium text-slate-900">Active Employee / Member Seats</td>
                <td className="py-3 pr-4 font-mono-tabular text-slate-600">1 individual</td>
                <td className="py-3 pr-4 font-mono-tabular text-slate-600">Up to 500 rostered</td>
                <td className="py-3 pr-4 font-mono-tabular text-slate-900 font-semibold">Up to 250 staff</td>
                <td className="py-3 font-mono-tabular text-slate-900 font-semibold">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-slate-900">Singpass Identity Verification</td>
                <td className="py-3 pr-4 text-teal-700 font-medium">Included</td>
                <td className="py-3 pr-4 text-teal-700 font-medium">Included</td>
                <td className="py-3 pr-4 text-teal-700 font-medium">Included</td>
                <td className="py-3 text-teal-700 font-medium">Included + Corporate SSO</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-slate-900">Waitlist &amp; Backup Re-Matching</td>
                <td className="py-3 pr-4 text-slate-400">Self-service</td>
                <td className="py-3 pr-4 text-slate-700">Automated promotion</td>
                <td className="py-3 pr-4 text-slate-700">Team seat reserves</td>
                <td className="py-3 text-slate-700">Priority partner pool</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-slate-900">Impact &amp; ESG Report Exports</td>
                <td className="py-3 pr-4 text-slate-600">Personal PDF log</td>
                <td className="py-3 pr-4 text-slate-600">Monthly roster CSV</td>
                <td className="py-3 pr-4 text-slate-900 font-medium">Consolidated CSR CSV/PDF</td>
                <td className="py-3 text-slate-900 font-medium">Custom ESG &amp; Grant Audit</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-slate-900">Onboarding &amp; Support SLA</td>
                <td className="py-3 pr-4 text-slate-600">Self-service</td>
                <td className="py-3 pr-4 text-slate-600">Guided onboarding</td>
                <td className="py-3 pr-4 text-slate-600">1 business day SLA</td>
                <td className="py-3 text-slate-900 font-medium">Dedicated CSR specialist</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Inquiry Modal */}
      {selectedPlan && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <p className="text-xs font-semibold text-teal-700">MissionPossible Onboarding</p>
                <h3 id="plan-modal-title" className="font-display text-lg font-bold text-slate-900 mt-0.5">
                  {selectedPlan}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                aria-label="Close modal"
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePlanSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="plan-org" className="block text-xs font-semibold text-slate-700 mb-1">
                  Organisation Name
                </label>
                <input
                  id="plan-org"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Organisation or Company Name"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label htmlFor="plan-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email
                </label>
                <input
                  id="plan-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@organisation.sg"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              {error && <p className="text-xs font-medium text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
