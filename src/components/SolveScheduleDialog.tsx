/* eslint-disable @typescript-eslint/no-misused-promises */
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
import { type StudioWithStudents } from "~/pages/studios/[slug]"
import type { StudentSchema } from "lib/schema"
import type { Student } from "lib/types"
import { type FinalSchedule, scheduleToButtons, solve } from "lib/heur_solver"

import type { Event } from "src/components/InteractiveCalendar"
import { finalScheduleToEventList } from "lib/utils"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
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
    setEvents: React.Dispatch<React.SetStateAction<Event[]>>,
    setStudio: (studio: StudioWithStudents) => void,
    setResolveOpen?: (open: boolean) => void
}

const getOriginalStudentSchemaMatchByEmail = (student: Student, students: StudentSchema[]): StudentSchema => {
    const filtered = students.filter((s) => s.email === student.email)
    if (filtered.length > 1) {
        throw new Error(`Multiple students with email ${student.email} found in the studio`)
    }
    if (filtered.length === 0) {
        throw new Error(`No student with email ${student.email} found in the studio`)
    }
    return filtered[0] ? filtered[0] : students[0]!
}

const readyToSolve = (taskStatus: boolean[]): boolean => {
    // true if 0 and 1 are true
    if (taskStatus.length < 2) {
        throw new Error("Task status must have length 2")
    }
    return !!taskStatus[0] && !!taskStatus[1]
}

export default function SolveScheduleDialog(props: Props) {
    const supabaseClient = useSupabaseClient()
    const { setSchedule, setEvents } = props
    const [length, setLength] = useState("1")
    const [breakLength, setBreakLength] = useState("30")
    const [, setLoading] = useState(false)
    const [isError, setIsError] = useState(false)

    const handleClick = async () => {
        if (!readyToSolve(props.taskStatus)) {
            alert("Please fill out student schedules and your schedule before generating a final schedule.")
            return
        }
        setLoading(true)
        try {
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
            const finalSchedOriginalAvail: FinalSchedule = {
                assignments: res.assignments.map((assignment, _i) => ({
                    student: {
                        ...assignment.student,
                        schedule: getOriginalStudentSchemaMatchByEmail(assignment.student.student, props.studio.students).schedule,
                        bsched: scheduleToButtons(getOriginalStudentSchemaMatchByEmail(assignment.student.student, props.studio.students).schedule)
                    },
                    time: assignment.time
                }))
            }
            setSchedule(finalSchedOriginalAvail)
            const eventList = finalScheduleToEventList(finalSchedOriginalAvail, props.studio)
            setEvents(eventList)
            const updateRes = await supabaseClient
                .from("studios")
                .update({ events: eventList })
                .eq("id", props.studio.id)
            if (updateRes.error) {
                console.error(updateRes.error)
                throw new Error("Error updating studio with new events")
            }

            props.setStudio({
                ...props.studio,
                events: eventList
            })

            if (props.setResolveOpen) {
                props.setResolveOpen(false)
            }

        } catch (error) {
            setIsError(true)
        }
        
        setLoading(false)
        if (!isError) {
            props.setTaskStatus(props.taskStatus.map((status, i) => props.taskIdx === i ? true : status))
        }
    }
    
    return(
        <>
            <DialogContent className="sm:max-w-[425px] md:max-w-[80vw] w-[40vw] h-[40vh]">
                {(!isError) ?
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
                :
                <p className="flex items-center h-full">There was an error creating your schedule. This is likely due to an impossible configuration of your availabilty and student availability, so please try to add more time and try again.</p>}
            </DialogContent>
        </>
    )
}