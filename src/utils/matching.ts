import {
  AvailabilitySlot,
  MatchResult,
  Opportunity,
  PublicHoliday,
  TravelEstimate,
  VolunteerProfile,
} from '../types';

export const SLOT_LABELS: Record<AvailabilitySlot, string> = {
  'weekday-morning': 'Weekday Mornings',
  'weekday-evening': 'Weekday Evenings',
  'saturday-morning': 'Saturday Mornings',
  'saturday-afternoon': 'Saturday Afternoons',
  'sunday-morning': 'Sunday Mornings',
  'sunday-afternoon': 'Sunday Afternoons',
  'public-holiday': 'Public Holidays',
};

export function calculateMatchScore(
  volunteer: VolunteerProfile,
  opportunity: Opportunity,
  travelEstimate?: TravelEstimate,
  holidays: PublicHoliday[] = []
): MatchResult {
  const matchingHoliday = holidays.find((h) => h.date === opportunity.isoDate);
  const holidayMatch = Boolean(matchingHoliday);
  const availabilityMatch =
    volunteer.availability.includes(opportunity.slot) ||
    (holidayMatch && volunteer.availability.includes('public-holiday'));

  const matchedSkills = opportunity.requiredSkills.filter((skill) =>
    volunteer.skills.some((vSkill) => vSkill.toLowerCase() === skill.toLowerCase())
  );
  const causeMatch = volunteer.causes.includes(opportunity.cause);
  const districtMatch = volunteer.district === opportunity.district;

  const travelMinutes = travelEstimate?.minutes ?? null;
  const distanceKm = travelEstimate?.distanceKm;

  // Travel convenience check: uses live OneMap travel minutes if available, otherwise uses distance proximity
  const travelMatch =
    travelMinutes !== null
      ? travelMinutes <= volunteer.maxTravelMinutes
      : typeof distanceKm === 'number'
      ? distanceKm <= (volunteer.maxTravelMinutes <= 15 ? 3 : volunteer.maxTravelMinutes <= 30 ? 7 : volunteer.maxTravelMinutes <= 45 ? 12 : 20)
      : districtMatch;

  // Weighted scoring:
  // Availability / Holiday (35%), Location & Travel Convenience (25%), Skills (20%), Cause Affinity (15%), District (5%)
  let score = 0;
  const reasons: string[] = [];

  if (availabilityMatch) {
    score += 35;
    if (holidayMatch && matchingHoliday) {
      reasons.push(`Public holiday match (${matchingHoliday.holiday})`);
    } else {
      reasons.push(`Fits ${SLOT_LABELS[opportunity.slot]}`);
    }
  }

  if (travelMinutes !== null) {
    if (travelMinutes <= 15) {
      score += 25;
      reasons.push(`${travelMinutes} min via OneMap routing`);
    } else if (travelMinutes <= volunteer.maxTravelMinutes) {
      score += 19;
      reasons.push(`${travelMinutes} min (within ${volunteer.maxTravelMinutes} min limit)`);
    } else if (travelMinutes <= volunteer.maxTravelMinutes + 15) {
      score += 9;
    } else {
      score += 3;
    }
  } else if (typeof distanceKm === 'number') {
    if (distanceKm <= 3.5) {
      score += 23;
      reasons.push(`${distanceKm} km from ${volunteer.startingLocation.label}`);
    } else if (distanceKm <= 7.5) {
      score += 17;
      reasons.push(`${distanceKm} km away (${opportunity.district})`);
    } else if (distanceKm <= 12) {
      score += 10;
    } else {
      score += 4;
    }
  } else if (districtMatch) {
    score += 18;
    reasons.push(`Same district (${opportunity.district})`);
  }

  if (opportunity.requiredSkills.length === 0) {
    score += 20;
    reasons.push('Open to all skill levels');
  } else {
    const skillRatio = matchedSkills.length / opportunity.requiredSkills.length;
    score += Math.round(20 * skillRatio);
    if (matchedSkills.length > 0) {
      reasons.push(`Skills: ${matchedSkills.join(', ')}`);
    }
  }

  if (causeMatch) {
    score += 15;
    reasons.push(`Cause interest: ${opportunity.cause}`);
  }

  if (districtMatch) {
    score += 5;
  }

  return {
    score: Math.min(100, Math.max(12, score)),
    availabilityMatch,
    holidayMatch,
    travelMatch,
    travelMinutes,
    distanceKm,
    matchedSkills,
    causeMatch,
    districtMatch,
    reasons,
  };
}
