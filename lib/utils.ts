import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { BlockOfTime, Day, LessonLength, Schedule } from "./types"
import { Time } from "./types"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

export const scheduleToAvailability = (schedule: Schedule): BlockOfTime[] => {
  // every day of the week adds 100 hours to the time, eg 9am monday = 9, 9 am tuesday = 109, 9am wednesday = 209...
  const availability: BlockOfTime[] = []
  Days.forEach((day, i) => {
    schedule[day]?.forEach(block => {
      availability.push({
        start: new Time(block.start.hour + i * 100, block.start.minute),
        end: new Time(block.end.hour + i * 100, block.end.minute)
      })
    })
  })
  return availability
}

export const availabilityToSchedule = (availability: BlockOfTime[]): Schedule => {
  const schedule: Schedule = {}
  Days.forEach((day, i) => {
    const dayBlocks: BlockOfTime[] = []
    availability.forEach(block => {
      if (block.start.hour >= i * 100 && block.start.hour < (i + 1) * 100) {
        dayBlocks.push({
          start: new Time(block.start.hour - i * 100, block.start.minute),
          end: new Time(block.end.hour - i * 100, block.end.minute)
        })
      }
    })
    schedule[day] = dayBlocks
  })
  return schedule
}

export const blockOfTimeToSchedule = (block: BlockOfTime): Schedule => {
  const schedule: Schedule = {}
  Days.forEach((day, i) => {
    const dayBlocks: BlockOfTime[] = []
    if (block.start.hour >= i * 100 && block.start.hour < (i + 1) * 100) {
      dayBlocks.push({
        start: new Time(block.start.hour - i * 100, block.start.minute),
        end: new Time(block.end.hour - i * 100, block.end.minute)
      })
    }
    schedule[day] = dayBlocks
  })
  return schedule
}

//TODO: refactor
export function buttonsToSchedule(buttons: boolean[][], lessonLength: LessonLength): Schedule {
  const isThirty = lessonLength === 30;
  const schedule: Schedule = {}
  Days.forEach((day, i) => {
    const dayBlocks: BlockOfTime[] = []
    let on = false
    let start = new Time(9, 0)
    let end: Time
    buttons[i]!.forEach((times, j) => {
      if (times) { // timeslot marked
        if (on) { // continued block
          // do nothing
        }
        else { // start of new block
          // start = { 
          //   hour: isThirty ? 9 + Math.floor(j / 2) : 9 + j,
          //   minute: isThirty ? (j % 2) * 30 : 0
          // }
          start = new Time(
            isThirty ? 9 + Math.floor(j / 2) : 9 + j, 
            isThirty ? (j % 2) * 30 : 0
          )
          on = true
        }
      }
      else { // timeslot not marked
        if (on) { // block ended
          end = new Time(
            isThirty ? 9 + Math.floor(j / 2) : 9 + j,
            isThirty ? (j % 2) * 30 : 0
          )
          dayBlocks.push({ start, end })
          on = false
        }
        else { // no block
          // do nothing
        }
      }
    })
    if (on) { // block ended
      end = 
        new Time(
          isThirty ? 9 + Math.floor(buttons[i]!.length / 2) : 9 + buttons[i]!.length,
          isThirty ? (buttons[i]!.length % 2) * 30 : 0
        )
      dayBlocks.push({ start, end })
      on = false
    }
    schedule[day] = dayBlocks;
  }); 
  return schedule;
}

export function scheduleToButtons(schedule: Schedule, lessonLength: LessonLength): boolean[][] {
  const isThirty = lessonLength === 30;
  const buttons: boolean[][] = []
  Days.forEach((day, i) => {
    buttons[i] = []
    for (let j = 0; j < (isThirty ? 24 : 12); j++) {
      buttons[i]![j] = false
    }
    schedule[day]?.forEach(block => {
      const start = isThirty ? block.start.hour * 2 + block.start.minute / 30 : block.start.hour
      const end = isThirty ? block.end.hour * 2 + block.end.minute / 30 : block.end.hour
      const offset = isThirty ? 18 : 9 // adjust for 9am start
      for (let j = start - offset; j < end - offset; j++) {
        buttons[i]![j] = true
      }
    })
  })
  return buttons
}

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