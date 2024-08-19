import {
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"

import { Button } from "./ui/button"
import { Combobox, type Option } from "./Combobox"
import { useState } from "react"
import solve, { type FinalSchedule } from "lib/heur_solver"
import { type StudioWithStudents } from "~/pages/studios/[slug]"

const isPaid = true

const lengthOptions: Option[] = [
    { label: "1", value: "1" },
    { label: "1.5", value: "1.5"},
    { label: "2", value: "2" },
    { label: "2.5", value: "2.5" },
    { label: "3", value: "3" },
]

const breakOptions: Option[] = [
    // { label: "15", value: "15" },
    { label: "30", value: "30" },
    // { label: "45", value: "45" },
    { label: "60", value: "60" },
]

type Props = {
    studio: StudioWithStudents,
    taskStatus: boolean[],
    setTaskStatus: React.Dispatch<React.SetStateAction<boolean[]>>,
    taskIdx: number,
    schedule: FinalSchedule | null,
    setSchedule: React.Dispatch<React.SetStateAction<FinalSchedule | null>>,
}

export default function SolveScheduleDialog(props: Props) {
    const { schedule, setSchedule } = props
    // const [config, setConfig] = useState(true)
    const [length, setLength] = useState("1")
    const [breakLength, setBreakLength] = useState("30")
    const [loading, setLoading] = useState(false)
    // const [schedule, setSchedule] = useState<FinalSchedule | null>(null)

    const handleClick = () => {
        setLoading(true)
        const res = solve(
            props.studio.students.map((student) => (
                {
                student: {
                    email: student.email,
                    name: student.first_name!,
                    lessonLength: student.lesson_length === "30" ? 30 : 60,
                },
                schedule: student.schedule,
                }
            )), 
            props.studio.owner_schedule, 
            {
                numConsecHalfHours: Number(length) * 2,
                breakLenInHalfHours: Number(breakLength) / 30
            }
        )
        setSchedule(res)
        setLoading(false)
        props.setTaskStatus(props.taskStatus.map((status, i) => props.taskIdx === i ? true : status))
    }
    
    return(
        <>
            {/* <DialogContent className="sm:max-w-[425px] md:max-w-[80vw] w-[40vw] h-[40vh]"> */}
            <DialogContent className="min-w-[100vw] h-[100vh]">
                {!schedule &&
                <>
                    <DialogHeader>
                    <DialogTitle>Schedule your bookings</DialogTitle>
                    <DialogDescription>
                        Make sure you&apos;ve onboarded all of your students before you finalize your schedule!
                        {!isPaid && (
                            <p className="my-2">On a free plan you only have <strong>ONE</strong> free schedule solve!</p>)}
                    </DialogDescription>
                    </DialogHeader>
                    <div className="">
                        <p>Create a schedule with no more than <Combobox value={length} setValue={setLength} options={lengthOptions} /> hours of back-to-back events without a <Combobox value={breakLength} setValue={setBreakLength} options={breakOptions} /> minutes break.</p>
                    </div>
                    <DialogFooter>
                        <Button 
                            type="submit"
                            onClick={handleClick}
                        >Schedule</Button>
                    </DialogFooter>
                </>
                }
            </DialogContent>
        </>
    )
}