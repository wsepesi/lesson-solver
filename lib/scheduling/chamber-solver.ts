/**
 * Chamber Music Mutual Overlap Solver
 *
 * Unlike the CSP solver for individual lessons, this finds time slots
 * where ALL participants (leader + members) are simultaneously available.
 *
 * This is a simple intersection problem, not a constraint satisfaction problem.
 */

import type { WeekSchedule, TimeBlock, TimeSlot, DaySchedule } from './types';

// ============================================================================
// DEBUG LOGGING HELPERS
// ============================================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return `${hour12}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

function formatBlock(block: TimeBlock): string {
  return `${formatMinutes(block.start)} - ${formatMinutes(block.start + block.duration)} (${block.duration} min)`;
}

function logSchedule(label: string, schedule: WeekSchedule | null | undefined): void {
  if (!schedule) {
    console.log(`  ${label}: NO SCHEDULE (null/undefined)`);
    return;
  }
  if (!Array.isArray(schedule.days)) {
    console.log(`  ${label}: MALFORMED (no days array)`, schedule);
    return;
  }

  const daysWithBlocks = schedule.days.filter(d => d?.blocks?.length);
  if (daysWithBlocks.length === 0) {
    console.log(`  ${label}: EMPTY (no blocks on any day)`);
    return;
  }

  console.log(`  ${label}:`);
  for (const day of schedule.days) {
    if (day?.blocks?.length) {
      const blocksStr = day.blocks.map(formatBlock).join(', ');
      console.log(`    ${DAY_NAMES[day.dayOfWeek]}: ${blocksStr}`);
    }
  }
}

/**
 * Configuration for chamber music mutual overlap solving
 */
export type ChamberConfig = {
  leaderAvailability: WeekSchedule;
  participantAvailabilities: WeekSchedule[];
  rehearsalDuration: number; // Fixed duration in minutes
}

/**
 * Result of chamber music overlap calculation
 */
export type ChamberSolution = {
  mutualSlots: TimeSlot[];     // All valid meeting times
  selectedSlot?: TimeSlot;     // Chosen rehearsal time (if selected)
  metadata: {
    totalParticipants: number;
    participantsWithAvailability: number;
    computeTimeMs: number;
  }
}

/**
 * Find all time slots where all participants are available
 */
export function findMutualOverlap(config: ChamberConfig): ChamberSolution {
  const startTime = Date.now();

  console.group('🎵 Chamber Music Solver - Finding Mutual Overlap');
  console.log(`Rehearsal duration: ${config.rehearsalDuration} minutes`);

  // Combine leader with all participants
  const allAvailabilities: WeekSchedule[] = [
    config.leaderAvailability,
    ...config.participantAvailabilities
  ];

  console.log(`\n📋 INPUT: ${allAvailabilities.length} total participants`);
  logSchedule('Leader', config.leaderAvailability);
  config.participantAvailabilities.forEach((sched, i) => {
    logSchedule(`Participant ${i + 1}`, sched);
  });

  // Filter out empty or malformed schedules
  // Note: This filters people with NO availability across the week (haven't submitted form)
  // Day-level checking happens in findDayMutualOverlap
  const validAvailabilities = allAvailabilities.filter(schedule => {
    if (!schedule || !Array.isArray(schedule.days)) return false;
    return schedule.days.some(day => day?.blocks && day.blocks.length > 0);
  });

  const filteredCount = allAvailabilities.length - validAvailabilities.length;
  if (filteredCount > 0) {
    console.log(`\n⚠️ Filtered out ${filteredCount} participant(s) with no/malformed availability`);
  }

  // If no one has availability, return empty
  if (validAvailabilities.length === 0) {
    console.log('\n❌ RESULT: No valid availabilities - returning empty');
    console.groupEnd();
    return {
      mutualSlots: [],
      metadata: {
        totalParticipants: allAvailabilities.length,
        participantsWithAvailability: 0,
        computeTimeMs: Date.now() - startTime
      }
    };
  }

  console.log(`\n🔄 PROCESSING: Computing intersection for ${validAvailabilities.length} participants`);

  const mutualSlots: TimeSlot[] = [];

  // For each day of the week
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const daySchedules = validAvailabilities.map(a => a.days[dayOfWeek]);
    const dayMutualBlocks = findDayMutualOverlap(
      daySchedules,
      config.rehearsalDuration,
      DAY_NAMES[dayOfWeek] ?? `Day ${dayOfWeek}`
    );

    // Convert TimeBlocks to TimeSlots and add to result
    for (const block of dayMutualBlocks) {
      mutualSlots.push({
        dayOfWeek,
        startMinute: block.start,
        durationMinutes: config.rehearsalDuration
      });
    }
  }

  // Log final results
  console.log('\n✅ RESULT: Mutual Overlap Zones');
  if (mutualSlots.length === 0) {
    console.log('  No mutual overlap found on any day');
  } else {
    const slotsByDay = new Map<number, TimeSlot[]>();
    for (const slot of mutualSlots) {
      const existing = slotsByDay.get(slot.dayOfWeek) ?? [];
      existing.push(slot);
      slotsByDay.set(slot.dayOfWeek, existing);
    }

    for (const [day, slots] of slotsByDay) {
      // Merge for display
      const merged = mergeTimeBlocks(slots.map(s => ({ start: s.startMinute, duration: s.durationMinutes })));
      const mergedStr = merged.map(formatBlock).join(', ');
      console.log(`  ${DAY_NAMES[day]}: ${mergedStr}`);
    }
  }

  console.log(`\nCompute time: ${Date.now() - startTime}ms`);
  console.groupEnd();

  return {
    mutualSlots,
    metadata: {
      totalParticipants: allAvailabilities.length,
      participantsWithAvailability: validAvailabilities.length,
      computeTimeMs: Date.now() - startTime
    }
  };
}

