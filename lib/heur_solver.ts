import type { Day, Schedule, StudentSchedule } from "./types";

/* eslint-disable @typescript-eslint/prefer-for-of */
import { type Heuristics } from "./solver";
// import { scheduleToButtons } from "./utils";

type StudentWithButtons = StudentSchedule & {
    bsched: boolean[][];
}

type Block = {
    start: Slot
    end: Slot
}

export type FinalSchedule = {
    assignments: {
        student: StudentWithButtons
        time: Block
    }[]
}

export type Slot = {
    i: number
    j: number
}

type SlotWithData = Slot & {
    beforeOpen: boolean
    afterOpen: boolean
}

// operates in place
const enforceLessonLength = (students: StudentWithButtons[]) => {
    students.forEach((student) => {
        if (student.student.lessonLength === 30) return
        else {
            // if there are isolated buttons (eg a 30 min slot on a 60 min student), set to false
            for (let i = 0; i < student.bsched.length; i++) {
                for (let j = 0; j < student.bsched[i]!.length; j++) {
                    if (student.bsched[i]![j]) {
                        if (student.bsched[i]![j + 1] ?? false) {
                            student.bsched[i]![j] = false
                        }
                    }
                }
            }
        }
    })
}

const isScheduleEmpty = (sched: boolean[][]): boolean => {
    // true if all are false, else otherwise
    for (let i = 0; i < sched.length; i++) {
        for (let j = 0; j < sched[i]!.length; j++) {
            if (sched[i]![j]) return false
        }
    }
    return true
}

function scheduleToButtons(schedule: Schedule) {
    // Define the boolean 2D array with 7 days, each with 24 half-hour blocks for 9am to 9pm
    const booleanArray: boolean[][] = [] //new Array(7).fill([]).map(() => new Array<boolean>(24).fill(false));
  
    // Convert the day names to an array to map to array indexes
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as Day[];
  
    // Iterate over each day of the week
    for (const [_, dayName] of daysOfWeek.entries()) {
        // Check if the schedule has entries for the current day
        if (schedule[dayName] && schedule[dayName]!.length > 0) {
            const day: boolean[] = new Array<boolean>(24).fill(false);
            // Loop through each period in the day
            for (const period of schedule[dayName]!) {
                const { start, end } = period;
                // Map the start and end times to indices in the boolean array
                const startIndex = timeToIndex(start.hour, start.minute);
                const endIndex = timeToIndex(end.hour, end.minute); // inclusive end
                
                for (let index = startIndex; index < endIndex; index++) {
                    // Set the corresponding time blocks to true
                    day[index] = true
                }
                
            }
            booleanArray.push(day);
        } else {
            const day: boolean[] = new Array<boolean>(24).fill(false);
            booleanArray.push(day);
        }
    }
    return booleanArray;
}
  
  // Helper function to convert hours and minutes into half-hour block index
  function timeToIndex(hour: number, minute: number) {
    // minute should be 0 or 30
    if (minute !== 0 && minute !== 30) {
        throw new Error('Invalid time (min)');
    }

    const index = (hour - 9) * 2 + (minute / 30);
    if (index < 0 || index > 24) {
        console.log('err', hour, minute, index)
        throw new Error('Invalid time (idx)');
    }

    return index;
  }

const solve = (students: StudentSchedule[], availability: Schedule, heuristics: Heuristics): FinalSchedule => {
    // convert to buttons to operate over the grind
    const studentsB: StudentWithButtons[] = students.map((std) => ({ ...std, bsched: scheduleToButtons(std.schedule)}));
    const availAsButtons = scheduleToButtons(availability);

    console.log("total students", studentsB.length)

    // solver loop
    const schedule = solverHelper(studentsB, availAsButtons, heuristics, { assignments: []});
    if (!schedule) throw new Error("unsolvable schedule");

    return schedule;
}

