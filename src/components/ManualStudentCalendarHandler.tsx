import type { LessonLength, Schedule, Student } from "lib/types"

import Calendar from "./Calendar"
import { Days, transpose, xorBooleanArrays } from "lib/utils"
import { OnboardStudentsCard } from "./OnboardStudentsCard"
import type { StudentSchema } from "lib/schema"
import { useState } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { type StudioWithStudents } from "~/pages/studios/[slug]"
import { Booking, eventToIdxs, twoDimIdxToBooking, type Event } from "./InteractiveCalendar"

type Props = {
    setStudio: (studio: StudioWithStudents) => void
    studio: StudioWithStudents
    setOpen: (open: boolean) => void
    setEvents: (events: Event[]) => void
    events: Event[]
}
const dayLength: number = 12 * 60

const getSplitName = (name: string): [string, string] => {
    if (!name.includes(" ")) return [name, ""]
    const split = name.split(" ")
    const first = split[0]
    const last = split[split.length - 1]
    return [first!, last!]
}

const getCleanButtonStates = (minutes: LessonLength): boolean[][] => {
    const blocks = dayLength / minutes
    return Array.from({ length: Days.length }, () => 
        Array.from({ length: blocks }, () => false)
    )
}

const getTrueCleanButtonStates = (minutes: LessonLength): boolean[][] => {
    const blocks = dayLength / minutes
    return Array.from({ length: Days.length }, () => 
        Array.from({ length: blocks }, () => true)
    )
}

const SET_MINUTES = 30

export default function ManualStudentCalendarHandler(props: Props) {
    const sb = useSupabaseClient()
    const [minutes, setMinutes] = useState<LessonLength>(30)
    const blocks = dayLength / (SET_MINUTES)
    const [buttonStates, setButtonStates] = useState<boolean[][]>(getCleanButtonStates(SET_MINUTES))

    const getPotentialBooking = (student: Student, buttonsT: boolean[][], studio: StudioWithStudents) => {
        if (!studio.events) {
            throw new Error("No events in studio")
        }
        const currentEvents = studio.events!

        currentEvents.forEach(event => {
            const idxs = eventToIdxs(event)
            idxs.forEach(([i, j]) => {
                buttonsT[i]![j] = false
            })
        })

        const isAllFalse = buttonsT.every(row => row.every(cell => !cell))

        const getBookingFromButtons = (buttons: boolean[][], student: Student): Booking => {
            // grab one of the remaining times, ie the first open true if 30 min len, two consecutive trues if 60 min len
            if (student.lessonLength === 30) {
                // get first idx [number, number] of newButtons that is true
                const firstRow = buttonsT.findIndex(row => row.includes(true))
                const firstTrue = buttonsT[firstRow]!.indexOf(true)
                return twoDimIdxToBooking([firstRow, firstTrue], student.lessonLength)
            } else {
                // get first idx [i, j] of newButtons that is true with [i+1][j] true. error if false
                const transposed = transpose(buttonsT)
                const hasConsecutiveTrue = (row: boolean[]) => {
                    let prev = false
                    return row.some(cell => {
                        if (prev && cell) {
                            return true
                        }
                        prev = cell
                        return false
                    })
                }
                const findConsecutiveTrue = (row: boolean[]): number => {
                    // returns index of the first true in a row with a true after it. else -1
                    let i = 0
                    while (i < row.length - 1) {
                        if (row[i] && row[i + 1]) {
                            return i
                        }
                        i++
                    }
                    return -1
                }

                const firstTrue = transposed.findIndex(hasConsecutiveTrue)
                if (firstTrue === -1) {
                    throw new Error("No consecutive true")
                }
                const firstRow = findConsecutiveTrue(transposed[firstTrue]!)
                if (firstRow === -1) {
                    throw new Error("No consecutive true")
                }
                return twoDimIdxToBooking([firstRow, firstTrue], student.lessonLength)
            }
        }

        if (!isAllFalse) {
            return getBookingFromButtons(buttonsT, student)
        } else {
            const allTrue = getTrueCleanButtonStates(SET_MINUTES)
            currentEvents.forEach(event => {
                const idxs = eventToIdxs(event)
                idxs.forEach(([i, j]) => {
                    allTrue[i]![j] = false
                })
            })
            return getBookingFromButtons(allTrue, student)
        }

    }

    const handleAddStudentSchedule = async (student: Student, schedule: Schedule) => {
        const [first, last] = getSplitName(student.name)
        const dbStudent: Omit<StudentSchema, "id"> = {
            email: student.email,
            first_name: first,
            last_name: last,
            lesson_length: student.lessonLength === 30 ? "30": "60",
            schedule: schedule,
            studio_id: props.studio.id,
        }
        const res = await sb.from("students").insert(dbStudent).select()
        if (res.error) {
            alert("there was an error. try again later.") // FIXME:
        }
        if (!res.data) {
            alert("there was an error. try again later.") // FIXME:
        }
        const studentSchema = res.data![0] as StudentSchema
        const buttons = transpose(buttonStates)
        setButtonStates(getCleanButtonStates(SET_MINUTES))
        const newStudents = [...props.studio.students, studentSchema]
        props.setStudio({...props.studio, students: newStudents})

        if (props.events && props.events.length >= 1) {
            const potentialBooking = getPotentialBooking(student, buttons, props.studio)
            props.setEvents([...props.events, {
                id: Math.random().toString(36).substring(7),
                name: student.name,
                booking: potentialBooking,
                other_avail_times: buttons,
                student_id: studentSchema.id
            }])
        }
    }

    return(
        <div className="flex flex-row w-full max-h-[85vh]">
            <OnboardStudentsCard 
                buttonStates={buttonStates}
                minutes={minutes}
                setMinutes={setMinutes}
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                addStudentSchedule={handleAddStudentSchedule}
                setOpen={props.setOpen}
            />
            <Calendar 
                minutes={minutes}
                buttonStates={buttonStates}
                setButtonStates={setButtonStates}
                blocks={blocks}
            />
        </div>
    )
}