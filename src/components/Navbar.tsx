import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { PageView } from '../types';
import { MissionPossibleLogo } from './MissionPossibleLogo';

interface NavbarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
}

const NAV_ITEMS: { id: PageView; label: string }[] = [
  { id: 'home', label: 'Overview' },
  { id: 'volunteers', label: 'Volunteers' },
  { id: 'calendar', label: 'My Calendar' },
  { id: 'charities', label: 'Charities' },
  { id: 'corporate', label: 'Corporate CSR' },
  { id: 'pricing', label: 'Pricing' },
];

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (page: PageView) => {
    onNavigate(page);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF9]/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-md py-1 whitespace-nowrap shrink-0 cursor-pointer"
          aria-label="MissionPossible Home"
        >
          <MissionPossibleLogo size={30} showWordmark />
        </button>

        {/* Zone 2: 5 Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-sm ${
                  active
                    ? 'text-teal-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[19px] h-0.5 bg-teal-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleSelect('demo')}
            className={`hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
              currentPage === 'demo'
                ? 'bg-slate-900 text-white'
                : 'bg-teal-700 text-white hover:bg-teal-800'
            }`}
          >
            Demo &amp; Pitch
          </button>

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
          {NAV_ITEMS.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-teal-50 text-teal-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleSelect('demo')}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
            >
              Demo &amp; Pitch
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
