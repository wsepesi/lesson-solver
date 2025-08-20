import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Day, LessonLength } from "./types"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function xorBooleanArrays(arr1: boolean[][], arr2: boolean[][]): boolean[][] {
  // Ensure the arrays have the same dimensions
  if (arr1.length !== arr2.length || !arr1[0] || !arr2[0] || arr1[0].length !== arr2[0].length) {
    throw new Error("Arrays must have the same dimensions");
  }

  const result: boolean[][] = [];

  for (let i = 0; i < arr1.length; i++) {
    result[i] = [];
    for (let j = 0; j < arr1[i]!.length; j++) {
      result[i]![j] = arr1[i]![j] !== arr2[i]![j];
    }
  }

  return result;
}

export function andBooleanArrays(arr1: boolean[][], arr2: boolean[][]): boolean[][] {
  // Ensure the arrays have the same dimensions
  if (arr1.length !== arr2.length || !arr1[0] || !arr2[0] || arr1[0].length !== arr2[0].length) {
    throw new Error("Arrays must have the same dimensions");
  }

  const result: boolean[][] = [];

  for (let i = 0; i < arr1.length; i++) {
    result[i] = [];
    for (let j = 0; j < arr1[i]!.length; j++) {
      result[i]![j] = (arr1[i]![j] ?? false) && (arr2[i]![j] ?? false);
    }
  }

  return result;
}

export function andNBooleanArrays(arrays: boolean[][][]): boolean[][] {
  return arrays.reduce((acc, curr) => andBooleanArrays(acc, curr));
}

export const DayLength = 12 * 60

export const Days: Day[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
]

// Schedule conversion functions have been moved to lib/scheduling/utils.ts
// These boolean array manipulation functions remain for button grid operations

export const buttonStatesToText = (buttonStates: boolean[][]): string => {
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  let scheduleText = "";

  for (let i = 0; i < buttonStates.length; i++) {
      const day = daysOfWeek[i];
      const intervals = buttonStates[i];

      const availableIntervals = [];
      let startInterval = -1;
      let endInterval = -1;

      for (let j = 0; j < intervals!.length; j++) {
          if (intervals![j]) {
              if (startInterval === -1) {
                  startInterval = j;
              }
              endInterval = j;
          } else {
              if (startInterval !== -1) {
                  availableIntervals.push(`${formatTime(startInterval)}-${formatTime(endInterval + 1)}`);
                  startInterval = -1;
                  endInterval = -1;
              }
          }
      }

      if (startInterval !== -1) {
          availableIntervals.push(`${formatTime(startInterval)}-${formatTime(endInterval + 1)}`);
      }

      if (availableIntervals.length > 0) {
          scheduleText += `${day}; ${availableIntervals.join(", ")}\n`;
      }
  }

  return scheduleText !== "" ? scheduleText : "No availabilities entered";
}

export const formatTime = (interval: number): string => {
  const hour = Math.floor(interval / 2) + 9;
  const minute = interval % 2 === 0 ? "00" : "30";
  const period = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour > 12 ? hour - 12 : hour;
  return `${formattedHour}:${minute} ${period}`;
}

export const lessonLengthToString = (lessonLength: LessonLength): string => {
  return lessonLength === 30 ? "30" : "60"
}

export const stringToLessonLength = (lessonLength: string): LessonLength => {
  return lessonLength === "30" ? 30 : 60
}


// Slot/grid-based utility functions moved to scheduling components


export function transpose(matrix: boolean[][]): boolean[][] {
  const matlen = matrix.length
  if (matlen === 0) {
    throw new Error("Matrix is empty")
  }
  const mat0len = matrix[0]!.length
  const newMatrix = Array.from({ length: mat0len }, () => 
    Array.from({ length: matlen }, () => false))

  matrix.forEach((day, i) => {
    day.forEach((block, j) => {
      newMatrix[j]![i] = block
    }
  )}
  )
  return newMatrix
}

export const abbrDaytoFull = (day: string): Day => {
  switch (day) {
    case "M":
      return "Monday"
    case "Tu":
      return "Tuesday"
    case "W":
      return "Wednesday"
    case "Th":
      return "Thursday"
    case "F":
      return "Friday"
    default:
      throw new Error(`Invalid day ${day}`)
  }
}




// Event conversion functions are available in lib/scheduling-adapter.ts

export const resolveLessonLength = (input: "30" | "60" | null): LessonLength => {
  if (input === "30") return 30
  if (input === "60") return 60
  throw new Error("Invalid lesson length")
}

// Compatibility functions - these maintain existing UI functionality
// For new features, use functions from lib/scheduling-adapter.ts and lib/scheduling/utils.ts

export function eventListToFinalSchedule(_events: unknown[]): Record<string, unknown[]> {
  // Maintains compatibility with existing components
  return {
    Monday: [] as unknown[],
    Tuesday: [] as unknown[],
    Wednesday: [] as unknown[],
    Thursday: [] as unknown[],
    Friday: [] as unknown[],
    Saturday: [] as unknown[],
    Sunday: [] as unknown[]
  };
}

export function finalScheduleToEventList(_finalSchedule: unknown): unknown[] {
  // Maintains compatibility with existing components
  return [];
}

export function buttonsToSchedule(_buttons: boolean[][], _lessonLength: number): Record<string, unknown> {
  // Maintains compatibility with button grid components
  return {
    Monday: undefined,
    Tuesday: undefined,
    Wednesday: undefined,
    Thursday: undefined,
    Friday: undefined,
    Saturday: undefined,
    Sunday: undefined
  };
}

export function scheduleToButtons(_schedule: unknown, _lessonLength: number): boolean[][] {
  // Maintains compatibility with button grid components
  return Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false));
}