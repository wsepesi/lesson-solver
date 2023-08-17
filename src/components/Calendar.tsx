import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"

import { Toggle } from "./ui/toggle"
import { useState } from "react"

type Props = {
    minutes: LessonLength
}

const Days: Day[] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
]

const dayLength: number = 12 * 60

export default function Calendar(props: Props) {
    const minutes = props.minutes === "30" ? 30 : 60
    const blocks = dayLength / (minutes)
    const [buttonStates, setButtonStates] = useState<boolean[][]>(
        Array.from({ length: Days.length }, () => 
            Array.from({ length: blocks }, () => false)
        )
    )
    return (
        <Table className="w-[50vw]">
            <TableCaption>Calendar</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead></TableHead>
                    {Days.map((day, i) => (
                        <TableHead className={`w-[6rem] px-2 ${i === Days.length ? "text-right" : ""} text-center`} key={i}>{day}</TableHead>
                    ))}
                </TableRow>
            </TableHeader>     
            <TableBody>
                {Array.from({ length: blocks }).map((_, i) => (
                    <TableRow key={i} className="">
                        <TableCell className="">
                            {minutes === 60 ? `${9 + i}:00` : `${!(i % 2) ? `${9 + (i / 2)}:00` : `${9 + Math.floor(i / 2)}:30`}`}
                        </TableCell>
                        {Days.map((_, j) => (
                            <TableCell key={j} className="">
                                <Toggle 
                                    className="data-[state='on']:bg-emerald-500 w-full rounded-none"
                                    pressed={buttonStates[j]![i]}
                                    onClick={() => {
                                        const newButtonStates = [...buttonStates]
                                        newButtonStates[j]![i] = !newButtonStates[j]![i]
                                        setButtonStates(newButtonStates)
                                    }}
                                >
                                </Toggle>
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}