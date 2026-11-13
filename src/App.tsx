/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CharityDashboard } from './components/CharityDashboard';
import { CorporateDashboard } from './components/CorporateDashboard';
import { DemoPresentationView } from './components/DemoPresentationView';
import {
  DEMO_STAGES,
  DemoSequenceType,
  DemoToolbar,
  VOLUNTEER_JOURNEY_STAGES,
} from './components/DemoToolbar';
import { HomeView } from './components/HomeView';
import { Navbar } from './components/Navbar';
import { PricingView } from './components/PricingView';
import { Toast, ToastMessage } from './components/Toast';
import { VolunteerDashboard } from './components/VolunteerDashboard';
import { WhatsAppReminderModal } from './components/WhatsAppReminderModal';
import {
  INITIAL_BOOKINGS,
  INITIAL_CHARITIES,
  INITIAL_CORPORATE_ORGS,
  INITIAL_OPPORTUNITIES,
  VOLUNTEER_POOL,
} from './data/mockData';
import {
  AttendanceStatus,
  AvailabilityOverride,
  CorporateCampaign,
  CorporateOrg,
  NotificationLogEntry,
  NotificationPreferences,
  Opportunity,
  PageView,
  PublicHoliday,
  ShiftBooking,
  ShiftInvitation,
  VolunteerProfile,
  VolunteerSubTab,
  WeatherApiState,
} from './types';
import {
  createNotificationLogEntry,
  DEFAULT_NOTIFICATION_PREFERENCES,
  WhatsAppReminderPayload,
} from './utils/notifications';
import { getSingaporeNowTimeLabel } from './utils/time';

const STORAGE_KEY = 'missionpossible_demo_state_v1';

const PAGE_TITLES: Record<PageView, string> = {
  home: 'MissionPossible — The right volunteer. The right cause. The right time.',
  volunteers: 'Volunteer Portal — MissionPossible',
  calendar: 'My Calendar — MissionPossible',
  charities: 'Charity Workspace — MissionPossible',
  corporate: 'Corporate CSR Portal — MissionPossible',
  pricing: 'Pricing & Plans — MissionPossible',
  demo: 'Demo Mode & Pitch Deck — MissionPossible',
};

interface PersistedState {
  volunteers: VolunteerProfile[];
  activeVolunteerId: string;
  opportunities: Opportunity[];
  bookings: ShiftBooking[];
  invitations: ShiftInvitation[];
  corporates: CorporateOrg[];
  availabilityOverrides: Record<string, AvailabilityOverride>;
  notificationPreferences: NotificationPreferences;
  notificationLog: NotificationLogEntry[];
}

function loadPersistedState(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      volunteers: Array.isArray(parsed.volunteers) ? parsed.volunteers : VOLUNTEER_POOL,
      activeVolunteerId:
        typeof parsed.activeVolunteerId === 'string' ? parsed.activeVolunteerId : 'vol-01',
      opportunities: Array.isArray(parsed.opportunities)
        ? parsed.opportunities
        : INITIAL_OPPORTUNITIES,
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : INITIAL_BOOKINGS,
      invitations: Array.isArray(parsed.invitations) ? parsed.invitations : [],
      corporates: Array.isArray(parsed.corporates) ? parsed.corporates : INITIAL_CORPORATE_ORGS,
      availabilityOverrides:
        parsed.availabilityOverrides && typeof parsed.availabilityOverrides === 'object'
          ? parsed.availabilityOverrides
          : {},
      notificationPreferences:
        parsed.notificationPreferences && typeof parsed.notificationPreferences === 'object'
          ? { ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed.notificationPreferences }
          : DEFAULT_NOTIFICATION_PREFERENCES,
      notificationLog: Array.isArray(parsed.notificationLog) ? parsed.notificationLog : [],
    };
  } catch {
    return null;
  }
}

function isPresentationUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.pathname === '/presentation' ||
    window.location.hash === '#/presentation'
  );
}

