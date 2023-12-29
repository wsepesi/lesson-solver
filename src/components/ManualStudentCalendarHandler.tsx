import type { LessonLength, State } from "lib/types"

import Calendar from "./Calendar"
import { Days } from "lib/utils"
import { OnboardStudentsCard } from "./OnboardStudentsCard"
import { useState } from "react"

type Props = {
    minutes: LessonLength
    setState: (state: State) => void
    handleSubmit: () => void
}

const dayLength: number = 12 * 60

export default function ManualStudentCalendarHandler(props: Props) {
    const minutes = props.minutes === "30" ? 30 : 60
    const blocks = dayLength / (minutes)
    const [buttonStates, setButtonStates] = useState<boolean[][]>(
        Array.from({ length: Days.length }, () => 
            Array.from({ length: blocks }, () => false)
        )
    )

    return(
        <div className="flex flex-row w-full max-h-[85vh]">
            {/* <CardWithSubmit
                setState={props.setState}
                setTeacherSchedule={props.setTeacherSchedule}
                buttonStates={buttonStates}
                handleSubmit={props.handleSubmit}
            /> */}
            <OnboardStudentsCard 
                buttonStates={buttonStates}
                minutes={props.minutes}
                setState={props.setState}
                setMinutes={() => console.log("hello")}
                reset={() => console.log("hello")}
                addStudentSchedule={() => console.log("hello")}
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