import { Opportunity } from '../types';

function toIcsTimestamp(isoDate: string, time24: string): string {
  const cleanDate = isoDate.replace(/-/g, '');
  const cleanTime = time24.replace(':', '') + '00';
  return `${cleanDate}T${cleanTime}`;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function buildShiftIcsContent(opportunity: Opportunity, volunteerName: string): string {
  const dtStart = toIcsTimestamp(opportunity.isoDate, opportunity.startTime24);
  const dtEnd = toIcsTimestamp(opportunity.isoDate, opportunity.endTime24);
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `${opportunity.id}-${dtStart}@missionpossible.sg`;

  const description = [
    `Volunteer Shift: ${opportunity.title}`,
    `Organisation: ${opportunity.charityName} (UEN: ${opportunity.charityUen})`,
    `Volunteer: ${volunteerName}`,
    `Cause: ${opportunity.cause}`,
    `Notes: ${opportunity.description}`,
    `Booked via MissionPossible — The right volunteer. The right cause. The right time.`,
  ].join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MissionPossible//Volunteer Shift Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Asia/Singapore:${dtStart}`,
    `DTEND;TZID=Asia/Singapore:${dtEnd}`,
    `SUMMARY:${escapeIcsText(`MissionPossible: ${opportunity.title}`)}`,
    `LOCATION:${escapeIcsText(`${opportunity.location}, Singapore ${opportunity.postalCode}`)}`,
    `DESCRIPTION:${description}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function buildMultiShiftIcsContent(
  opportunities: Opportunity[],
  volunteerName: string
): string {
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const events = opportunities.map((opportunity) => {
    const dtStart = toIcsTimestamp(opportunity.isoDate, opportunity.startTime24);
    const dtEnd = toIcsTimestamp(opportunity.isoDate, opportunity.endTime24);
    const uid = `${opportunity.id}-${dtStart}@missionpossible.sg`;
    const description = [
      `Volunteer Shift: ${opportunity.title}`,
      `Organisation: ${opportunity.charityName} (UEN: ${opportunity.charityUen})`,
      `Volunteer: ${volunteerName}`,
      `Cause: ${opportunity.cause}`,
      `Notes: ${opportunity.description}`,
      `Booked via MissionPossible — The right volunteer. The right cause. The right time.`,
    ].join('\\n');

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;TZID=Asia/Singapore:${dtStart}`,
      `DTEND;TZID=Asia/Singapore:${dtEnd}`,
      `SUMMARY:${escapeIcsText(`MissionPossible: ${opportunity.title}`)}`,
      `LOCATION:${escapeIcsText(`${opportunity.location}, Singapore ${opportunity.postalCode}`)}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MissionPossible//Volunteer Shift Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadShiftIcs(opportunity: Opportunity, volunteerName: string): string {
  const content = buildShiftIcsContent(opportunity, volunteerName);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeSlug = opportunity.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const filename = `missionpossible-${safeSlug}.ics`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
}

export function downloadAllConfirmedIcs(
  opportunities: Opportunity[],
  volunteerName: string
): string {
  const content = buildMultiShiftIcsContent(opportunities, volunteerName);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = 'missionpossible-confirmed-schedule.ics';

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
}

