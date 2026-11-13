/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CharityDashboard } from './components/CharityDashboard';
import { CorporateDashboard } from './components/CorporateDashboard';
import { DemoPresentationView } from './components/DemoPresentationView';
import { DEMO_STAGES, DemoToolbar } from './components/DemoToolbar';
import { HomeView } from './components/HomeView';
import { Navbar } from './components/Navbar';
import { PricingView } from './components/PricingView';
import { Toast, ToastMessage } from './components/Toast';
import { VolunteerDashboard } from './components/VolunteerDashboard';
import {
  INITIAL_BOOKINGS,
  INITIAL_CHARITIES,
  INITIAL_CORPORATE_ORGS,
  INITIAL_OPPORTUNITIES,
  VOLUNTEER_POOL,
} from './data/mockData';
import {
  AttendanceStatus,
  CorporateCampaign,
  CorporateOrg,
  Opportunity,
  PageView,
  PublicHoliday,
  ShiftBooking,
  ShiftInvitation,
  VolunteerProfile,
  WeatherApiState,
} from './types';

const PAGE_TITLES: Record<PageView, string> = {
  home: 'MissionPossible — The right volunteer. The right cause. The right time.',
  volunteers: 'Volunteer Portal — MissionPossible',
  charities: 'Charity Workspace — MissionPossible',
  corporate: 'Corporate CSR Portal — MissionPossible',
  pricing: 'Pricing & Plans — MissionPossible',
  demo: 'Demo Mode & Pitch Deck — MissionPossible',
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [demoActive, setDemoActive] = useState(false);
  const [demoStage, setDemoStage] = useState(1);

  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>(VOLUNTEER_POOL);
  const [activeVolunteerId, setActiveVolunteerId] = useState<string>('vol-01');
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [bookings, setBookings] = useState<ShiftBooking[]>(INITIAL_BOOKINGS);
  const [invitations, setInvitations] = useState<ShiftInvitation[]>([]);
  const [corporates, setCorporates] = useState<CorporateOrg[]>(INITIAL_CORPORATE_ORGS);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Singapore API integration states
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [holidaysSource, setHolidaysSource] = useState<'live' | 'demo'>('demo');
  const [holidaysRateLimited, setHolidaysRateLimited] = useState(false);
  const [dataGovAuthMode, setDataGovAuthMode] = useState<'keyless-public' | 'optional-key-configured'>(
    'keyless-public'
  );
  const [weather, setWeather] = useState<WeatherApiState>({
    source: 'unavailable',
    supportedRange: null,
    forecasts: [],
  });
  const [onemapConfigured, setOnemapConfigured] = useState(false);

  const activeVolunteer = useMemo(
    () => volunteers.find((v) => v.id === activeVolunteerId) ?? volunteers[0],
    [volunteers, activeVolunteerId]
  );

  useEffect(() => {
    document.title = PAGE_TITLES[currentPage];
  }, [currentPage]);

  useEffect(() => {
    let active = true;
    const loadIntegrations = async () => {
      const [statusResult, holidayResult, weatherResult] = await Promise.allSettled([
        fetch('/api/integrations/status'),
        fetch('/api/sg/holidays'),
        fetch('/api/sg/weather'),
      ]);

      if (!active) return;

      if (statusResult.status === 'fulfilled' && statusResult.value.ok) {
        try {
          const statusJson = (await statusResult.value.json()) as {
            onemap?: { configured?: boolean };
            holidays?: { authMode?: 'keyless-public' | 'optional-key-configured' };
          };
          setOnemapConfigured(Boolean(statusJson.onemap?.configured));
          if (statusJson.holidays?.authMode) {
            setDataGovAuthMode(statusJson.holidays.authMode);
          }
        } catch {
          // Ignore malformed status response without blocking UI
        }
      }

      if (holidayResult.status === 'fulfilled') {
        try {
          const holidayJson = (await holidayResult.value.json()) as {
            source: 'live' | 'demo';
            authMode?: 'keyless-public' | 'optional-key-configured';
            rateLimited?: boolean;
            holidays?: PublicHoliday[];
          };
          if (Array.isArray(holidayJson.holidays)) {
            setHolidays(holidayJson.holidays);
          }
          setHolidaysSource(holidayJson.source ?? 'demo');
          setHolidaysRateLimited(Boolean(holidayJson.rateLimited));
          if (holidayJson.authMode) {
            setDataGovAuthMode(holidayJson.authMode);
          }
        } catch {
          // Non-blocking fallback
        }
      }

      if (weatherResult.status === 'fulfilled') {
        try {
          const weatherJson = (await weatherResult.value.json()) as WeatherApiState;
          setWeather(weatherJson);
          if (weatherJson.authMode) {
            setDataGovAuthMode(weatherJson.authMode);
          }
        } catch {
          // Non-blocking fallback
        }
      }
    };
    loadIntegrations();
    return () => {
      active = false;
    };
  }, []);

  const notify = useCallback(
    (title: string, description?: string, tone: 'success' | 'info' = 'success') => {
      const id = `${Date.now()}`;
      setToast({ id, title, description, tone });
      window.setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 4500);
    },
    []
  );

  const handleSetDemoStage = (stageNum: number) => {
    const clamped = Math.max(1, Math.min(DEMO_STAGES.length, stageNum));
    setDemoActive(true);
    setDemoStage(clamped);
    const info = DEMO_STAGES[clamped - 1];
    if (clamped === 1 || clamped === 2) {
      setActiveVolunteerId('vol-01');
    }
    setCurrentPage(info.targetPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLaunchDemo = (stage = 1) => {
    handleSetDemoStage(stage);
    notify(
      'Guided Demo Mode Launched',
      'Walk through Stages 1–5 using the top presentation toolbar.'
    );
  };

  const handleUpdateVolunteer = (updated: VolunteerProfile) => {
    setVolunteers((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  };

  const handleBookShift = (opportunityId: string) => {
    const opp = opportunities.find((o) => o.id === opportunityId);
    if (!opp) return;

    const alreadyBooked = bookings.some(
      (b) =>
        b.opportunityId === opportunityId &&
        b.volunteerId === activeVolunteer.id &&
        b.status !== 'Cancelled'
    );
    if (alreadyBooked) return;

    const isFull = opp.spotsFilled >= opp.spotsTotal;
    const status: AttendanceStatus = isFull ? 'Waitlisted' : 'Confirmed';

    const newBooking: ShiftBooking = {
      id: `book-${Date.now()}`,
      opportunityId,
      volunteerId: activeVolunteer.id,
      volunteerName: activeVolunteer.name,
      singpassVerified: activeVolunteer.singpassVerified,
      volunteerSkills: activeVolunteer.skills,
      bookedAt: '12 Nov 2026',
      status,
      hoursCredited: 0,
    };

    setBookings((prev) => [newBooking, ...prev]);
    if (!isFull) {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === opportunityId ? { ...o, spotsFilled: o.spotsFilled + 1 } : o))
      );
    }

    notify(
      status === 'Confirmed'
        ? `Registered ${activeVolunteer.name}: ${opp.title}`
        : `Added to waitlist: ${opp.title}`,
      `${opp.dateLabel} · ${opp.timeLabel} at ${opp.location}`
    );
  };

  const handleCancelBooking = (bookingId: string) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    const wasConfirmed = target.status === 'Confirmed';

    setBookings((prev) => {
      const updated = prev.map((b) =>
        b.id === bookingId ? { ...b, status: 'Cancelled' as AttendanceStatus } : b
      );
      if (wasConfirmed) {
        const waitlisted = updated.find(
          (b) => b.opportunityId === target.opportunityId && b.status === 'Waitlisted'
        );
        if (waitlisted) {
          return updated.map((b) =>
            b.id === waitlisted.id ? { ...b, status: 'Confirmed' as AttendanceStatus } : b
          );
        }
      }
      return updated;
    });

    if (wasConfirmed) {
      const hasWaitlist = bookings.some(
        (b) => b.opportunityId === target.opportunityId && b.status === 'Waitlisted'
      );
      if (!hasWaitlist) {
        setOpportunities((prev) =>
          prev.map((o) =>
            o.id === target.opportunityId
              ? {
                  ...o,
                  spotsFilled: Math.max(0, o.spotsFilled - 1),
                  urgency: 'Urgent Fill',
                }
              : o
          )
        );
      }
    }

    notify(
      'Registration cancelled',
      'Shift vacancy updated and flagged as needing a replacement.',
      'info'
    );
  };

  const handleSimulateCancellation = (opportunityId: string) => {
    const confirmedForOpp = bookings.find(
      (b) => b.opportunityId === opportunityId && b.status === 'Confirmed'
    );
    if (!confirmedForOpp) return;

    setBookings((prev) =>
      prev.map((b) =>
        b.id === confirmedForOpp.id ? { ...b, status: 'Cancelled' as AttendanceStatus } : b
      )
    );
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === opportunityId
          ? {
              ...o,
              spotsFilled: Math.max(0, o.spotsFilled - 1),
              urgency: 'Urgent Fill',
            }
          : o
      )
    );

    notify(
      `Shift vacancy alert: ${confirmedForOpp.volunteerName} cancelled`,
      'Shift now shows 1 vacancy and Needs Replacement. Click Rescue a Shift to find a match.',
      'info'
    );
  };

  const handleSendRescueInvitation = (
    opportunityId: string,
    candidate: VolunteerProfile,
    matchScore: number,
    matchReasons: string[]
  ) => {
    const opp = opportunities.find((o) => o.id === opportunityId);
    if (!opp) return;

    const newInvite: ShiftInvitation = {
      id: `inv-${Date.now()}`,
      opportunityId,
      volunteerId: candidate.id,
      volunteerName: candidate.name,
      charityName: opp.charityName,
      sentAt: 'Just now',
      matchScore,
      matchReasons,
      status: 'Pending',
    };

    setInvitations((prev) => [
      newInvite,
      ...prev.filter(
        (i) => !(i.opportunityId === opportunityId && i.volunteerId === candidate.id)
      ),
    ]);

    notify(
      `Rescue invitation sent to ${candidate.name}`,
      `Switch to ${candidate.name.split(' ')[0]}'s Volunteer view to accept the shift.`
    );
  };

  const handleRespondInvitation = (invitationId: string, accept: boolean) => {
    const invite = invitations.find((i) => i.id === invitationId);
    if (!invite) return;
    const opp = opportunities.find((o) => o.id === invite.opportunityId);
    const candidate = volunteers.find((v) => v.id === invite.volunteerId);
    if (!opp || !candidate) return;

    setInvitations((prev) =>
      prev.map((i) =>
        i.id === invitationId ? { ...i, status: accept ? 'Accepted' : 'Declined' } : i
      )
    );

    if (accept) {
      const newBooking: ShiftBooking = {
        id: `book-rescue-${Date.now()}`,
        opportunityId: opp.id,
        volunteerId: candidate.id,
        volunteerName: candidate.name,
        singpassVerified: candidate.singpassVerified,
        volunteerSkills: candidate.skills,
        bookedAt: 'Just now',
        status: 'Confirmed',
        hoursCredited: 0,
      };
      setBookings((prev) => [newBooking, ...prev]);
      setOpportunities((prev) =>
        prev.map((o) => {
          if (o.id !== opp.id) return o;
          const nextFilled = Math.min(o.spotsTotal, o.spotsFilled + 1);
          return {
            ...o,
            spotsFilled: nextFilled,
            urgency: nextFilled >= o.spotsTotal ? 'Normal' : o.urgency,
          };
        })
      );
      notify(
        `Shift Rescued by ${candidate.name}!`,
        `${opp.title} is now restored to ${Math.min(
          opp.spotsTotal,
          opp.spotsFilled + 1
        )}/${opp.spotsTotal} confirmed volunteers.`
      );
    } else {
      notify('Invitation declined', 'Charity coordinator can invite the next matched volunteer.', 'info');
    }
  };

  const handleCreateOpportunity = (newOppData: Omit<Opportunity, 'id' | 'spotsFilled'>) => {
    const created: Opportunity = {
      ...newOppData,
      id: `opp-${Date.now()}`,
      spotsFilled: 0,
    };
    setOpportunities((prev) => [created, ...prev]);
    notify('New volunteer shift published', `${created.title} is now live in Find My Mission.`);
  };

  const handleUpdateBookingStatus = (bookingId: string, nextStatus: AttendanceStatus) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    const opp = opportunities.find((o) => o.id === booking.opportunityId);
    const hours = nextStatus === 'Present' && opp ? opp.durationHours : booking.hoursCredited;

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: nextStatus, hoursCredited: hours } : b
      )
    );

    if (nextStatus === 'Present' && opp) {
      setVolunteers((prev) =>
        prev.map((v) =>
          v.id === booking.volunteerId
            ? {
                ...v,
                hoursLogged: v.hoursLogged + opp.durationHours,
                shiftsCompleted: v.shiftsCompleted + 1,
              }
            : v
        )
      );
    }

    if (nextStatus === 'Cancelled' && booking.status === 'Confirmed') {
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === booking.opportunityId
            ? { ...o, spotsFilled: Math.max(0, o.spotsFilled - 1), urgency: 'Urgent Fill' }
            : o
        )
      );
    }

    notify(`Roster updated: ${booking.volunteerName}`, `Status set to ${nextStatus}.`);
  };

  const handleCreateCampaign = (
    corporateId: string,
    campaignData: Omit<
      CorporateCampaign,
      'id' | 'registeredParticipants' | 'hoursCompleted' | 'status'
    >
  ) => {
    const created: CorporateCampaign = {
      ...campaignData,
      id: `camp-${Date.now()}`,
      registeredParticipants: 1,
      hoursCompleted: 0,
      status: 'Planned',
    };
    setCorporates((prev) =>
      prev.map((c) =>
        c.id === corporateId ? { ...c, campaigns: [created, ...c.campaigns] } : c
      )
    );
    notify('Planned corporate event created', `${created.title} added to upcoming CSR activities.`);
  };

  const handleResetDemo = () => {
    setVolunteers(VOLUNTEER_POOL);
    setActiveVolunteerId('vol-01');
    setOpportunities(INITIAL_OPPORTUNITIES);
    setBookings(INITIAL_BOOKINGS);
    setInvitations([]);
    setCorporates(INITIAL_CORPORATE_ORGS);
    if (demoActive) {
      setDemoStage(1);
      setCurrentPage('volunteers');
    }
    notify(
      'Demo data restored',
      '15 volunteers, 6 charities, 3 corporates, and 10/10 Eunos shift reset.'
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-slate-900">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />

      <DemoToolbar
        demoActive={demoActive}
        demoStage={demoStage}
        currentPage={currentPage}
        activeVolunteerId={activeVolunteerId}
        volunteers={volunteers}
        onSetStage={handleSetDemoStage}
        onNavigate={setCurrentPage}
        onSelectVolunteer={setActiveVolunteerId}
        onResetDemo={handleResetDemo}
        onExitDemo={() => setDemoActive(false)}
      />

      <main className="flex-1">
        {currentPage === 'home' && (
          <HomeView
            opportunities={opportunities}
            onNavigate={setCurrentPage}
            onLaunchDemo={() => handleLaunchDemo(1)}
            onNotify={(title, desc) => notify(title, desc)}
          />
        )}

        {currentPage === 'volunteers' && (
          <VolunteerDashboard
            volunteer={activeVolunteer}
            opportunities={opportunities}
            bookings={bookings}
            invitations={invitations}
            holidays={holidays}
            holidaysSource={holidaysSource}
            holidaysRateLimited={holidaysRateLimited}
            dataGovAuthMode={dataGovAuthMode}
            weather={weather}
            onUpdateVolunteer={handleUpdateVolunteer}
            onBookShift={handleBookShift}
            onCancelBooking={handleCancelBooking}
            onRespondInvitation={handleRespondInvitation}
            onNotify={(title, desc) => notify(title, desc)}
          />
        )}

        {currentPage === 'charities' && (
          <CharityDashboard
            charities={INITIAL_CHARITIES}
            opportunities={opportunities}
            bookings={bookings}
            invitations={invitations}
            volunteerPool={volunteers}
            holidays={holidays}
            onCreateOpportunity={handleCreateOpportunity}
            onUpdateBookingStatus={handleUpdateBookingStatus}
            onSimulateCancellation={handleSimulateCancellation}
            onSendRescueInvitation={handleSendRescueInvitation}
            onSwitchToVolunteer={(volId) => {
              setActiveVolunteerId(volId);
              setCurrentPage('volunteers');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNotify={(title, desc) => notify(title, desc)}
          />
        )}

        {currentPage === 'corporate' && (
          <CorporateDashboard
            corporates={corporates}
            showStage5Summary={demoActive && demoStage === 5}
            onCreateCampaign={handleCreateCampaign}
            onNotify={(title, desc) => notify(title, desc)}
          />
        )}

        {currentPage === 'pricing' && (
          <PricingView onNotify={(title, desc) => notify(title, desc)} />
        )}

        {currentPage === 'demo' && (
          <DemoPresentationView
            totalVolunteers={volunteers.length}
            totalCharities={INITIAL_CHARITIES.length}
            totalOpportunities={opportunities.length}
            totalBookings={bookings.filter((b) => b.status !== 'Cancelled').length}
            totalCorporates={corporates.length}
            onemapConfigured={onemapConfigured}
            holidaysSource={holidaysSource}
            holidaysRateLimited={holidaysRateLimited}
            weatherSource={weather.source}
            weatherRateLimited={Boolean(weather.rateLimited)}
            dataGovAuthMode={dataGovAuthMode}
            onStartGuidedDemo={handleLaunchDemo}
            onNavigate={setCurrentPage}
            onResetDemo={handleResetDemo}
          />
        )}
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
