import { type StudentSchema } from "lib/schema"
import type { Day, LessonLength, Schedule, Time } from "lib/types"
import { Button } from "./ui/button"
import { Dialog, DialogTrigger } from "./ui/dialog"
import SetAvailabilityDialog from "./SetAvailabilityDialog"
import { useState } from "react"
import { scheduleToButtons } from "lib/heur_solver"
import { type StudioWithStudents } from "~/pages/studios/[slug]"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { buttonsToSchedule, resolveLessonLength } from "lib/utils"

type Props = {
    student: StudentSchema
    studio: StudioWithStudents
    setStudio: (studio: StudioWithStudents) => void
}

const formatTime = (time: Time): string => {
    // format as hh:mm am/pm. note that time's minute is a number, single digit we need to prefix a 0
    const hour = time.hour > 12 ? time.hour - 12 : time.hour
    const minute = time.minute < 10 ? `0${time.minute}` : time.minute
    const ampm = time.hour >= 12 ? "pm" : "am"
    return `${hour}:${minute} ${ampm}`
}

const formatSchedule = (schedule: Schedule): React.ReactElement[] => {
    const ps: React.ReactElement[] = [];
    const days = Object.keys(schedule)
    days.sort((a, b) => {
        if (a === "Monday") return -1
        if (b === "Monday") return 1
        if (a === "Tuesday") return -1
        if (b === "Tuesday") return 1
        if (a === "Wednesday") return -1
        if (b === "Wednesday") return 1
        if (a === "Thursday") return -1
        if (b === "Thursday") return 1
        if (a === "Friday") return -1
        if (b === "Friday") return 1
        if (a === "Saturday") return -1
        if (b === "Saturday") return 1
        if (a === "Sunday") return -1
        if (b === "Sunday") return 1
        return 0
    })
    for (let i = 0; i < days.length; i++) {
        const day = days[i] as Day
        const times = schedule[day]!
        const formattedParts: React.ReactNode[] = [];
  
        for (let j = 0; j < times.length; j++) {
            const time = times[j]!;
            if (j === 0) {
                formattedParts.push(<p key={`f${i}s${j}`}><strong>{day}</strong>:</p>)
                formattedParts.push(<p>{formatTime(time.start)} - {formatTime(time.end)}</p>)
            } else {
                formattedParts.push(<p key={`${i}${j}`}>{formatTime(time.start)} - {formatTime(time.end)}</p>);
            }
        }
  
        ps.push(<div className="mt-2" key={i}>{formattedParts}</div>);
    }

    return ps;
}



export default function MiniStudentSchedule(props: Props) {
    const supabaseClient = useSupabaseClient()
    const handleEditAvailability = async () => {
        // update studio with new availability
        console.log(studio)
        const newSchedule: Schedule = buttonsToSchedule(myAvailability, 30) // HAS TO BE 30. EVEN IF HOUR LONG LESSON. THIS IS ACTUALLY BETTER BECAUSE LESSONS CAN START ON THE 30 ANYWAY
        const newStudent = { ...student, schedule: newSchedule }
        const newStudents = studio.students.map(s => s.id === student.id ? newStudent : s)
        setStudio({ ...studio, students: newStudents })

        // update students in database
        const res = await supabaseClient.from("students").update(newStudent).eq("id", student.id)
        if (res.error) {
            console.error(res.error)
        }

        setEditAvailability(false)
    }
    const { student, studio, setStudio } = props
    const [editAvailability, setEditAvailability] = useState(false)
    const [myAvailability, setMyAvailability] = useState<boolean[][]>(scheduleToButtons(student.schedule))
    return (
        <div className="overflow-auto max-h-[45vh]">
            <div className="">{formatSchedule(student.schedule)}</div>
            <Dialog open={editAvailability} onOpenChange={setEditAvailability}>
                <DialogTrigger asChild>
                  <Button className="w-full">Edit Availability</Button>
                </DialogTrigger>
                <SetAvailabilityDialog 
                  // eslint-disable-next-line @typescript-eslint/no-misused-promises
                  handleSubmit={handleEditAvailability}
                  myAvailability={myAvailability}
                  setMyAvailability={setMyAvailability}
                />
            </Dialog>
        </div>
    )
}