const solverHelper = (students: StudentWithButtons[], avail: boolean[][], heuristics: Heuristics, schedule: FinalSchedule): FinalSchedule | null => {
    if (schedule.assignments.length > 10) throw new Error("too many assignments")
    console.log(schedule.assignments.length, 'assigned')
    if (schedule.assignments.length === 8 || schedule.assignments.length === 10) {
        console.log(schedule, '?')
    }
    console.log(students.length, 'remaining')

    if (schedule.assignments.length === 9) {
        console.log("done", schedule)
    }
    // base case:
    // 1) students are empty, we are done
    // 2) schedule is exhausted, we fail
    if (students.length === 0) return schedule
    if (isScheduleEmpty(avail)) return null

    // eliminate all illegal times on the students
    for (let i = 0; i < avail.length; i++) {
        for (let j = 0; j < avail[i]!.length; j++) {
            if (!avail[i]![j]) {
                students.forEach((std) => {
                    std.bsched[i]![j] = false
                })
            }
        }
    }

    // consistency, check if problem is impossible
    enforceLessonLength(students)
    for (const std of students) {
        if (isScheduleEmpty(std.bsched)) {
           return null
        }
    }

    // check if we have heuristics to fulfill
    const candidates = getPrioritySlots(avail, schedule, heuristics)
    if (candidates.length > 0) {
        // heuristically order slot choice by minimal options, and then assignment to slot by student with minimal options on the board
        candidates.sort((a,b) => calculateNumStudentsAtSlot(students, a) - calculateNumStudentsAtSlot(students, b))
        const remainingVals = getRemainingValuesForStudents(students) 
        remainingVals.sort((a,b) => a.numRemaining - b.numRemaining)

        for (const candidate of candidates) {
            const validStudents = getStudentsAtSlot(remainingVals, candidate) as StudentWithNumRemaining[]
            validStudents.sort((a,b) => a.numRemaining - b.numRemaining)

            for (const student of validStudents) {
                // pick the student at the time
                if (student.student.lessonLength === 60 && (!candidate.afterOpen && !candidate.beforeOpen)) continue

                const availC = copyAvail(avail)
                const schedC = copyS(schedule)
                availC[candidate.i]![candidate.j] = false
                if (student.student.lessonLength === 60) {
                    if (candidate.afterOpen) {
                        availC[candidate.i]![candidate.j + 1] = false
                        schedC.assignments.push({
                            student,
                            time: {
                                start: { i: candidate.i, j: candidate.j },
                                end: { i: candidate.i, j: candidate.j + 1}
                            }
                        })
                    }
                    else if (candidate.beforeOpen) {
                        availC[candidate.i]![candidate.j - 1] = false
                        schedC.assignments.push({
                            student,
                            time: {
                                start: { i: candidate.i, j: candidate.j - 1},
                                end: { i: candidate.i, j: candidate.j}
                            }
                        })
                    }
                } else {
                    schedC.assignments.push({
                        student,
                        time: {
                            start: { i: candidate.i, j: candidate.j },
                            end: { i: candidate.i, j: candidate.j }
                        }
                    })
                }

                // do search
                const studC = structuredClone(students).filter((std) => std.student.email !== student.student.email)
                if (studC.length >= students.length) throw new Error("student not removed")
                const newSched = solverHelper(studC, availC, heuristics, schedC) 
                if (newSched !== null) {
                    return newSched
                }
            }

            // assign nobody FIXME: this might not work. i dont actually branch? think about when to order the "skip this slot" on the priority. think I wanna do it after trying everything else, but like when exactly? need to exhaust all choices.
            avail[candidate.i]![candidate.j] = false
        }
    }

    // no subsequent candidates, so try max degree slot and then min avail student
    const remainingCandidates = availToSlots(avail)
    remainingCandidates.sort((a,b) => calculateNumStudentsAtSlot(students, b) - calculateNumStudentsAtSlot(students, a))
    const remainingVals = getRemainingValuesForStudents(students) 
    remainingVals.sort((a,b) => a.numRemaining - b.numRemaining)

    for (const candidate of remainingCandidates) {
        const validStudents = getStudentsAtSlot(remainingVals, candidate) as StudentWithNumRemaining[]
        validStudents.sort((a,b) => a.numRemaining - b.numRemaining)

        for (const student of validStudents) {
            // pick the student at the time
            let afterOpen = false
            let beforeOpen = false
            if (student.student.lessonLength === 60) {
                // check if the slot before or after is open, i.e. does j - 1 or j + 1 exist in remainingCandidates
                const beforeOpenCandidate = remainingCandidates.find((c) => c.i === candidate.i && c.j === candidate.j - 1)
                const afterOpenCandidate = remainingCandidates.find((c) => c.i === candidate.i && c.j === candidate.j + 1)
                if (beforeOpenCandidate) beforeOpen = true
                if (afterOpenCandidate) afterOpen = true

                if (!afterOpen && !beforeOpen) continue
            }

            const availC = copyAvail(avail)
            const schedC = copyS(schedule)
            availC[candidate.i]![candidate.j] = false
            if (student.student.lessonLength === 60) {
                if (afterOpen) {
                    availC[candidate.i]![candidate.j + 1] = false
                    schedC.assignments.push({
                        student,
                        time: {
                            start: { i: candidate.i, j: candidate.j },
                            end: { i: candidate.i, j: candidate.j + 1}
                        }
                    })
                }
                else if (beforeOpen) {
                    availC[candidate.i]![candidate.j - 1] = false
                    schedC.assignments.push({
                        student,
                        time: {
                            start: { i: candidate.i, j: candidate.j - 1},
                            end: { i: candidate.i, j: candidate.j}
                        }
                    })
                }
            } else {
                schedC.assignments.push({
                    student,
                    time: {
                        start: { i: candidate.i, j: candidate.j },
                        end: { i: candidate.i, j: candidate.j }
                    }
                })
            }

            // do search
            const studC = structuredClone(students).filter((std) => std.student.email !== student.student.email)
            if (studC.length >= students.length) throw new Error("student not removed")
            const newSched = solverHelper(studC, availC, heuristics, schedC) 
            if (newSched !== null) {
                return newSched
            }
        }

        // no student assigned, so set to false
        avail[candidate.i]![candidate.j] = false
    }
    
    // that exhausts everything, so we need to backtrack
    return null
}

