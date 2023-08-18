import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const Days: Day[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
]

//TODO: refactor
export function buttonsToSchedule(buttons: boolean[][], lessonLength: LessonLength): Schedule {
  const isThirty = lessonLength === "30";
  const schedule: Schedule = {}
  Days.forEach((day, i) => {
    const dayBlocks: BlockOfTime[] = []
    let on = false
    let start = { hour: 0, minute: 0 }
    let end = { hour: 0, minute: 0 }
    buttons[i]!.forEach((times, j) => {
      if (times) { // timeslot marked
        if (on) { // continued block
          // do nothing
        }
        else { // start of new block
          start = { 
            hour: isThirty ? 9 + Math.floor(j / 2) : 9 + j,
            minute: isThirty ? (j % 2) * 30 : 0
          }
          on = true
        }
      }
      else { // timeslot not marked
        if (on) { // block ended
          end = {
            hour: isThirty ? 9 + Math.floor(j / 2) : 9 + j,
            minute: isThirty ? (j % 2) * 30 : 0
          }
          dayBlocks.push({ start, end })
          on = false
        }
        else { // no block
          // do nothing
        }
      }
    })
    if (on) { // block ended
      end = {
        hour: isThirty ? 9 + Math.floor(buttons[i]!.length / 2) : 9 + buttons[i]!.length,
        minute: isThirty ? (buttons[i]!.length % 2) * 30 : 0
      }
      dayBlocks.push({ start, end })
      on = false
    }
    schedule[day] = dayBlocks;
  }); 
  return schedule;
}

export function scheduleToButtons(schedule: Schedule, lessonLength: LessonLength): boolean[][] {
  const isThirty = lessonLength === "30";
  const buttons: boolean[][] = []
  Days.forEach((day, i) => {
    buttons[i] = []
    for (let j = 0; j < (isThirty ? 24 : 12); j++) {
      buttons[i]![j] = false
    }
    schedule[day]?.forEach(block => {
      const start = isThirty ? block.start.hour * 2 + block.start.minute / 30 : block.start.hour
      const end = isThirty ? block.end.hour * 2 + block.end.minute / 30 : block.end.hour
      for (let j = start; j < end; j++) {
        buttons[i]![j] = true
      }
    })
  })
  return buttons
}