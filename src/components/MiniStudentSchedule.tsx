import { type StudentSchema } from "lib/schema"
import type { Day, Schedule, Time } from "lib/types"

type Props = {
    student: StudentSchema
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
                formattedParts.push(<p key={j}><strong>{day}</strong>:</p>)
                formattedParts.push(<p>{formatTime(time.start)} - {formatTime(time.end)}</p>)
            } else {
                formattedParts.push(<p key={j}>{formatTime(time.start)} - {formatTime(time.end)}</p>);
            }
        }
  
        ps.push(<div className="mt-2" key={i}>{formattedParts}</div>);
    }

    

    return ps;
}

export default function MiniStudentSchedule(props: Props) {
    const { student } = props
    return (
        <div className="overflow-auto max-h-[45vh]">
            <div className="">{formatSchedule(student.schedule)}</div>
        </div>
    )
}