const availToSlots = (avail: boolean[][]): Slot[] => {
    const slots: Slot[] = []
    for (let i = 0; i < avail.length; i++) {
        for (let j = 0; j < avail[i]!.length; j++) {
            if (avail[i]![j]) slots.push({ i, j })
        }
    }
    return slots
}

const copyAvail = (avail: boolean[][]): boolean[][] => {
    return structuredClone(avail)
}

const getStudentsAtSlot = (students: StudentWithButtons[] | StudentWithNumRemaining[], slot: Slot): StudentWithButtons[] | StudentWithNumRemaining[] => {
    const validStudents: StudentWithButtons[] = []
    students.forEach((student) => {
        if (student.bsched[slot.i]![slot.j]) validStudents.push(student)
    })
    return validStudents
}

const calculateNumStudentsAtSlot = (students: StudentWithButtons[], slot: Slot): number => {
    return getStudentsAtSlot(students, slot).length
}

const copyS = (sched: FinalSchedule): FinalSchedule => {
    return structuredClone(sched)
}

type StudentWithNumRemaining = StudentWithButtons & {
    numRemaining: number
}

const getRemainingValuesForStudents = (students: StudentWithButtons[]): StudentWithNumRemaining[] => {
    return students.map((student) => {
        return {
            ...student,
            numRemaining: getNumSlots(student.bsched, student.student.lessonLength)
        }
    })
}

const getNumSlots = (sched: boolean[][], lessonLength: 30 | 60): number => {
    let count = 0
    sched.forEach((day) => {
        day.forEach((slot) => {
            if (slot) count += 1
        })
    })
    return lessonLength === 30 ? count : Math.ceil(count / 2) // FIXME: this appx might not be super great
}

const getPrioritySlots = (avail: boolean[][], schedule: FinalSchedule, heuristics: Heuristics): SlotWithData[] => {
    if (schedule.assignments.length === 0) return []

    const slots: SlotWithData[] = []
    const groups = groupConsecutiveTimes(schedule)
    
    const maxJ = avail[0]!.length
    // if it doesnt violate the num lessons w/o break constraint, add the neighbors to slots
    groups.forEach((group) => {
        const groupLength = group.end.j - group.start.j + 1 // start and end are inclusive, so start at slot 1 end at slot 3 means 3 slots
        if (groupLength >= heuristics.numConsecHalfHours) return

        // adding at end of group is both within the day and free
        if (group.end.j + 1 < maxJ && avail[group.end.i]![group.end.j + 1]) {
            slots.push({
                i: group.start.i,
                j: group.end.j + 1,
                beforeOpen: false,
                afterOpen: (heuristics.numConsecHalfHours - groupLength >= 2) && (group.end.j + 2 < maxJ && (avail[group.end.i]![group.end.j + 2] ?? false))
            })
        }
        // adding at start of group is both within the day and free
        if (group.start.j > 0 && avail[group.start.i]![group.start.j - 1]) {
            slots.push({
                i: group.start.i,
                j: group.start.j - 1,
                afterOpen: false,
                beforeOpen: (heuristics.numConsecHalfHours - groupLength >= 2) && (group.start.j - 1 > 0 && (avail[group.start.i]![group.start.j - 2] ?? false))
            })
        }
    })

    return slots
}

const groupConsecutiveTimes = (schedule: FinalSchedule): Block[] => {
    const groups: Block[] = []
    let start: Slot | null = null
    let end: Slot | null = null
    for (const assignment of schedule.assignments) {
        const slot = assignment.time.start
        if (start === null) {
            start = slot
            end = slot
        } else {
            if (slot.i === end!.i && slot.j === end!.j + 1) {
                end = slot
            } else {
                groups.push({ start, end: end! })
                start = slot
                end = slot
            }
        }
    }
    if (start !== null && end !== null) groups.push({ start, end })
    return groups
}

export default solve