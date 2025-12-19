"use client";

import type { LessonLength } from "lib/types"
import { AdaptiveCalendar } from "./scheduling/AdaptiveCalendar"
import { OnboardStudentsCard } from "./OnboardStudentsCard"
import type { StudentSchema } from "lib/db-types"
import { useState } from "react"
import { type StudioWithStudents } from "@/app/(protected)/studios/[slug]/page"
// Event type previously from InteractiveCalendar - now defined inline
export interface Event {
  id: string;
  name: string;
  booking: {
    day: string;
    timeInterval: { start: number; duration: number };
  };
  student_id: number;
}
import { SEND_CODE } from "./my-studio"
import type { WeekSchedule } from "lib/scheduling/types"
import { 
  createEmptyWeekSchedule, 
  weekScheduleToJsonSchedule, 
  formatWeekScheduleDisplay
} from "lib/scheduling/utils"
import { createClient } from "@/utils/supabase/client"
import type { Student, Schedule } from "lib/types"

type Props = {
    setStudio: (studio: StudioWithStudents) => void
    studio: StudioWithStudents
    setOpen: (open: boolean) => void
    setEvents: (events: Event[]) => void
    events: Event[]
    taskStatus: boolean[]
    setTaskStatus: (taskStatus: boolean[]) => void
    isChamberMode?: boolean
}

const getSplitName = (name: string): [string, string] => {
    if (!name.includes(" ")) return [name, ""]
    const split = name.split(" ")
    const first = split[0]
    const last = split[split.length - 1]
    return [first!, last!]
}

export default function ManualStudentScheduling(props: Props) {
    const taskStatus = props.taskStatus
    const setTaskStatus = props.setTaskStatus
    const sb = createClient()
    // For chamber mode, use the fixed rehearsal duration; otherwise default to 30
    const defaultDuration = props.isChamberMode
        ? (props.studio.rehearsal_duration_minutes ?? 60)
        : 30
    const [minutes, setMinutes] = useState<LessonLength>(defaultDuration)
    const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(createEmptyWeekSchedule())

    // Get formatted display text for the week schedule
    const getScheduleDisplayText = (): string => {
        return formatWeekScheduleDisplay(weekSchedule).join('\n')
    }

    // Check if schedule is empty
    const isScheduleEmpty = (): boolean => {
        return weekSchedule.days.every(day => day.blocks.length === 0)
    }

    const handleAddStudentSchedule = async (student: Student, _schedule: Schedule) => {
        // Convert WeekSchedule to JSON Schedule format for database storage
        const jsonSchedule = weekScheduleToJsonSchedule(weekSchedule) as unknown as Schedule
        
        const [first, last] = getSplitName(student.name)
        const dbStudent: Omit<StudentSchema, "id"> = {
            email: student.email,
            first_name: first,
            last_name: last,
            lesson_length: student.lessonLength === 30 ? "30": "60",
            lesson_duration_minutes: student.lessonLength,
            schedule: jsonSchedule,
            studio_id: props.studio.id,
            created_at: new Date().toISOString(),
        }
        const { data, error } = await sb.from("students").insert(dbStudent).select()
        if (error) {
            alert("there was an error. try again later.") // FIXME:
            return
        }
        if (!data || data.length === 0) {
            alert("there was an error. try again later.") // FIXME:
            return
        }
        const studentSchema = data[0] as StudentSchema
        setWeekSchedule(createEmptyWeekSchedule()) // Reset the calendar
        const newStudents = [...props.studio.students, studentSchema]
        props.setStudio({...props.studio, students: newStudents})
        setTaskStatus(taskStatus.map((status, i) => SEND_CODE === i ? true : status))

        // Note: The legacy component had complex event generation logic with grid conversion
        // This simplified version focuses on the core functionality of adding students
        // Event generation can be handled by other parts of the application
    }

    return(
        <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] gap-8 p-2">
            <div className="lg:w-80 lg:flex-shrink-0 mr-4">
                <OnboardStudentsCard
                    buttonStates={[]} // Legacy prop - no longer used with new system
                    minutes={minutes}
                    setMinutes={setMinutes}
                    addStudentSchedule={(student: Student, schedule: Schedule) => {
                        void handleAddStudentSchedule(student, schedule);
                    }}
                    setOpen={props.setOpen}
                    scheduleDisplayText={getScheduleDisplayText()}
                    isScheduleEmpty={isScheduleEmpty}
                    studio={props.studio}
                    isChamberMode={props.isChamberMode}
                />
            </div>
            <div className="flex-1 min-w-0 overflow-auto max-h-[calc(100vh-8rem)]">
                <AdaptiveCalendar 
                    schedule={weekSchedule}
                    onChange={setWeekSchedule}
                    granularity={30}
                    showWeekends={false}
                />
            </div>
        </div>
    )
}