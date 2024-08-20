import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { BlockOfTime, Day, LessonLength, Schedule, StudentSchedule } from "./types"
import { Time } from "./types"
import type { Block, FinalSchedule, Slot, StudentWithButtons } from "./heur_solver"
import { getTimeIndex, type Event } from "src/components/InteractiveCalendar"
import { type StudioWithStudents } from "~/pages/studios/[slug]"
 
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
  for (const day of Days) {
    const buttonRow: boolean[] = [];
    for (let j = 0; j < (isThirty ? 24 : 12); j++) {
      buttonRow[j] = false;
    }
    schedule[day]?.forEach(block => {
      const start = isThirty ? block.start.hour * 2 + block.start.minute / 30 : block.start.hour;
      const end = isThirty ? block.end.hour * 2 + block.end.minute / 30 : block.end.hour;
      const offset = isThirty ? 18 : 9; // adjust for 9am start
      for (let j = start - offset; j < end - offset; j++) {
        buttonRow[j] = true;
      }
    });
    buttons.push(buttonRow);
  }
  return buttons;
}

export const finalScheduleToButtons = (schedule: FinalSchedule): string[][] => {
  // 7 x 24 grid of "X"
  const buttons: string[][] = new Array(7).fill([]).map(() => new Array<string>(24).fill("X"))
  schedule.assignments.forEach((assignment) => {
    // assignment has a student and a block, which has a start and an end slot, which has an i and j index corresponding to our bool[][]
    // where an assignment has blocks, put the name of the student
    const student = assignment.student
    const block = assignment.time // Start: Slot, End: Slot. Slot: i, j
    const start = block.start
    const end = block.end
    const day = start.i
    const startSlot = start.j
    const endSlot = end.j
    for (let j = startSlot; j < endSlot; j++) {
      buttons[day]![j] = student.student.name
    }
  }
  )
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


export const slotToTime = (slot: Slot, end?: boolean): { hrs: number, mins: number, day: Day } => {
  if (end) {
      slot.j += 1
  }
  // a slot is an index in the buttons array, which is M-Sun 9am-9pm. output the correct time and day given the slot.i and slot.j
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const day = days[slot.i] as Day
  // time is 0-23, where 0 is 9am and 23 is 9pm. will be in 30 minute increments
  const numHalfHoursPast9am = slot.j
  const hrs = Math.floor(numHalfHoursPast9am / 2) + 9
  const mins = (numHalfHoursPast9am % 2) * 30
  return { hrs, mins, day }
}

export const rectifyMins = (mins: number): string => {
  if (mins === 0) return "00"
  return String(mins)
}

const sortSlots = (a: Slot, b: Slot): number => {
  // sort by day, then by time
  if (a.i < b.i) return -1
  if (a.i > b.i) return 1
  if (a.j < b.j) return -1
  if (a.j > b.j) return 1
  return 0
}

export const finalScheduleToString = (sched: FinalSchedule): string[] => {
  const res: string[] = []
  sched.assignments.sort((a,b) => sortSlots(a.time.start, b.time.start))
  for (const assignment of sched.assignments) {
      const time = slotToTime(assignment.time.start)
      const end: string = assignment.student.student.lessonLength === 30 ? ( time.mins === 30 ? `${time.hrs + 1}:00` : `${time.hrs}:${rectifyMins(time.mins + 30)}`) : `${time.hrs + 1}:${rectifyMins(time.mins)}`
      const mins = time.mins === 0 ? "00" : String(time.mins)
      res.push(assignment.student.student.name + " -> " + time.day + " " + String(time.hrs) + ":" + mins + " - " + end)
  }
  return res
}


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

const abbvDay = (day: Day): string => {
  switch (day) {
    case "Monday":
      return "M"
    case "Tuesday":
      return "Tu"
    case "Wednesday":
      return "W"
    case "Thursday":
      return "Th"
    case "Friday":
      return "F"
    default:
      throw new Error(`Invalid day ${day}`)
  }
}

const militaryToStandard = (time: string): string => {
  const [hrs, mins] = time.split(":").map((str) => parseInt(str)) as [number, number]
  const ampm = hrs < 12 ? "am" : "pm"
  const newHrs = hrs % 12 === 0 ? 12 : hrs % 12
  const minsStr = mins === 0 ? "00" : String(mins)
  return `${newHrs}:${minsStr}${ampm}`
}


export const finalScheduleToEventList = (finalSchedule: FinalSchedule, studio: StudioWithStudents): Event[] => {
  const mapRes = finalSchedule.assignments.map((schedule, i) => {
    const time = slotToTime(schedule.time.start)
    const end: string = schedule.student.student.lessonLength === 30 ? ( time.mins === 30 ? `${time.hrs + 1}:00` : `${time.hrs}:${rectifyMins(time.mins + 30)}`) : `${time.hrs + 1}:${rectifyMins(time.mins)}`
    const mins = time.mins === 0 ? "00" : String(time.mins)
    const start = String(time.hrs) + ":" + mins

    const student = studio.students.find((student) => student.email === schedule.student.student.email)
    if (!student) {
      throw new Error("Student not found in studio")
    }
    const other_avail_times = transpose(scheduleToButtons(student.schedule, 30))

    return {
      id: i.toString(),
      name: schedule.student.student.name,
      booking: {
        day: abbvDay(time.day),
        time_start: militaryToStandard(start),
        time_end: militaryToStandard(end),
      },
      other_avail_times: other_avail_times,
      student_id: student.id
    }
  })
  return mapRes
}

export const eventListToFinalSchedule = (events: Event[], studio: StudioWithStudents): FinalSchedule => {
  const assignments = events.map((event) => {
    const student = studio.students.find((student) => student.id === event.student_id)
    if (!student) {
      throw new Error("Student not found in studio")
    }
    const day = abbrDaytoFull(event.booking.day)
    const start = event.booking.time_start
    const end = event.booking.time_end
    const startSlot = getTimeIndex(start)
    const endSlot = getTimeIndex(end)
    const time: Block = { start: { i: Days.indexOf(day), j: startSlot }, end: { i: Days.indexOf(day), j: endSlot } }
    const newStudentSchedule: StudentSchedule = { 
      student: { email: student.email, name: student.first_name!, lessonLength: resolveLessonLength(student.lesson_length) }, 
      schedule: student.schedule
    }
    const newStudent: StudentWithButtons = { 
      ...newStudentSchedule,
      bsched: scheduleToButtons(student.schedule, 30) // ALWAYS 30
     }
    return { student: newStudent, time }
  })
  return { assignments }
}

export const resolveLessonLength = (input: "30" | "60" | null): LessonLength => {
  if (input === "30") return 30
  if (input === "60") return 60
  throw new Error("Invalid lesson length")
}