/**
 * Find mutual overlap for a single day across all participants
 *
 * IMPORTANT: For mutual overlap, ALL participants must be available on this day.
 * If any participant has no availability on a given day, there is no mutual overlap.
 */
function findDayMutualOverlap(
  daySchedules: (DaySchedule | undefined)[],
  minDuration: number,
  dayName = 'Unknown'
): TimeBlock[] {
  // For mutual overlap, ALL participants must be available on this day
  // If any participant has no availability (undefined, no blocks, or malformed), return empty
  const unavailableIndices: number[] = [];
  for (let i = 0; i < daySchedules.length; i++) {
    const schedule = daySchedules[i];
    if (!schedule?.blocks?.length) {
      unavailableIndices.push(i);
    }
  }

  if (unavailableIndices.length > 0) {
    // Only log days where at least someone has availability (to reduce noise)
    const someoneAvailable = daySchedules.some(s => s?.blocks?.length);
    if (someoneAvailable) {
      const unavailableLabels = unavailableIndices.map(i => i === 0 ? 'Leader' : `Participant ${i}`);
      console.log(`  ${dayName}: ❌ No overlap (${unavailableLabels.join(', ')} unavailable)`);
    }
    return []; // Someone isn't available on this day = no mutual overlap
  }

  // All participants have blocks on this day - compute intersection
  const firstSchedule = daySchedules[0]!;
  let intersection = [...firstSchedule.blocks];

  console.log(`  ${dayName}: Computing intersection...`);
  console.log(`    Start with Person 0: ${intersection.map(formatBlock).join(', ')}`);

  for (let i = 1; i < daySchedules.length; i++) {
    const schedule = daySchedules[i]!;
    const personBlocks = schedule.blocks.map(formatBlock).join(', ');

    intersection = intersectTimeBlocks(intersection, schedule.blocks);

    if (intersection.length === 0) {
      console.log(`    ∩ Person ${i} [${personBlocks}] → ❌ No overlap remains`);
      break;
    } else {
      console.log(`    ∩ Person ${i} [${personBlocks}] → ${intersection.map(formatBlock).join(', ')}`);
    }
  }

  if (intersection.length === 0) {
    return [];
  }

  // Find all valid start times within the intersection blocks
  const slots = findSlotsWithDuration(intersection, minDuration);
  console.log(`    Final: ${slots.length} valid ${minDuration}-min slots`);

  return slots;
}

/**
 * Intersect two arrays of time blocks
 * Returns the overlapping portions
 */
