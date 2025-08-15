"use client";

import type { LessonLength, Schedule, Student } from "lib/types"

import AdaptiveCalendar from "./scheduling/AdaptiveCalendar"
import { OnboardStudentsCard } from "./OnboardStudentsCard"
import type { StudentSchema } from "lib/schema"
import { useState } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { type StudioWithStudents } from "@/app/(protected)/studios/[slug]/page"
import { type Booking, eventToIdxs, twoDimIdxToBooking, type Event } from "./InteractiveCalendar"
import { SEND_CODE } from "./my-studio"
import type { WeekSchedule } from "lib/scheduling/types"
import { 
  createEmptyWeekSchedule, 
  weekScheduleToLegacySchedule, 
  weekScheduleToButtons,
  formatWeekScheduleDisplay
} from "lib/scheduling/utils"
import { transpose } from "lib/utils"

type Props = {
    setStudio: (studio: StudioWithStudents) => void
    studio: StudioWithStudents
    setOpen: (open: boolean) => void
    setEvents: (events: Event[]) => void
    events: Event[]
    taskStatus: boolean[]
    setTaskStatus: (taskStatus: boolean[]) => void
}

const getSplitName = (name: string): [string, string] => {
    if (!name.includes(" ")) return [name, ""]
    const split = name.split(" ")
    const first = split[0]
    const last = split[split.length - 1]
    return [first!, last!]
}

export default function ManualStudentCalendarWithAdaptive(props: Props) {
    const taskStatus = props.taskStatus
    const setTaskStatus = props.setTaskStatus
    const sb = useSupabaseClient()
    const [minutes, setMinutes] = useState<LessonLength>(30)
    const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(createEmptyWeekSchedule())

    // Convert WeekSchedule to boolean grid for backward compatibility with existing systems
    const getButtonStatesFromWeekSchedule = (): boolean[][] => {
        return weekScheduleToButtons(weekSchedule, 30, 9, 21)
    }

    // Get formatted display text for the week schedule
    const getScheduleDisplayText = (): string => {
        return formatWeekScheduleDisplay(weekSchedule).join('\n')
    }

    const getPotentialBooking = (student: Student, buttonsT: boolean[][], studio: StudioWithStudents) => {
        if (!studio.events) {
            throw new Error("No events in studio")
        }
        const currentEvents = studio.events

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
            const allTrue = weekScheduleToButtons(createEmptyWeekSchedule(), 30, 9, 21)
            // Fill all true initially
            allTrue.forEach(day => day.fill(true))
            currentEvents.forEach(event => {
                const idxs = eventToIdxs(event)
                idxs.forEach(([i, j]) => {
                    allTrue[i]![j] = false
                })
            })
            return getBookingFromButtons(allTrue, student)
        }
    }

    const handleAddStudentSchedule = async (student: Student, _schedule: Schedule) => {
        // Convert WeekSchedule to legacy Schedule format for database storage
        const legacySchedule = weekScheduleToLegacySchedule(weekSchedule) as Schedule
        
        const [first, last] = getSplitName(student.name)
        const dbStudent: Omit<StudentSchema, "id"> = {
            email: student.email,
            first_name: first,
            last_name: last,
            lesson_length: student.lessonLength === 30 ? "30": "60",
            schedule: legacySchedule,
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
        const buttons = transpose(getButtonStatesFromWeekSchedule())
        setWeekSchedule(createEmptyWeekSchedule()) // Reset the calendar
        const newStudents = [...props.studio.students, studentSchema]
        props.setStudio({...props.studio, students: newStudents})
        setTaskStatus(taskStatus.map((status, i) => SEND_CODE === i ? true : status))

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
        <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] gap-8 p-2">
            <div className="lg:w-80 lg:flex-shrink-0 mr-4">
                <OnboardStudentsCard 
                    buttonStates={getButtonStatesFromWeekSchedule()}
                    minutes={minutes}
                    setMinutes={setMinutes}
                    addStudentSchedule={(student: Student, schedule: Schedule) => {
                        void handleAddStudentSchedule(student, schedule);
                    }}
                    setOpen={props.setOpen}
                    scheduleDisplayText={getScheduleDisplayText()}
                />
            </div>
            <div className="flex-1 min-w-0 overflow-auto">
                <AdaptiveCalendar 
                    schedule={weekSchedule}
                    onChange={setWeekSchedule}
                    granularity={30}
                    minTime="09:00"
                    maxTime="21:00"
                    showWeekends={false}
                />
            </div>
        </div>
    )
}