import type { BlockOfTime, Schedule, Scheduled, StudentSchedule } from "./types";

/* eslint-disable @typescript-eslint/prefer-for-of */
import { type Heuristics } from "./solver";
import { scheduleToButtons } from "./utils";

type StudentWithButtons = StudentSchedule & {
    bsched: boolean[][];
}

type Block = {
    start: Slot
    end: Slot
}

type FinalSchedule = {
    assignments: {
        student: StudentWithButtons
        time: Block
    }[]
}

type Slot = {
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
            throw new Error("not yet implemented") 
        }
    })
}

const isScheduleEmpty = (sched: boolean[][]): boolean => {
    // true if all are false, else otherwise
    throw new Error("not yet implemented") 
}

const solve = (students: StudentSchedule[], availability: Schedule, heuristics: Heuristics) => {
    // convert to buttons to operate over the grind
    const studentsB: StudentWithButtons[] = []
    students.forEach((std) => {
        const newStudent: StudentWithButtons = {
            ...std,
            bsched: scheduleToButtons(std.schedule, 30)
        }
        studentsB.push(newStudent)
    })
    const availAsButtons = scheduleToButtons(availability, 30)

    // eliminate all illegal times on the students
    for (let i = 0; i < availAsButtons.length; i++) {
        for (let j = 0; j < availAsButtons[i]!.length; j++) {
            if (!availAsButtons[i]![j]) {
                studentsB.forEach((std) => {
                    std.bsched[i]![j] = false
                })
            }
        }
    }

    // consistency, check if problem is impossible
    enforceLessonLength(studentsB)
    studentsB.forEach((std) => {
        if (isScheduleEmpty(std.bsched)) throw new Error(`student ${std.student.name} has no overlap with teacher times`)
    })

    // solver loop
    const schedule = solverHelper(studentsB, availAsButtons, heuristics, { assignments: []})
    if (!schedule) throw new Error("unsolvable schedule")

    return schedule
}

const solverHelper = (students: StudentWithButtons[], avail: boolean[][], heuristics: Heuristics, schedule: FinalSchedule): FinalSchedule | null => {
    // base case:
    // 1) students are empty, we are done
    // 2) schedule is exhausted, we fail
    if (students.length === 0) return schedule
    if (isScheduleEmpty(avail)) return null

    let done = false

    // check if we have heuristics to fulfill
    const candidates = getPrioritySlots(avail, schedule, heuristics)
    if (candidates.length > 0) {
        // heuristically order slot choice by minimal options, and then assignment to slot by student with minimal options on the board
        candidates.sort((a,b) => calculateNumStudentsAtSlot(students, a) - calculateNumStudentsAtSlot(students, b))
        const remainingVals = getRemainingValuesForStudents(students) 
        remainingVals.sort((a,b) => a.numRemaining - b.numRemaining)

        candidates.forEach((candidate) => {
            const validStudents = getStudentsAtSlot(remainingVals, candidate) as StudentWithNumRemaining[]
            validStudents.sort((a,b) => a.numRemaining - b.numRemaining)

            validStudents.forEach((student) => {
                const newSched = solverHelper(students, avail, heuristics, schedule) // TODO: change the vars
                // TODO: think about when to order the "skip this slot" on the priority. think I wanna do it after trying everything else, but like when exactly? need to exhaust all choices.
            })
        })
    }

    // next work heuristically by 

    return schedule
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
    // make deep copy of sched
    throw new Error("not implemented")
    return sched
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
    // block are consecutive if i's are equal and js are +- 1
    throw new Error("Not yet implemented")
}