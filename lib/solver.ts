import type { BlockOfTime, LessonLength, Student } from "./types";

import { Time } from "./types";

export type Interval = { // [number, number]
    start: number,
    end: number
}
export type StudentAvailability =  { //[number, Interval[]];
    student: Student,
    availability: BlockOfTime[]
}
export type Scheduled =  { //[Stud, Interval];
    student: StudentAvailability,
    interval: BlockOfTime
}

type ScheduleAndScore = {
    schedule: Scheduled[],
    score: number
}

const blockIsIn = (interval: BlockOfTime, intervals: BlockOfTime[]) => {
    for (const block of intervals) {
        if (interval.start.geq(block.start) && interval.end.leq(block.end)) {
            return true
        }
    }
    return false
}

const getLegalIntervals = (lessonLength: number, availability: BlockOfTime[], A_me: BlockOfTime[]): BlockOfTime[] => {
    const legal: BlockOfTime[] = []

    // iterate over availability by intervals of lessonLength
    for (const interval of availability) {
        let cur = interval.start
        while (interval.end.greaterThan(cur)) {
            const block = { start: cur, end: Time.fromValue(cur.valueOf() + lessonLength) }
            cur = Time.fromValue(cur.valueOf() + lessonLength)

            if (blockIsIn(block, A_me)) {
                legal.push(block)
            }
        }
    }

    return legal
}

const compareTimes = (a: Time, b: Time) => {
    return a.hour - b.hour || a.minute - b.minute
}

const toNum = (length: LessonLength) => {
    return length === "30" ? 30 : 60
    }

const isLegal = (lessonLength: LessonLength, start: Time, end: Time): boolean => {
    return toNum(lessonLength) > end.valueOf() - start.valueOf()
}

