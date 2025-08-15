/**
 * Flexible Time Utilities for Lesson Scheduling
 * 
 * This module provides a flexible time representation system to replace
 * the current boolean grid constraints. Supports minute-level precision,
 * variable time ranges, and timezone handling.
 */

// ISO time string format: "HH:MM" (24-hour)
export type TimeString = string;

// ISO date string format: "YYYY-MM-DD"
export type DateString = string;

// ISO datetime string format: "YYYY-MM-DDTHH:MM:SS"
export type DateTimeString = string;

export interface TimeSlot {
  startTime: TimeString;
  endTime: TimeString;
  date?: DateString;
}

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  endDate?: DateString;
  exceptions?: DateString[];
}

export interface FlexibleScheduleItem {
  id: string;
  timeSlot: TimeSlot;
  recurrence?: RecurrenceRule;
  metadata?: Record<string, unknown>;
}

/**
 * Parse various time string formats into normalized "HH:MM" format
 * Supports: "9:00", "09:00", "9am", "9:00 AM", "21:30"
 */
export function parseTimeString(time: string): TimeString {
  const cleaned = time.trim().toLowerCase();
  
  // Handle AM/PM format
  const amPmRegex = /^(\d{1,2}):?(\d{0,2})\s*(am|pm)$/;
  const amPmMatch = amPmRegex.exec(cleaned);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1]!);
    const minutes = amPmMatch[2] ? parseInt(amPmMatch[2]) : 0;
    const period = amPmMatch[3]!;
    
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // Handle 24-hour format
  const twentyFourRegex = /^(\d{1,2}):(\d{2})$/;
  const twentyFourMatch = twentyFourRegex.exec(cleaned);
  if (twentyFourMatch) {
    const hours = parseInt(twentyFourMatch[1]!);
    const minutes = parseInt(twentyFourMatch[2]!);
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  
  // Handle hour only format (e.g., "9", "21")
  const hourRegex = /^(\d{1,2})$/;
  const hourMatch = hourRegex.exec(cleaned);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1]!);
    if (hours >= 0 && hours <= 23) {
      return `${hours.toString().padStart(2, '0')}:00`;
    }
  }
  
  throw new Error(`Invalid time format: ${time}`);
}

/**
 * Convert TimeString to total minutes since midnight
 */
export function timeToMinutes(time: TimeString): number {
  const [hours, minutes] = time.split(':').map(Number);
  if (hours! < 0 || hours! > 23 || minutes! < 0 || minutes! > 59) {
    throw new Error(`Invalid time: ${time}`);
  }
  return hours! * 60 + minutes!;
}

/**
 * Convert minutes since midnight to TimeString
 */
export function minutesToTime(minutes: number): TimeString {
  if (minutes < 0 || minutes >= 24 * 60) {
    throw new Error(`Invalid minutes: ${minutes}`);
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Add minutes to a TimeString
 */
export function addMinutes(time: TimeString, minutes: number): TimeString {
  const totalMinutes = timeToMinutes(time) + minutes;
  // Handle day overflow by wrapping to next day
  const dayMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  return minutesToTime(dayMinutes);
}

/**
 * Get the difference in minutes between two TimeStrings
 */
export function getTimeDifference(start: TimeString, end: TimeString): number {
  let endMinutes = timeToMinutes(end);
  const startMinutes = timeToMinutes(start);
  
  // Handle overnight times (end is next day)
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return endMinutes - startMinutes;
}

/**
 * Check if a time is within a range (inclusive)
 */
export function isTimeInRange(time: TimeString, start: TimeString, end: TimeString): boolean {
  const timeMin = timeToMinutes(time);
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  
  // Handle overnight ranges
  if (endMin < startMin) {
    return timeMin >= startMin || timeMin <= endMin;
  }
  
  return timeMin >= startMin && timeMin <= endMin;
}

/**
 * Check if two time slots overlap
 */
export function doTimeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  // If dates are specified and different, no overlap
  if (slot1.date && slot2.date && slot1.date !== slot2.date) {
    return false;
  }
  
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);
  
  // Handle overnight slots
  const isOvernight1 = end1 < start1;
  const isOvernight2 = end2 < start2;
  
  if (isOvernight1 || isOvernight2) {
    // Complex overnight overlap logic
    if (isOvernight1 && isOvernight2) {
      return true; // Both overnight, guaranteed overlap
    }
    if (isOvernight1) {
      return start2 >= start1 || end2 <= end1;
    }
    if (isOvernight2) {
      return start1 >= start2 || end1 <= end2;
    }
  }
  
  // Standard overlap check
  return start1 < end2 && start2 < end1;
}

/**
 * Merge overlapping or adjacent time slots
 */
