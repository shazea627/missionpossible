export type PageView =
  | 'home'
  | 'volunteers'
  | 'calendar'
  | 'charities'
  | 'corporate'
  | 'pricing'
  | 'demo';

export type VolunteerSubTab =
  | 'discover'
  | 'calendar'
  | 'my-volunteering'
  | 'route-planner'
  | 'profile'
  | 'notifications';

export type AvailabilitySlot =
  | 'weekday-morning'
  | 'weekday-evening'
  | 'saturday-morning'
  | 'saturday-afternoon'
  | 'sunday-morning'
  | 'sunday-afternoon'
  | 'public-holiday';

export type District = 'Central' | 'East' | 'North-East' | 'North' | 'West';

export type CauseCategory =
  | 'Food Distribution'
  | 'Elderly Companionship'
  | 'Beach Cleanup'
  | 'Tutoring Children'
  | 'Animal Shelter Support'
  | 'Community Gardening';

export type TravelMode = 'pt' | 'drive' | 'walk' | 'cycle';

export type CharityVerificationStatus =
  | 'Authoritatively Verified'
  | 'Pending Verification'
  | 'Unverified';

export interface StartingLocation {
  postalCode: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  source: 'live' | 'demo';
}

export interface VolunteerProfile {
  id: string;
  name: string;
  email: string;
  isDemoData: boolean;
  singpassVerified: boolean;
  singpassTier: 'MyInfo Verified';
  district: District;
  startingLocation: StartingLocation;
  travelMode: TravelMode;
  maxTravelMinutes: number;
  preferredDuration: 'any' | 'short' | 'medium' | 'long';
  availability: AvailabilitySlot[];
  skills: string[];
  causes: CauseCategory[];
  hoursLogged: number;
  shiftsCompleted: number;
  reliabilityRate: number;
}

export interface Opportunity {
  id: string;
  title: string;
  charityId: string;
  charityName: string;
  charityUen: string;
  charityVerificationStatus: CharityVerificationStatus;
  cause: CauseCategory;
  district: District;
  location: string;
  postalCode: string;
  lat: number;
  lng: number;
  isoDate: string;
  dateLabel: string;
  timeLabel: string;
  startTime24: string;
  endTime24: string;
  slot: AvailabilitySlot;
  durationHours: number;
  requiredSkills: string[];
  spotsTotal: number;
  spotsFilled: number;
  urgency: 'Normal' | 'Urgent Fill';
  isOutdoor: boolean;
  corporateFriendly: boolean;
  commitmentType?: 'One-time' | 'Recurring';
  description: string;
}

export type AttendanceStatus = 'Confirmed' | 'Waitlisted' | 'Present' | 'No-Show' | 'Cancelled';

export interface ShiftBooking {
  id: string;
  opportunityId: string;
  volunteerId: string;
  volunteerName: string;
  singpassVerified: boolean;
  volunteerSkills: string[];
  bookedAt: string;
  status: AttendanceStatus;
  hoursCredited: number;
  attendanceConfirmed?: boolean;
  attendanceConfirmedAt?: string;
}

export interface ShiftInvitation {
  id: string;
  opportunityId: string;
  volunteerId: string;
  volunteerName: string;
  charityName: string;
  sentAt: string;
  matchScore: number;
  matchReasons: string[];
  status: 'Pending' | 'Accepted' | 'Declined';
}

export interface CharityOrg {
  id: string;
  name: string;
  uen: string;
  isDemoData: boolean;
  ipcStatus: boolean;
  verificationStatus: CharityVerificationStatus;
  verifiedAt?: string;
  verificationNote: string;
  district: District;
  primaryCause: CauseCategory;
  plan: 'Core Free' | 'Charity Management Pro';
  activeVolunteers: number;
  monthlyUnfilledReduction: number;
  donationsTrackedSgd: number;
}

export interface CorporateCampaign {
  id: string;
  title: string;
  charityName: string;
  cause: CauseCategory;
  dateLabel: string;
  departmentScope: string;
  targetParticipants: number;
  registeredParticipants: number;
  hoursCompleted: number;
  status: 'Active' | 'Completed' | 'Planned';
}

export interface DepartmentStat {
  department: string;
  headcount: number;
  participants: number;
  hoursLogged: number;
  participationRate: number;
  topCause: CauseCategory;
}

export interface CorporateOrg {
  id: string;
  name: string;
  isDemoData: boolean;
  sector: string;
  enrolledEmployees: number;
  plan: 'Corporate Annual' | 'Enterprise Services';
  campaigns: CorporateCampaign[];
  departments: DepartmentStat[];
  monthlyHours: { month: string; hours: number }[];
}

export interface MatchResult {
  score: number;
  availabilityMatch: boolean;
  holidayMatch: boolean;
  travelMatch: boolean;
  travelMinutes: number | null;
  distanceKm?: number;
  matchedSkills: string[];
  causeMatch: boolean;
  districtMatch: boolean;
  reasons: string[];
}

export interface PublicHoliday {
  date: string;
  day: string;
  holiday: string;
}

export interface WeatherForecastDay {
  date: string;
  day: string;
  forecast: string;
  tempLow: number | null;
  tempHigh: number | null;
  humidityLow: number | null;
  humidityHigh: number | null;
  disruptionRisk: boolean;
}

export interface WeatherApiState {
  source: 'live' | 'unavailable';
  authMode?: 'keyless-public' | 'optional-key-configured';
  rateLimited?: boolean;
  updatedAt?: string;
  supportedRange: { startDate: string; endDate: string } | null;
  twentyFourHourSummary?: string | null;
  forecasts: WeatherForecastDay[];
  error?: string;
}

export interface TravelEstimate {
  minutes: number | null;
  distanceKm: number;
  source: 'live' | 'unavailable';
}

export interface OneMapSearchResult {
  postal: string;
  building: string;
  address: string;
  lat: number;
  lng: number;
  district?: string;
}

export interface RouteInstruction {
  step: string;
  distanceText?: string;
  mode?: string;
}

export interface RoutePlanResult {
  source: 'live' | 'unavailable';
  mode: TravelMode;
  minutes: number | null;
  distanceKm: number;
  instructions: RouteInstruction[];
  polyline: [number, number][];
  transitSummary?: string;
  rateLimited?: boolean;
  reason?: string;
}

export interface AvailabilityOverride {
  date: string;
  status: 'available' | 'unavailable';
  timeWindows?: ('morning' | 'afternoon' | 'evening')[];
  note?: string;
}

export type ReminderOffset = '24h' | '3h' | '1h';

export interface NotificationPreferences {
  whatsappEnabled: boolean;
  inAppEnabled: boolean;
  consentAccepted: boolean;
  demoContactLabel: string;
  reminderOffsets: ReminderOffset[];
  departureRemindersEnabled: boolean;
  departureBufferMinutes: 10 | 15 | 30;
  lastMinuteAlertsEnabled: boolean;
  cancellationAlertsEnabled: boolean;
}

export interface NotificationLogEntry {
  id: string;
  timestampSg: string;
  channel: 'WhatsApp (Simulated)' | 'In-App' | 'Charity Alert';
  title: string;
  summary: string;
  opportunityId?: string;
  status: 'Simulated' | 'Delivered in App' | 'Confirmed';
}

export interface ScheduleConflict {
  booking: ShiftBooking;
  opportunity: Opportunity;
  type: 'overlap' | 'tight-transition';
  gapMinutes?: number;
  requiredTravelMinutes?: number;
  message: string;
}