const scheduleHelper = (legal: Map<StudentAvailability, BlockOfTime[]>, toHit: number, scheduled: Scheduled[] = [], first=false): ScheduleAndScore => {
    // base cases:
    // if scheduled is all booked up, return scheduled
    if (scheduled.length === toHit) {
        let score = 0
        const sortedIntervals: BlockOfTime[] = scheduled.map((s) => s.interval).sort((a, b) => compareTimes(a.start, b.start))
        // console.log(sortedIntervals.length)
        // calculate a score in the following manner: for each concurrent interval (ie the end of one is the start of the next), add n^2 to the score, where n is the number of intervals in a row. however, if the concurrent interval streches over 120 minutes without a break of at least 30 minutes, subtract 1000 from the score
        let cur = sortedIntervals[0]!
        let curCount = 1
        // console.log(sortedIntervals)
        sortedIntervals.map((interval, idx) => {
            if (idx === 0) {
                return
            }
            if (interval.start.equals(cur.end)) {
                curCount++
            }
            else {
                if (curCount > 1) {
                    score += curCount * curCount
                }
                if (curCount * toNum(scheduled[0]!.student.student.lessonLength) > 120) {
                    score -= 1000
                }
                cur = interval
                curCount = 1
            }
        })
        // for (let i = 0; i < sortedIntervals.length; i++) {
        //     const interval = sortedIntervals[i]!
        //     if (interval.start.equals(cur.end)) {
        //         curCount++
        //     }
        //     else {
        //         if (curCount > 1) {
        //             score += curCount * curCount
        //         }
        //         if (curCount * toNum(scheduled[0]!.student.student.lessonLength) > 120) {
        //             score -= 1000
        //         }
        //         cur = interval
        //         curCount = 1
        //     }
        // }
        if (curCount > 1) {
            score += curCount * curCount
        }
        if (curCount * toNum(scheduled[0]!.student.student.lessonLength) > 120) {
            score -= 1000
        }

        return { schedule: scheduled, score}
    }
    if (scheduled && scheduled.length === 0 && !first) {
        return { schedule: [], score: -1 }
    }
    if (legal.size === 0) {
        return { schedule: [], score: -1 }
    }

    // remove students from legal that have no legal intervals
    const delete2: StudentAvailability[] = []
    legal.forEach((intervals, student) => {
        if (intervals.length === 0) {
            delete2.push(student)
        }
    })
    delete2.forEach((student) => {
        legal.delete(student)
    })

    // if there are no legal students remaining, return
    if (legal.size === 0) {
        return { schedule: [], score: -1 }
    }

    // find student with least legal intervals to heuristically assign
    let min = Infinity
    let minStudent: StudentAvailability | undefined
    legal.forEach((intervals, student) => {
        if (intervals.length < min) {
            min = intervals.length
            minStudent = student
        }
    })

    if (!minStudent) {
        throw new Error("minStudent is undefined")
    }

    const minIntervals = legal.get(minStudent)!
    // console.log(minStudent)
    const idx = Math.floor(Math.random() * minIntervals.length)
    // console.log(idx, minIntervals.length)
    if (idx >= minIntervals.length) {
        throw new Error("idx is too big")
    }
    const minInterval = minIntervals[idx]! // random initializiation

    // now assign this interval to the student OR not
    const newScheduled = [...scheduled, { student: minStudent, interval: minInterval }]
    const newLegal = new Map<StudentAvailability, BlockOfTime[]>(legal)
    newLegal.delete(minStudent)

    

    // update legal intervals to remove this timeframe, splitting if necessary
    newLegal.forEach((intervals, student) => {
        const newIntervals = []

        for (const interval of intervals) {
            // if the intervals are disjoint, do nothing
            if (interval.start.geq(minInterval.end) || minInterval.start.geq(interval.end)) {
                newIntervals.push(interval)
            }
            // if the intervals are the same, remove the interval
            else if (interval.start.equals(minInterval.start) && interval.end.equals(minInterval.end)) { // IS == MS | ME == IE
                // do nothing
            }
            // if the intervals overlap, split the interval such that any overlap with minInterval is removed
            else if (interval.start.geq(minInterval.start) && minInterval.end.geq(interval.start) && interval.end.geq(minInterval.end)) { // MS  |=  IS  |=  ME |=  IE
                if (!interval.end.equals(minInterval.end) && isLegal(minStudent!.student.lessonLength, minInterval.end, interval.end)) {
                    newIntervals.push({ start: minInterval.end, end: interval.end })
                }
            }
            else if (minInterval.start.geq(interval.start) && interval.end.geq(minInterval.start) && interval.end.geq(minInterval.start)) { // IS  |=  MS  |= IE |=  ME 
                if (!interval.start.equals(minInterval.start) && isLegal(minStudent!.student.lessonLength, interval.start, minInterval.start)) {
                    newIntervals.push({ start: interval.start, end: minInterval.start })
                }
            }
            else if (minInterval.start.geq(interval.start) && interval.end.geq(minInterval.end)) { // IS  |=  MS  |  ME  |=  IE
                if (!interval.start.equals(minInterval.start) && isLegal(minStudent!.student.lessonLength, interval.start, minInterval.start)) {
                    newIntervals.push({ start: interval.start, end: minInterval.start })
                }
                if (!interval.end.equals(minInterval.end) && isLegal(minStudent!.student.lessonLength, minInterval.end, interval.end)) {
                    newIntervals.push({ start: minInterval.end, end: interval.end })
                }
            }
            else if (interval.start.geq(minInterval.start) && minInterval.end.geq(interval.end)) { // MS |= IS | IE |= ME
                // do nothing
            }
            else {
                console.log(interval, minInterval)
                throw new Error("unreachable")
            }
        }
        if (newIntervals.length !== 0) {
            newLegal.set(student, newIntervals)
        }
    })
    // remove empty students
    const toDelete: StudentAvailability[] = []
    newLegal.forEach((intervals, student) => {
        if (intervals.length === 0) {
            toDelete.push(student)
        }
    })
    toDelete.forEach((student) => {
        newLegal.delete(student)
    })

    const removedFromLegal = new Map<StudentAvailability, BlockOfTime[]>(legal)
    removedFromLegal.set(minStudent, minIntervals.filter((_, i) => i !== idx))

    const doAssign = scheduleHelper(newLegal, toHit, newScheduled, false)
    // if (doAssign.schedule.length === toHit) { // bias towards assigning
    //     return { schedule: doAssign.schedule, score: doAssign.score }
    // }
    const dontAssign = scheduleHelper(removedFromLegal, toHit, scheduled, false)

    if (dontAssign.schedule.length === 0 && doAssign.schedule.length === 0) {
        return { schedule: [], score: -1 }
    }
    else if (dontAssign.schedule.length === 0) {
        return { schedule: doAssign.schedule, score: doAssign.score }
    }
    else if (doAssign.schedule.length === 0) {
        return { schedule: dontAssign.schedule, score: dontAssign.score }
    }
    else {
        // tiebreak on score
        return dontAssign.score > doAssign.score ? dontAssign : doAssign
    }
}

export const schedule = (A_me: BlockOfTime[], S: StudentAvailability[]): Scheduled[] => {
    // ensure inputs are sorted
    A_me.sort((a, b) => compareTimes(a.start, b.start))
    S.forEach((student) => {
        student.availability = student.availability.sort((a, b) => compareTimes(a.start, b.start))
    })

    // solve all possible legal states
    const legal: Map<StudentAvailability, BlockOfTime[]> = new Map<StudentAvailability, BlockOfTime[]>()

    S.forEach((studentAvailability) => {
        const { student, availability } = studentAvailability
        const legalForStudent = getLegalIntervals(toNum(student.lessonLength), availability, A_me)
        if (legalForStudent.length === 0) {
            throw new Error("No legal intervals")
        }
        legal.set(studentAvailability, legalForStudent) 
    })

    // console.log(legal, "legal")

    const res = scheduleHelper(legal, legal.size, [], true)
    console.log(res.score)
    return res.schedule
}