import type { Day, Schedule, StudentSchedule } from "./types";

/* eslint-disable @typescript-eslint/prefer-for-of */
import { type Heuristics } from "./solver";

export type StudentWithButtons = StudentSchedule & {
    bsched: boolean[][];
}

export type Block = {
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
        if (student.student.lessonLength === 60) {
            for (let i = 0; i < student.bsched.length; i++) {
                for (let j = 0; j < student.bsched[i]!.length; j++) {
                    if (student.bsched[i]![j]) {
                        // Check if this is an isolated 30-minute slot
                        if (j === student.bsched[i]!.length - 1 || !student.bsched[i]![j + 1]) {
                            student.bsched[i]![j] = false;
                        } else {
                            // This is the start of a 60-minute block, skip the next slot
                            j++;
                        }
                    }
                }
            }
        }
    });
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

export const scheduleToButtons = (schedule: Schedule): boolean[][] =>{
    // Define the boolean 2D array with 7 days, each with 24 half-hour blocks for 9am to 9pm
    const booleanArray: boolean[][] = [] //new Array(7).fill([]).map(() => new Array<boolean>(24).fill(false));
  
    // Convert the day names to an array to map to array indexes
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as Day[];
  
    // Iterate over each day of the week
    for (let i = 0; i < daysOfWeek.length; i++) {
        const dayName = daysOfWeek[i]!
        // Check if the schedule has entries for the current day
        if (schedule[dayName] && schedule[dayName].length > 0) {
            const day: boolean[] = new Array<boolean>(24).fill(false);
            // Loop through each period in the day
            for (const period of schedule[dayName]) {
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

export const solve = (students: StudentSchedule[], availability: Schedule, heuristics: Heuristics): FinalSchedule => {
    // convert to buttons to operate over the grind
    const studentsB: StudentWithButtons[] = students.map((std) => ({ ...std, bsched: scheduleToButtons(std.schedule)}));
    const availAsButtons = scheduleToButtons(availability);
    // solver loop
    const schedule = solverHelper(structuredClone(studentsB), structuredClone(availAsButtons), heuristics, { assignments: []});
    if (!schedule) throw new Error("unsolvable schedule");
    
    // Validate break requirements in final schedule
    if (!validateBreakRequirements(schedule, heuristics)) {
        throw new Error("Schedule violates break requirements");
    }

    return schedule;
}

const solverHelper = (students: StudentWithButtons[], avail: boolean[][], heuristics: Heuristics, schedule: FinalSchedule): FinalSchedule | null => {
    // Remove artificial limit - allow realistic class sizes
    if (schedule.assignments.length > 100) throw new Error("too many assignments - possible infinite loop")

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
                let proposedBlock: Block
                
                if (student.student.lessonLength === 60) {
                    if (candidate.afterOpen) {
                        availC[candidate.i]![candidate.j + 1] = false
                        proposedBlock = {
                            start: { i: candidate.i, j: candidate.j },
                            end: { i: candidate.i, j: candidate.j + 2}
                        }
                    }
                    else if (candidate.beforeOpen) {
                        availC[candidate.i]![candidate.j - 1] = false
                        proposedBlock = {
                            start: { i: candidate.i, j: candidate.j - 1},
                            end: { i: candidate.i, j: candidate.j + 1}
                        }
                    } else {
                        continue // Skip invalid 60-minute assignments
                    }
                } else {
                    proposedBlock = {
                        start: { i: candidate.i, j: candidate.j },
                        end: { i: candidate.i, j: candidate.j + 1 }
                    }
                }
                
                // Check if this assignment would violate break requirements
                if (wouldViolateBreakRequirements(schedule, proposedBlock, heuristics)) {
                    continue
                }
                
                // Additional check: if there's a max consecutive group ending before this slot,
                // ensure we have adequate break space
                if (wouldViolateBreakSpacing(schedule, proposedBlock, heuristics)) {
                    continue
                }
                
                // Assignment is valid, add it to the schedule
                schedC.assignments.push({
                    student,
                    time: proposedBlock
                })

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
            let proposedBlock: Block
            
            if (student.student.lessonLength === 60) {
                if (afterOpen) {
                    availC[candidate.i]![candidate.j + 1] = false
                    proposedBlock = {
                        start: { i: candidate.i, j: candidate.j },
                        end: { i: candidate.i, j: candidate.j + 2}
                    }
                }
                else if (beforeOpen) {
                    availC[candidate.i]![candidate.j - 1] = false
                    proposedBlock = {
                        start: { i: candidate.i, j: candidate.j - 1},
                        end: { i: candidate.i, j: candidate.j + 1}
                    }
                } else {
                    continue // Skip invalid 60-minute assignments
                }
            } else {
                proposedBlock = {
                    start: { i: candidate.i, j: candidate.j },
                    end: { i: candidate.i, j: candidate.j + 1 }
                }
            }
            
            // Check if this assignment would violate break requirements
            if (wouldViolateBreakRequirements(schedule, proposedBlock, heuristics)) {
                continue
            }
            
            // Additional check: if there's a max consecutive group ending before this slot,
            // ensure we have adequate break space
            if (wouldViolateBreakSpacing(schedule, proposedBlock, heuristics)) {
                continue
            }
            
            // Assignment is valid, add it to the schedule
            schedC.assignments.push({
                student,
                time: proposedBlock
            })

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

const hasRequiredBreakSpace = (avail: boolean[][], dayIndex: number, slotIndex: number, breakLength: number, checkAfter: boolean): boolean => {
    if (breakLength === 0) return true // No break required
    
    const maxJ = avail[0]!.length
    const startCheck = checkAfter ? slotIndex + 1 : slotIndex - breakLength
    const endCheck = checkAfter ? slotIndex + breakLength : slotIndex - 1
    
    // Check bounds
    if (startCheck < 0 || endCheck >= maxJ) return false
    
    // Check if required break slots are available
    for (let j = startCheck; j <= endCheck; j++) {
        if (!avail[dayIndex]![j]) return false
    }
    
    return true
}

const validateBreakRequirements = (schedule: FinalSchedule, heuristics: Heuristics): boolean => {
    if (heuristics.numConsecHalfHours === 0 || heuristics.breakLenInHalfHours === 0) return true
    
    // Group assignments by day
    const dayGroups: Record<number, Block[]> = {}
    
    for (const assignment of schedule.assignments) {
        const day = assignment.time.start.i
        dayGroups[day] ??= []
        dayGroups[day].push(assignment.time)
    }
    
    // Check each day for break requirement violations
    for (const [, blocks] of Object.entries(dayGroups)) {
        // Sort blocks by start time
        blocks.sort((a, b) => a.start.j - b.start.j)
        
        let consecutiveSlots = 0
        let lastEndSlot = -1
        
        for (const block of blocks) {
            const startSlot = block.start.j
            const endSlot = block.end.j
            const duration = endSlot - startSlot
            
            if (lastEndSlot === -1 || startSlot === lastEndSlot) {
                // Consecutive or first block
                consecutiveSlots += duration
                
                // Check if we exceed max consecutive
                if (consecutiveSlots > heuristics.numConsecHalfHours) {
                    return false
                }
            } else {
                // Gap between blocks
                const gap = startSlot - lastEndSlot
                
                // If we had max consecutive slots, check if break is sufficient
                if (consecutiveSlots >= heuristics.numConsecHalfHours && gap < heuristics.breakLenInHalfHours) {
                    return false
                }
                
                consecutiveSlots = duration
            }
            
            lastEndSlot = endSlot
        }
    }
    
    return true
}

const wouldViolateBreakRequirements = (schedule: FinalSchedule, newBlock: Block, heuristics: Heuristics): boolean => {
    if (heuristics.numConsecHalfHours === 0 || heuristics.breakLenInHalfHours === 0) return false
    
    // Check if this new block would create a break requirement violation on its day
    const day = newBlock.start.i
    const dayAssignments = schedule.assignments
        .filter(a => a.time.start.i === day)
        .map(a => a.time)
    
    // Add the new block and sort by start time
    const allBlocks = [...dayAssignments, newBlock].sort((a, b) => a.start.j - b.start.j)
    
    let consecutiveSlots = 0
    let lastEndSlot = -1
    let needsBreakAfter = false
    
    for (let i = 0; i < allBlocks.length; i++) {
        const block = allBlocks[i]
        if (!block) continue
        const startSlot = block.start.j
        const endSlot = block.end.j
        const duration = endSlot - startSlot
        
        if (lastEndSlot === -1 || startSlot === lastEndSlot) {
            // Consecutive or first block
            consecutiveSlots += duration
            
            // Check if we exceed max consecutive
            if (consecutiveSlots > heuristics.numConsecHalfHours) {
                return true
            }
            
            // If we hit exactly the max, we need a break after this block
            if (consecutiveSlots === heuristics.numConsecHalfHours) {
                needsBreakAfter = true
            }
        } else {
            // Gap between blocks
            const gap = startSlot - lastEndSlot
            
            // If we needed a break and gap is insufficient, it's a violation
            if (needsBreakAfter && gap < heuristics.breakLenInHalfHours) {
                return true
            }
            
            // Reset for new consecutive group
            consecutiveSlots = duration
            needsBreakAfter = false
            
            // If this new group hits the max, it will need a break after
            if (consecutiveSlots === heuristics.numConsecHalfHours) {
                needsBreakAfter = true
            }
        }
        
        lastEndSlot = endSlot
    }
    
    // If we end with a group that needs a break, check if this new block 
    // would be scheduled too soon after the max consecutive group
    if (needsBreakAfter && allBlocks.length > 0) {
        const lastBlock = allBlocks[allBlocks.length - 1]
        if (lastBlock === newBlock) {
            // The new block is at the end and we need a break after the previous group
            // Check if there's enough room for the break after this new block
            const maxSlots = 24 // 9am to 9pm = 24 half-hour slots
            if (newBlock.end.j + heuristics.breakLenInHalfHours <= maxSlots) {
                // There's room for the break after - this is fine
                // But we should block the break slots from being used
            }
        }
    }
    
    return false
}

const wouldViolateBreakSpacing = (schedule: FinalSchedule, newBlock: Block, heuristics: Heuristics): boolean => {
    if (heuristics.numConsecHalfHours === 0 || heuristics.breakLenInHalfHours === 0) return false
    
    const day = newBlock.start.i
    const dayAssignments = schedule.assignments
        .filter(a => a.time.start.i === day)
        .map(a => a.time)
        .sort((a, b) => a.start.j - b.start.j)
    
    // Check if there's a max consecutive group that ends before this new block
    // and doesn't have adequate break space after it
    let consecutiveSlots = 0
    let lastEndSlot = -1
    let maxGroupEndSlot = -1
    
    for (const block of dayAssignments) {
        const startSlot = block.start.j
        const endSlot = block.end.j
        const duration = endSlot - startSlot
        
        if (lastEndSlot === -1 || startSlot === lastEndSlot) {
            // Consecutive or first block
            consecutiveSlots += duration
            
            if (consecutiveSlots === heuristics.numConsecHalfHours) {
                maxGroupEndSlot = endSlot
            }
        } else {
            // Gap between blocks - reset consecutive count
            consecutiveSlots = duration
            
            if (consecutiveSlots === heuristics.numConsecHalfHours) {
                maxGroupEndSlot = endSlot
            }
        }
        
        lastEndSlot = endSlot
    }
    
    // If there's a max group that ended, check if this new block is too close
    if (maxGroupEndSlot !== -1 && newBlock.start.j > maxGroupEndSlot) {
        const gap = newBlock.start.j - maxGroupEndSlot
        if (gap < heuristics.breakLenInHalfHours) {
            return true // Violates break spacing
        }
    }
    
    return false
}

const getPrioritySlots = (avail: boolean[][], schedule: FinalSchedule, heuristics: Heuristics): SlotWithData[] => {
    if (schedule.assignments.length === 0) return []

    const slots: SlotWithData[] = []
    const groups = groupConsecutiveTimes(schedule)
    
    const maxJ = avail[0]!.length
    // if it doesnt violate the num lessons w/o break constraint, add the neighbors to slots
    groups.forEach((group) => {
        const groupLength = group.end.j - group.start.j + 1 // start and end are inclusive, so start at slot 1 end at slot 3 means 3 slots
        if (groupLength >= heuristics.numConsecHalfHours) {
            // Group is at max consecutive - enforce break requirements
            // No adjacent slots should be added to this group
            return
        }

        // Check if adding at end would violate break requirements
        if (group.end.j + 1 < maxJ && avail[group.end.i]![group.end.j + 1]) {
            // Check if there's enough space after for break if this addition would max out the group
            const wouldMaxOut = groupLength + 1 >= heuristics.numConsecHalfHours
            const hasBreakSpace = !wouldMaxOut || hasRequiredBreakSpace(avail, group.end.i, group.end.j + 1, heuristics.breakLenInHalfHours, true)
            
            if (hasBreakSpace) {
                slots.push({
                    i: group.start.i,
                    j: group.end.j + 1,
                    beforeOpen: false,
                    afterOpen: (heuristics.numConsecHalfHours - groupLength >= 2) && (group.end.j + 2 < maxJ && (avail[group.end.i]![group.end.j + 2] ?? false))
                })
            }
        }
        
        // Check if adding at start would violate break requirements
        if (group.start.j > 0 && avail[group.start.i]![group.start.j - 1]) {
            // Check if there's enough space before for break if this addition would max out the group
            const wouldMaxOut = groupLength + 1 >= heuristics.numConsecHalfHours
            const hasBreakSpace = !wouldMaxOut || hasRequiredBreakSpace(avail, group.start.i, group.start.j - 1, heuristics.breakLenInHalfHours, false)
            
            if (hasBreakSpace) {
                slots.push({
                    i: group.start.i,
                    j: group.start.j - 1,
                    afterOpen: false,
                    beforeOpen: (heuristics.numConsecHalfHours - groupLength >= 2) && (group.start.j - 1 > 0 && (avail[group.start.i]![group.start.j - 2] ?? false))
                })
            }
        }
    })

    return slots
}

const groupConsecutiveTimes = (schedule: FinalSchedule): Block[] => {
    const groups: Block[] = []
    
    // Group assignments by day first
    const dayAssignments: Record<number, Block[]> = {}
    for (const assignment of schedule.assignments) {
        const day = assignment.time.start.i
        dayAssignments[day] ??= []
        dayAssignments[day].push(assignment.time)
    }
    
    // Process each day separately
    for (const [, assignments] of Object.entries(dayAssignments)) {
        // Sort assignments by start time
        assignments.sort((a, b) => a.start.j - b.start.j)
        
        let currentGroup: Block | null = null
        
        for (const assignment of assignments) {
            if (currentGroup === null) {
                // Start new group
                currentGroup = {
                    start: assignment.start,
                    end: { i: assignment.start.i, j: assignment.end.j - 1 } // end is inclusive in groups
                }
            } else {
                // Check if this assignment is consecutive to the current group
                if (assignment.start.j === currentGroup.end.j + 1) {
                    // Extend current group
                    currentGroup.end.j = assignment.end.j - 1
                } else {
                    // Gap found, close current group and start new one
                    groups.push(currentGroup)
                    currentGroup = {
                        start: assignment.start,
                        end: { i: assignment.start.i, j: assignment.end.j - 1 }
                    }
                }
            }
        }
        
        // Don't forget the last group
        if (currentGroup !== null) {
            groups.push(currentGroup)
        }
    }
    
    return groups
}