export default function App() {
  const initialPersisted = useMemo(() => loadPersistedState(), []);

  const [currentPage, setCurrentPage] = useState<PageView>(() =>
    isPresentationUrl() ? 'demo' : 'home'
  );
  const [activeVolunteerTab, setActiveVolunteerTab] = useState<VolunteerSubTab>('discover');
  const [routePlannerOppId, setRoutePlannerOppId] = useState<string | null>(null);
  const [activeReminderModal, setActiveReminderModal] = useState<WhatsAppReminderPayload | null>(
    null
  );

  const [demoActive, setDemoActive] = useState(false);
  const [demoSequence, setDemoSequence] = useState<DemoSequenceType>('volunteer-journey');
  const [demoStage, setDemoStage] = useState(1);

  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>(
    () => initialPersisted?.volunteers ?? VOLUNTEER_POOL
  );
  const [activeVolunteerId, setActiveVolunteerId] = useState<string>(
    () => initialPersisted?.activeVolunteerId ?? 'vol-01'
  );
  const [opportunities, setOpportunities] = useState<Opportunity[]>(
    () => initialPersisted?.opportunities ?? INITIAL_OPPORTUNITIES
  );
  const [bookings, setBookings] = useState<ShiftBooking[]>(
    () => initialPersisted?.bookings ?? INITIAL_BOOKINGS
  );
  const [invitations, setInvitations] = useState<ShiftInvitation[]>(
    () => initialPersisted?.invitations ?? []
  );
  const [corporates, setCorporates] = useState<CorporateOrg[]>(
    () => initialPersisted?.corporates ?? INITIAL_CORPORATE_ORGS
  );
  const [availabilityOverrides, setAvailabilityOverrides] = useState<
    Record<string, AvailabilityOverride>
  >(() => initialPersisted?.availabilityOverrides ?? {});
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    () => initialPersisted?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [notificationLog, setNotificationLog] = useState<NotificationLogEntry[]>(
    () => initialPersisted?.notificationLog ?? []
  );
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
    const onPopState = () => {
      setCurrentPage((prev) => {
        if (isPresentationUrl()) return 'demo';
        return prev === 'demo' ? 'home' : prev;
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    try {
      const payload: PersistedState = {
        volunteers,
        activeVolunteerId,
        opportunities,
        bookings,
        invitations,
        corporates,
        availabilityOverrides,
        notificationPreferences,
        notificationLog: notificationLog.slice(0, 40),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [
    volunteers,
    activeVolunteerId,
    opportunities,
    bookings,
    invitations,
    corporates,
    availabilityOverrides,
    notificationPreferences,
    notificationLog,
  ]);

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

  const handleNavigate = useCallback((page: PageView) => {
    setCurrentPage(page);
    if (page === 'calendar') {
      setActiveVolunteerTab('calendar');
    } else if (page === 'volunteers') {
      setActiveVolunteerTab((prev) => (prev === 'calendar' ? 'discover' : prev));
    }
    if (page === 'demo' && window.location.pathname !== '/presentation') {
      window.history.pushState({}, '', '/presentation');
    } else if (page !== 'demo' && window.location.pathname === '/presentation') {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectVolunteerSubTab = useCallback((tab: VolunteerSubTab) => {
    const resolved: VolunteerSubTab = tab === 'notifications' ? 'profile' : tab;
    setActiveVolunteerTab(resolved);
    setCurrentPage(resolved === 'calendar' ? 'calendar' : 'volunteers');
    if (window.location.pathname === '/presentation') {
      window.history.pushState({}, '', '/');
    }
  }, []);

  const handleOpenRoutePlanner = useCallback((oppId: string) => {
    setRoutePlannerOppId(oppId);
    setActiveVolunteerTab('route-planner');
    setCurrentPage('volunteers');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSetDemoStage = useCallback(
    (stageNum: number, seqOverride?: DemoSequenceType) => {
      const targetSeq = seqOverride ?? demoSequence;
      const stages =
        targetSeq === 'volunteer-journey' ? VOLUNTEER_JOURNEY_STAGES : DEMO_STAGES;
      const clamped = Math.max(1, Math.min(stages.length, stageNum));
      const info = stages[clamped - 1];

      setDemoActive(true);
      setDemoSequence(targetSeq);
      setDemoStage(clamped);

      if (targetSeq === 'volunteer-journey') {
        if (clamped <= 5) {
          setActiveVolunteerId('vol-01');
        }
        if (clamped === 4) {
          setRoutePlannerOppId('opp-02');
        }
      } else if (clamped === 1 || clamped === 2) {
        setActiveVolunteerId('vol-01');
      }

      if (info.targetSubTab) {
        setActiveVolunteerTab(info.targetSubTab);
      }
      setCurrentPage(info.targetPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [demoSequence]
  );

  const handleChangeDemoSequence = useCallback(
    (seq: DemoSequenceType) => {
      handleSetDemoStage(1, seq);
    },
    [handleSetDemoStage]
  );

  const handleLaunchDemo = useCallback(
    (stage = 1, seq: DemoSequenceType = 'volunteer-journey') => {
      handleSetDemoStage(stage, seq);
      notify(
        seq === 'volunteer-journey'
          ? '6-Step Volunteer Journey Launched'
          : '5-Stage Charity Rescue Pitch Launched',
        'Use Previous Step / Next Step in the top presentation toolbar.'
      );
    },
    [handleSetDemoStage, notify]
  );

  const handleUpdateVolunteer = (updated: VolunteerProfile) => {
    setVolunteers((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  };

  const handleUpdateAvailabilityOverride = (
    date: string,
    override: AvailabilityOverride | null
  ) => {
    setAvailabilityOverrides((prev) => {
      const next = { ...prev };
      if (!override) {
        delete next[date];
      } else {
        next[date] = override;
      }
      return next;
    });
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
      bookedAt: getSingaporeNowTimeLabel(),
      status,
      hoursCredited: 0,
    };

    setBookings((prev) => [newBooking, ...prev]);
    if (!isFull) {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === opportunityId ? { ...o, spotsFilled: o.spotsFilled + 1 } : o))
      );
    }

    if (notificationPreferences.inAppEnabled) {
      setNotificationLog((prev) => [
        createNotificationLogEntry({
          channel: 'In-App',
          title:
            status === 'Confirmed'
              ? `Shift confirmed: ${opp.title}`
              : `Waitlisted: ${opp.title}`,
          summary: `${opp.dateLabel} · ${opp.timeLabel} at ${opp.location} (S${opp.postalCode})`,
          opportunityId: opp.id,
          status: 'Delivered in App',
        }),
        ...prev,
      ]);
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

    const opp = opportunities.find((o) => o.id === target.opportunityId);
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

    if (notificationPreferences.cancellationAlertsEnabled && opp) {
      setNotificationLog((prev) => [
        createNotificationLogEntry({
          channel: 'Charity Alert',
          title: `Cancellation alert: ${target.volunteerName}`,
          summary: `Withdrew from ${opp.title} (${opp.dateLabel}). Charity coordinator alerted for Rescue a Shift.`,
          opportunityId: opp.id,
          status: 'Delivered in App',
        }),
        ...prev,
      ]);
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
    const opp = opportunities.find((o) => o.id === opportunityId);

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

    if (notificationPreferences.cancellationAlertsEnabled && opp) {
      setNotificationLog((prev) => [
        createNotificationLogEntry({
          channel: 'Charity Alert',
          title: `Volunteer cancellation: ${confirmedForOpp.volunteerName}`,
          summary: `${opp.title} dropped by 1 confirmed volunteer and needs replacement.`,
          opportunityId: opp.id,
          status: 'Delivered in App',
        }),
        ...prev,
      ]);
    }

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

    if (notificationPreferences.lastMinuteAlertsEnabled) {
      setNotificationLog((prev) => [
        createNotificationLogEntry({
          channel: 'WhatsApp (Simulated)',
          title: `Rescue alert queued for ${candidate.name}`,
          summary: `${opp.title} (${matchScore}% match) invitation delivered.`,
          opportunityId: opp.id,
          status: 'Simulated',
        }),
        ...prev,
      ]);
    }

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

  const handleSimulateReminder = (payload: WhatsAppReminderPayload) => {
    setNotificationLog((prev) => [
      createNotificationLogEntry({
        channel: 'WhatsApp (Simulated)',
        title: `Simulated reminder · ${payload.opportunity.title}`,
        summary: `${payload.offsetLabel} · ${payload.suggestedDepartureLabel}`,
        opportunityId: payload.opportunity.id,
        status: 'Simulated',
      }),
      ...prev,
    ]);
    setActiveReminderModal(payload);
  };

  const handleConfirmAttendanceByBookingId = (bookingId: string) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;
    const opp = opportunities.find((o) => o.id === target.opportunityId);
    const confirmedAt = getSingaporeNowTimeLabel();

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, attendanceConfirmed: true, attendanceConfirmedAt: confirmedAt }
          : b
      )
    );

    setNotificationLog((prev) => [
      createNotificationLogEntry({
        channel: 'In-App',
        title: `Attendance confirmed · ${opp?.title ?? target.opportunityId}`,
        summary: `${target.volunteerName} confirmed pre-shift attendance at ${confirmedAt} SGT. Charity roster updated.`,
        opportunityId: target.opportunityId,
        status: 'Confirmed',
      }),
      ...prev,
    ]);

    notify(
      'Attendance confirmed',
      `${target.volunteerName}'s roster status updated for both Volunteer & Charity dashboards.`
    );
  };

  const handleConfirmAttendanceByOppId = (oppId: string) => {
    const match = bookings.find(
      (b) =>
        b.opportunityId === oppId &&
        b.volunteerId === activeVolunteer.id &&
        b.status === 'Confirmed'
    );
    if (!match) {
      notify(
        'No confirmed booking found',
        'Register for this mission first to confirm attendance.',
        'info'
      );
      return;
    }
    handleConfirmAttendanceByBookingId(match.id);
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
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    setVolunteers(VOLUNTEER_POOL);
    setActiveVolunteerId('vol-01');
    setOpportunities(INITIAL_OPPORTUNITIES);
    setBookings(INITIAL_BOOKINGS);
    setInvitations([]);
    setCorporates(INITIAL_CORPORATE_ORGS);
    setAvailabilityOverrides({});
    setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
    setNotificationLog([]);
    setRoutePlannerOppId(null);
    setActiveReminderModal(null);
    if (demoActive) {
      setDemoStage(1);
      setActiveVolunteerTab('discover');
      setCurrentPage('volunteers');
    }
    notify(
      'Demo data restored',
      'All volunteers, shifts, calendar overrides, and notification preferences reset.'
    );
  };

  const modalOppConfirmed = useMemo(() => {
    if (!activeReminderModal) return false;
    return bookings.some(
      (b) =>
        b.opportunityId === activeReminderModal.opportunity.id &&
        b.volunteerId === activeVolunteer.id &&
        b.status === 'Confirmed' &&
        Boolean(b.attendanceConfirmed)
    );
  }, [activeReminderModal, bookings, activeVolunteer.id]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-slate-900">
      <Navbar
        currentPage={currentPage}
        activeVolunteerTab={activeVolunteerTab}
        onNavigate={handleNavigate}
        onSelectVolunteerTab={handleSelectVolunteerSubTab}
      />

      <DemoToolbar
        demoActive={demoActive}
        demoSequence={demoSequence}
        demoStage={demoStage}
        currentPage={currentPage}
        activeVolunteerId={activeVolunteerId}
        volunteers={volunteers}
        onChangeSequence={handleChangeDemoSequence}
        onSetStage={handleSetDemoStage}
        onNavigate={handleNavigate}
        onSelectVolunteer={setActiveVolunteerId}
        onResetDemo={handleResetDemo}
        onExitDemo={() => {
          setDemoActive(false);
          handleNavigate('home');
        }}
      />

      <main className="flex-1">
        {currentPage === 'home' && (
          <HomeView
            opportunities={opportunities}
            onNavigate={handleNavigate}
            onOpenVolunteerTab={handleSelectVolunteerSubTab}
            onNotify={(title, desc) => notify(title, desc)}
          />
        )}

        {(currentPage === 'volunteers' || currentPage === 'calendar') && (
          <VolunteerDashboard
            volunteer={activeVolunteer}
            allVolunteers={volunteers}
            onSelectVolunteer={setActiveVolunteerId}
            opportunities={opportunities}
            bookings={bookings}
            invitations={invitations}
            holidays={holidays}
            holidaysSource={holidaysSource}
            holidaysRateLimited={holidaysRateLimited}
            dataGovAuthMode={dataGovAuthMode}
            weather={weather}
            activeSubTab={activeVolunteerTab}
            onSelectSubTab={handleSelectVolunteerSubTab}
            routePlannerOppId={routePlannerOppId}
            onOpenRoutePlanner={handleOpenRoutePlanner}
            availabilityOverrides={availabilityOverrides}
            onUpdateAvailabilityOverride={handleUpdateAvailabilityOverride}
            notificationPreferences={notificationPreferences}
            notificationLog={notificationLog}
            onUpdateNotificationPreferences={setNotificationPreferences}
            onSimulateReminder={handleSimulateReminder}
            onConfirmAttendanceByBookingId={handleConfirmAttendanceByBookingId}
            onConfirmAttendanceByOppId={handleConfirmAttendanceByOppId}
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
              setActiveVolunteerTab('discover');
              setCurrentPage('volunteers');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNotify={(title, desc) => notify(title, desc)}
          />
        )}

        {currentPage === 'corporate' && (
          <CorporateDashboard
            corporates={corporates}
            showStage5Summary={
              demoActive && demoSequence === 'charity-rescue' && demoStage === 5
            }
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
            onNavigate={handleNavigate}
            onResetDemo={handleResetDemo}
          />
        )}
      </main>

      <WhatsAppReminderModal
        payload={activeReminderModal}
        isAttendanceConfirmed={modalOppConfirmed}
        onClose={() => setActiveReminderModal(null)}
        onViewMission={() => {
          setActiveReminderModal(null);
          setActiveVolunteerTab('my-volunteering');
          setCurrentPage('volunteers');
        }}
        onPlanJourney={(oppId) => {
          setActiveReminderModal(null);
          handleOpenRoutePlanner(oppId);
        }}
        onConfirmAttendance={(oppId) => {
          handleConfirmAttendanceByOppId(oppId);
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