function intersectTimeBlocks(a: TimeBlock[], b: TimeBlock[]): TimeBlock[] {
  const result: TimeBlock[] = [];

  for (const blockA of a) {
    for (const blockB of b) {
      const overlapStart = Math.max(blockA.start, blockB.start);
      const overlapEnd = Math.min(
        blockA.start + blockA.duration,
        blockB.start + blockB.duration
      );

      // Check if there's actual overlap
      if (overlapEnd > overlapStart) {
        result.push({
          start: overlapStart,
          duration: overlapEnd - overlapStart
        });
      }
    }
  }

  // Merge overlapping/adjacent blocks
  return mergeTimeBlocks(result);
}

/**
 * Merge overlapping or adjacent time blocks into continuous blocks
 */
function mergeTimeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  if (blocks.length === 0) return [];

  // Sort by start time
  const sorted = [...blocks].sort((a, b) => a.start - b.start);

  const firstBlock = sorted[0];
  if (!firstBlock) return [];

  const merged: TimeBlock[] = [firstBlock];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (!current || !last) continue;

    const lastEnd = last.start + last.duration;

    // Check if blocks overlap or are adjacent
    if (current.start <= lastEnd) {
      // Extend the last block
      const newEnd = Math.max(lastEnd, current.start + current.duration);
      last.duration = newEnd - last.start;
    } else {
      // No overlap, add as new block
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Generate all valid start times within blocks that can fit the required duration
 * Uses 15-minute granularity for start times
 */
function findSlotsWithDuration(blocks: TimeBlock[], minDuration: number, granularity = 15): TimeBlock[] {
  const slots: TimeBlock[] = [];

  for (const block of blocks) {
    // Only consider blocks that can fit the duration
    if (block.duration < minDuration) continue;

    // Generate start times at the specified granularity
    const maxStart = block.start + block.duration - minDuration;

    for (let start = block.start; start <= maxStart; start += granularity) {
      slots.push({
        start,
        duration: minDuration
      });
    }
  }

  return slots;
}

/**
 * Convert chamber solution to a WeekSchedule format for calendar display
 * Shows the mutual overlap zones (not individual slots)
 */
export function chamberSolutionToWeekSchedule(solution: ChamberSolution): WeekSchedule {
  const days: DaySchedule[] = [];

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const daySlots = solution.mutualSlots.filter(slot => slot.dayOfWeek === dayOfWeek);

    // Merge adjacent slots back into continuous blocks for display
    const blocks: TimeBlock[] = daySlots.map(slot => ({
      start: slot.startMinute,
      duration: slot.durationMinutes
    }));

    const mergedBlocks = mergeTimeBlocks(blocks);

    days.push({
      dayOfWeek,
      blocks: mergedBlocks
    });
  }

  return {
    days,
    timezone: 'local'
  };
}

/**
 * Check if a specific time slot is valid (within mutual overlap)
 */
export function isSlotValid(solution: ChamberSolution, dayOfWeek: number, startMinute: number, duration: number): boolean {
  return solution.mutualSlots.some(slot =>
    slot.dayOfWeek === dayOfWeek &&
    slot.startMinute <= startMinute &&
    slot.startMinute + slot.durationMinutes >= startMinute + duration
  );
}

/**
 * Find the nearest valid slot to a given position
 * Used for snap-to-valid behavior in the UI
 */
export function findNearestValidSlot(
  solution: ChamberSolution,
  targetDay: number,
  targetStart: number,
  duration: number
): TimeSlot | null {
  // Filter to slots that can fit the duration
  const validSlots = solution.mutualSlots.filter(
    slot => slot.durationMinutes >= duration
  );

  if (validSlots.length === 0) return null;

  const firstSlot = validSlots[0];
  if (!firstSlot) return null;

  // Find the nearest slot
  let nearest = firstSlot;
  let minDistance = calculateDistance(nearest, targetDay, targetStart);

  for (const slot of validSlots) {
    const distance = calculateDistance(slot, targetDay, targetStart);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = slot;
    }
  }

  return nearest;
}

/**
 * Calculate "distance" between a slot and target position
 * Prioritizes same-day matches, then considers time difference
 */
function calculateDistance(slot: TimeSlot, targetDay: number, targetStart: number): number {
  const dayDistance = Math.abs(slot.dayOfWeek - targetDay) * 10000; // Weight day difference heavily
  const timeDistance = Math.abs(slot.startMinute - targetStart);
  return dayDistance + timeDistance;
}