export function mergeOverlappingSlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length <= 1) return [...slots];
  
  // Group by date
  const groupedByDate = new Map<string, TimeSlot[]>();
  for (const slot of slots) {
    const dateKey = slot.date ?? 'no-date';
    if (!groupedByDate.has(dateKey)) {
      groupedByDate.set(dateKey, []);
    }
    groupedByDate.get(dateKey)!.push(slot);
  }
  
  const merged: TimeSlot[] = [];
  
  for (const [, dateSlots] of groupedByDate) {
    // Sort by start time
    const sorted = dateSlots.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    
    if (sorted.length === 0) continue;
    
    const currentMerged: TimeSlot[] = [sorted[0]!];
    
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i]!;
      const last = currentMerged[currentMerged.length - 1]!;
      
      // Check if adjacent or overlapping
      if (doTimeSlotsOverlap(last, current) || 
          getTimeDifference(last.endTime, current.startTime) === 0) {
        // Merge slots
        last.endTime = timeToMinutes(current.endTime) > timeToMinutes(last.endTime) 
          ? current.endTime 
          : last.endTime;
      } else {
        currentMerged.push(current);
      }
    }
    
    merged.push(...currentMerged);
  }
  
  return merged;
}

/**
 * Expand a recurring schedule item into individual time slots for a date range
 */
export function expandRecurringSlot(
  item: FlexibleScheduleItem,
  startDate: DateString,
  endDate: DateString
): TimeSlot[] {
  if (!item.recurrence) {
    // Single occurrence
    const date = item.timeSlot.date ?? startDate;
    if (date >= startDate && date <= endDate) {
      return [item.timeSlot];
    }
    return [];
  }
  
  const slots: TimeSlot[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const recurrenceEnd = item.recurrence.endDate ? new Date(item.recurrence.endDate) : end;
  
  // eslint-disable-next-line prefer-const -- current is mutated via Date methods
  let current = new Date(start);
  
  while (current <= end && current <= recurrenceEnd) {
    let shouldInclude = false;
    
    if (item.recurrence.type === 'daily') {
      shouldInclude = true;
    } else if (item.recurrence.type === 'weekly') {
      const dayOfWeek = current.getDay();
      shouldInclude = item.recurrence.daysOfWeek?.includes(dayOfWeek) ?? false;
    } else if (item.recurrence.type === 'monthly') {
      // For monthly, use the day of month from start date
      shouldInclude = current.getDate() === start.getDate();
    }
    
    // Check exceptions
    const currentDateString = current.toISOString().split('T')[0]!;
    if (item.recurrence.exceptions?.includes(currentDateString)) {
      shouldInclude = false;
    }
    
    if (shouldInclude) {
      slots.push({
        startTime: item.timeSlot.startTime,
        endTime: item.timeSlot.endTime,
        date: currentDateString
      });
    }
    
    // Advance by interval
    if (item.recurrence.type === 'daily') {
      current.setDate(current.getDate() + item.recurrence.interval);
    } else if (item.recurrence.type === 'weekly') {
      current.setDate(current.getDate() + (item.recurrence.interval * 7));
    } else if (item.recurrence.type === 'monthly') {
      current.setMonth(current.getMonth() + item.recurrence.interval);
    }
  }
  
  return slots;
}

/**
 * Convert a date to day of week number (0 = Sunday)
 */
export function getDayOfWeek(date: DateString): number {
  return new Date(date).getDay();
}

/**
 * Get current date as DateString
 */
export function getCurrentDate(): DateString {
  return new Date().toISOString().split('T')[0]!;
}

/**
 * Get current time as TimeString
 */
export function getCurrentTime(): TimeString {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Check if a time string is valid
 */
export function isValidTimeString(time: string): boolean {
  try {
    parseTimeString(time);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format TimeString for display (e.g., "09:00" -> "9:00 AM")
 */
export function formatTimeForDisplay(time: TimeString, use12Hour = true): string {
  const [hours24, minutes] = time.split(':').map(Number);
  
  if (!use12Hour) {
    return `${hours24!}:${minutes!.toString().padStart(2, '0')}`;
  }
  
  const period = (hours24!) >= 12 ? 'PM' : 'AM';
  const hours12 = (hours24!) === 0 ? 12 : (hours24!) > 12 ? (hours24!) - 12 : hours24!;
  
  return `${hours12}:${minutes!.toString().padStart(2, '0')} ${period}`;
}

/**
 * Generate time slots for a given time range and interval
 */
export function generateTimeSlots(
  startTime: TimeString,
  endTime: TimeString,
  intervalMinutes: number,
  date?: DateString
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let current = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  
  while (current < end) {
    const slotStart = minutesToTime(current);
    const slotEnd = minutesToTime(Math.min(current + intervalMinutes, end));
    
    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      date
    });
    
    current += intervalMinutes;
  }
  
  return slots;
}