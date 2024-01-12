import type { BlockOfTime, Scheduled, StudentAvailability } from "./types";

export type Heuristics = {
    numConsecHalfHours: number,
    breakLenInHalfHours: number,
}

const getTeacherCompatibleTimes = (T: BlockOfTime[], S: StudentAvailability[]): StudentAvailability[] => {
    const S_legal: StudentAvailability[] = []
    S.forEach((student) => {
        const legal: BlockOfTime[] = []
        student.availability.forEach((interval) => {
            T.forEach((teacherInterval) => {
                if (interval.start.geq(teacherInterval.start) && interval.end.leq(teacherInterval.end)) {
                    legal.push(interval)
                }
            })
        })
        if (legal.length !== 0) {
            S_legal.push({ student: student.student, availability: legal })
        }
    })
    if (S_legal.length === 0) {
        throw new Error("No students available at times teacher is available")
    }
    if (S_legal.length !== S.length) {
        const mismatchedStudents: StudentAvailability[] = []
        S.forEach((student) => {
            let found = false
            S_legal.forEach((legal) => {
                if (legal.student === student.student) {
                    found = true
                }
            })
            if (!found) {
                mismatchedStudents.push(student)
            }
        })
        throw new Error("Students not available at times teacher is available: " + mismatchedStudents.map((student) => student.student.name).join(", "))
    }
    return S_legal
}

const solve = (T: BlockOfTime[], S: StudentAvailability[], heuristics: Heuristics): Scheduled[] | null => {
    const S_legal = getTeacherCompatibleTimes(T, S)
    return null
}