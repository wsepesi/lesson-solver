import type { LessonLength, Schedule, Student } from "lib/types"

import Calendar from "./Calendar"
import { Days } from "lib/utils"
import { OnboardStudentsCard } from "./OnboardStudentsCard"
import type { StudentSchema } from "lib/schema"
import { useState } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { type StudioWithStudents } from "~/pages/studios/[slug]"

type Props = {
    setStudio: (studio: StudioWithStudents) => void
    studio: StudioWithStudents
    setOpen: (open: boolean) => void
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

const SET_MINUTES = 30

export default function ManualStudentCalendarHandler(props: Props) {
    const sb = useSupabaseClient()
    const [minutes, setMinutes] = useState<LessonLength>(30)
    const blocks = dayLength / (SET_MINUTES)
    const [buttonStates, setButtonStates] = useState<boolean[][]>(getCleanButtonStates(SET_MINUTES))

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
        setButtonStates(getCleanButtonStates(SET_MINUTES))
        const newStudents = [...props.studio.students, res.data![0] as StudentSchema]
        props.setStudio({...props.studio, students: newStudents})
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