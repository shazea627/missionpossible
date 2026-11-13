import React, { useState } from 'react';
import { Building2, ChevronDown, HeartHandshake, Menu, User, X } from 'lucide-react';
import { PageView, VolunteerSubTab } from '../types';
import { MissionPossibleLogo } from './MissionPossibleLogo';

interface NavbarProps {
  currentPage: PageView;
  activeVolunteerTab: VolunteerSubTab;
  onNavigate: (page: PageView) => void;
  onSelectVolunteerTab: (tab: VolunteerSubTab) => void;
}

const VOLUNTEER_NAV_ITEMS: { id: VolunteerSubTab; label: string }[] = [
  { id: 'discover', label: 'Discover' },
  { id: 'calendar', label: 'My Calendar' },
  { id: 'my-volunteering', label: 'My Missions' },
  { id: 'route-planner', label: 'Plan My Journey' },
  { id: 'profile', label: 'Profile' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  activeVolunteerTab,
  onNavigate,
  onSelectVolunteerTab,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);

  const isVolunteerPortal = currentPage === 'volunteers' || currentPage === 'calendar';

  const handlePageSelect = (page: PageView) => {
    onNavigate(page);
    setMobileOpen(false);
    setOrgMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVolTabSelect = (tab: VolunteerSubTab) => {
    onSelectVolunteerTab(tab);
    setMobileOpen(false);
    setOrgMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resolvedVolTab: VolunteerSubTab =
    activeVolunteerTab === 'notifications' ? 'profile' : activeVolunteerTab;

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF9]/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => handlePageSelect('home')}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 rounded-md py-1 whitespace-nowrap shrink-0 cursor-pointer"
          aria-label="MissionPossible Home"
        >
          <MissionPossibleLogo size={30} showWordmark />
        </button>

        {/* Zone 2: Persona-Focused Single-Line Navigation */}
        {currentPage === 'demo' ? (
          <nav className="hidden md:flex items-center gap-7" aria-label="Presentation Navigation">
            <span className="text-sm font-medium text-slate-500 whitespace-nowrap shrink-0">
              Isolated Presentation Mode
            </span>
          </nav>
        ) : isVolunteerPortal ? (
          <nav className="hidden md:flex items-center gap-7" aria-label="Volunteer Navigation">
            {VOLUNTEER_NAV_ITEMS.map((item) => {
              const active = resolvedVolTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleVolTabSelect(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-sm ${
                    active ? 'text-teal-800 font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 right-0 -bottom-[15px] h-0.5 bg-teal-700"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        ) : currentPage === 'charities' || currentPage === 'corporate' ? (
          <nav className="hidden md:flex items-center gap-7" aria-label="Organisation Navigation">
            <button
              type="button"
              onClick={() => handlePageSelect('charities')}
              aria-current={currentPage === 'charities' ? 'page' : undefined}
              className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-sm ${
                currentPage === 'charities'
                  ? 'text-teal-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Charity Coordinator
              {currentPage === 'charities' && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 -bottom-[15px] h-0.5 bg-teal-700"
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => handlePageSelect('corporate')}
              aria-current={currentPage === 'corporate' ? 'page' : undefined}
              className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-sm ${
                currentPage === 'corporate'
                  ? 'text-teal-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Corporate CSR
              {currentPage === 'corporate' && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 -bottom-[15px] h-0.5 bg-teal-700"
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleVolTabSelect('discover')}
              className="py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-sm"
            >
              Volunteer Portal
            </button>
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-7" aria-label="Primary Navigation">
            <button
              type="button"
              onClick={() => handleVolTabSelect('discover')}
              className="py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-sm"
            >
              Discover Missions
            </button>
            <button
              type="button"
              onClick={() => handleVolTabSelect('calendar')}
              className="py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-sm"
            >
              My Calendar
            </button>
            <button
              type="button"
              onClick={() => handlePageSelect('charities')}
              className="py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-sm"
            >
              For Charities
            </button>
            <button
              type="button"
              onClick={() => handlePageSelect('corporate')}
              className="py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-sm"
            >
              For Companies
            </button>
          </nav>
        )}

        {/* Zone 3: Single Primary Action + Mobile Trigger */}
        <div className="flex items-center gap-3 shrink-0 relative">
          {currentPage === 'demo' ? (
            <button
              type="button"
              onClick={() => handlePageSelect('home')}
              className="hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              Back to App
            </button>
          ) : isVolunteerPortal ? (
            <div className="hidden md:block relative">
              <button
                type="button"
                onClick={() => setOrgMenuOpen((prev) => !prev)}
                aria-expanded={orgMenuOpen}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                <span>For Organisations</span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
              {orgMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handlePageSelect('charities')}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-start gap-2.5 cursor-pointer"
                  >
                    <HeartHandshake className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Charity Coordinator</p>
                      <p className="text-xs text-slate-500">Manage shifts &amp; replacements</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handlePageSelect('corporate')}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-start gap-2.5 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Corporate CSR</p>
                      <p className="text-xs text-slate-500">Organise team events &amp; reports</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleVolTabSelect('discover')}
              className="hidden md:inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              <span>Find a Mission</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {isVolunteerPortal ? (
            <>
              {VOLUNTEER_NAV_ITEMS.map((item) => {
                const active = resolvedVolTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleVolTabSelect(item.id)}
                    className={`w-full text-left px-3.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-teal-50 text-teal-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
                <p className="px-3.5 py-1 text-xs font-medium text-slate-400">
                  Switch to Organisation View
                </p>
                <button
                  type="button"
                  onClick={() => handlePageSelect('charities')}
                  className="w-full text-left px-3.5 min-h-[44px] rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Charity Coordinator
                </button>
                <button
                  type="button"
                  onClick={() => handlePageSelect('corporate')}
                  className="w-full text-left px-3.5 min-h-[44px] rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Corporate CSR Manager
                </button>
              </div>
            </>
          ) : currentPage === 'demo' ? (
            <button
              type="button"
              onClick={() => handlePageSelect('home')}
              className="w-full px-4 min-h-[44px] text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
            >
              Back to Customer App
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleVolTabSelect('discover')}
                className="w-full text-left px-3.5 min-h-[44px] rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 text-teal-700" />
                <span>Discover Missions (Volunteers)</span>
              </button>
              <button
                type="button"
                onClick={() => handleVolTabSelect('calendar')}
                className="w-full text-left px-3.5 min-h-[44px] rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                My Calendar
              </button>
              <button
                type="button"
                onClick={() => handlePageSelect('charities')}
                className={`w-full text-left px-3.5 min-h-[44px] rounded-lg text-sm font-medium cursor-pointer ${
                  currentPage === 'charities'
                    ? 'bg-teal-50 text-teal-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Charity Coordinator
              </button>
              <button
                type="button"
                onClick={() => handlePageSelect('corporate')}
                className={`w-full text-left px-3.5 min-h-[44px] rounded-lg text-sm font-medium cursor-pointer ${
                  currentPage === 'corporate'
                    ? 'bg-teal-50 text-teal-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Corporate CSR Manager
              </button>
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleVolTabSelect('discover')}
                  className="w-full px-4 min-h-[44px] text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
                >
                  Find a Mission
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};
