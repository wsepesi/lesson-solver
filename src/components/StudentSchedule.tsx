import Calendar from "./Calendar"
import type { FormSchema } from "./enrollment"
import type { LessonLength } from "lib/types"
import { OnboardStudentCard } from "./OnboardStudentCard"
import type { OnboardingState } from "~/pages/enroll"

type Props = {
    setState: (state: OnboardingState) => void,
    buttonStates: boolean[][],
    setButtonStates: (buttonStates: boolean[][]) => void,
    minutes: LessonLength,
    setMinutes: (minutes: LessonLength) => void,
    studentInfo: FormSchema
}
const dayLength: number = 12 * 60


export default function StudentSchedule(props: Props) {
    const { buttonStates, setButtonStates, setState, minutes, setMinutes } = props
    const numMinutes = minutes === "30" ? 30 : 60
    const blocks = dayLength / (numMinutes)
    return (
        <>
            <div className="flex flex-row w-full">
            <OnboardStudentCard 
                buttonStates={buttonStates}
                minutes={minutes}
                setMinutes={setMinutes}
                setState={setState}
                studentInfo={props.studentInfo}
            />
            <Calendar 
                minutes={numMinutes}
                buttonStates={buttonStates}
                setButtonStates={setButtonStates}
                blocks={blocks}
            />
        </div>
        </>
    )
}