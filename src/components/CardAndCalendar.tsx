import { Days, buttonsToSchedule } from "lib/utils";

import Calendar from "./Calendar";
import { CardWithForm } from "./CardWithForm";
import { useState } from "react";

type Props = {
    studentSchedules: StudentSchedule[]
    setStudentSchedules: (studentSchedule: StudentSchedule[]) => void
    minutes: LessonLength
    setMinutes: (minutes: LessonLength) => void
    setState: (state: State) => void
}

const dayLength: number = 12 * 60

export function CardAndCalendar(props: Props) {
    const { studentSchedules, setStudentSchedules } = props

    const minutes = props.minutes === "30" ? 30 : 60
    const blocks = dayLength / (minutes)
    const [buttonStates, setButtonStates] = useState<boolean[][]>(
        Array.from({ length: Days.length }, () => 
            Array.from({ length: blocks }, () => false)
        )
    )

    const reset = (func: () => void) => {
        setButtonStates(
            Array.from({ length: Days.length }, () => 
                Array.from({ length: blocks }, () => false)
            )
        )
        func()
    }

    const addStudentSchedule = (student: Student, buttonStates: boolean[][]) => {
        const newStudentSchedule: StudentSchedule = {
            student: student,
            schedule: buttonsToSchedule(buttonStates, props.minutes)
        }

        setStudentSchedules([...studentSchedules, newStudentSchedule])
    }

    return(
        <div className="flex flex-row w-full">
            <CardWithForm 
                addStudentSchedule={addStudentSchedule} 
                buttonStates={buttonStates}
                minutes={props.minutes}
                setMinutes={props.setMinutes}
                setState={props.setState}
                reset={reset}
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