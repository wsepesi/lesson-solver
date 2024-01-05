import type { LessonLength, Schedule, State } from "lib/types"

import Calendar from "./Calendar"
import { CardWithSubmit } from "./CardWithSubmit"

type Props = {
    minutes: LessonLength
    setState: (state: State) => void
    setTeacherSchedule: (schedule: Schedule) => void
    handleSubmit: () => void
    setButtonStates: (buttonStates: boolean[][]) => void
    buttonStates: boolean[][]
}

const dayLength: number = 12 * 60

export default function CalendarHandler(props: Props) {
    const minutes = props.minutes
    const blocks = dayLength / (minutes)
    // const [buttonStates, setButtonStates] = useState<boolean[][]>(
    //     Array.from({ length: Days.length }, () => 
    //         Array.from({ length: blocks }, () => false)
    //     )
    // )

    const { buttonStates, setButtonStates } = props

    return(
        <div className="flex flex-row w-full max-h-[85vh]">
            <CardWithSubmit
                setState={props.setState}
                setTeacherSchedule={props.setTeacherSchedule}
                buttonStates={buttonStates}
                handleSubmit={props.handleSubmit}
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