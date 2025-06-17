import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"

import { Days, finalScheduleToButtons } from "lib/utils"
import { Toggle } from "./ui/toggle"
import { type FinalSchedule } from "lib/heur_solver"
import type { Schedule } from "lib/types"

type Props = {
    schedule: FinalSchedule
    avail: Schedule
}

// const getValidIndices = (avail: Schedule, schedule: FinalSchedule, student: Student): { i: number, j: number }[] => {
//     // given a student, output the intersection of slots between the Schedule and the student's schedule, as found from schedule.assignments[i] where i has student.student.name matching name with student.name
//     const studentSchedule: Schedule = schedule.assignments.filter((std) => std.student.student.email === student.email)[0]!.student.schedule
//     // map schedules to buttonstates, then take intersection
// }

export default function OutputCalendar(props: Props) {
    const { schedule } = props
    const buttonStates = finalScheduleToButtons(schedule)
    const blocks = 24
    // const minutes = 30
    // const [isSelecting, setSelecting] = useState(false)

    // const handleClick = (i: number, j: number) => {
    //     const newButtonStates = [...buttonStates]
    //     newButtonStates[j]![i] = !newButtonStates[j]![i]
    //     setButtonStates(newButtonStates)
    // }

    // const handleMouseDown = (i: number, j: number) => {
    //     handleClick(i, j)
    //     setSelecting(true)
    // }

    // const handleMouseUp = () => {
    //     setSelecting(false)
    // }

    // const handleMouseOver = (i: number, j: number) => {
    //     if (isSelecting) handleClick(i, j)
    // }
    
    return (
        <div className="px-5 overflow-auto h-full mr-4 py-10">
            {/* <Table className="max-w-[50vw]">
             */}
             <Table className="w-full">
                <TableCaption>Calendar</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead></TableHead>
                        {Days.map((day, i) => (
                            <TableHead className={`w-[7rem] px-2 ${i === Days.length ? "text-right" : ""} text-center`} key={i}>{day}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>     
                <TableBody>
                    {Array.from({ length: blocks }).map((_, i) => (
                        <TableRow key={i} className="">
                            <TableCell className="">
                                {/* {minutes === 60 ? `${9 + i}:00` : `${!(i % 2) ? `${9 + (i / 2)}:00` : `${9 + Math.floor(i / 2)}:30`}`} */}
                                {`${!(i % 2) ? `${9 + (i / 2)}:00` : `${9 + Math.floor(i / 2)}:30`}`}
                            </TableCell>
                            {Days.map((_, j) => (
                                <TableCell key={j} className="p-0 m-0 h-full">
                                    <Toggle 
                                        className="data-[state=on]:bg-emerald-600 w-full rounded-none px-0 m-0 py-0 min-h-full"
                                        pressed={buttonStates[j]![i] !== 'X'}
                                        // onMouseDown={() => handleMouseDown(i, j)}
                                        // onMouseUp={handleMouseUp}
                                        // onMouseOver={() => handleMouseOver(i, j)}
                                    >
                                        {buttonStates[j]![i] !== 'X' ? buttonStates[j]![i] : ''}
                                    </Toggle>
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}