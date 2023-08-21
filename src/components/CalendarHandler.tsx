import type { LessonLength, Schedule, State } from "lib/types"

import Calendar from "./Calendar"
import { CardWithSubmit } from "./CardWithSubmit"
import { Days } from "lib/utils"
import { useState } from "react"

type Props = {
    minutes: LessonLength
    setState: (state: State) => void
    setTeacherSchedule: (schedule: Schedule) => void
}

const dayLength: number = 12 * 60

export default function CalendarHandler(props: Props) {
    const minutes = props.minutes === "30" ? 30 : 60
    const blocks = dayLength / (minutes)
    const [buttonStates, setButtonStates] = useState<boolean[][]>(
        Array.from({ length: Days.length }, () => 
            Array.from({ length: blocks }, () => false)
        )
    )

    return(
        <div className="flex flex-row w-full">
            <CardWithSubmit
                setState={props.setState}
                setTeacherSchedule={props.setTeacherSchedule}
                buttonStates={buttonStates}
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