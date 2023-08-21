import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"

import { Days } from "lib/utils"
import { Toggle } from "./ui/toggle"

type Props = {
    minutes: number
    buttonStates: boolean[][]
    setButtonStates: (buttonStates: boolean[][]) => void
    blocks: number
}

export default function Calendar(props: Props) {
    const { minutes, buttonStates, setButtonStates, blocks } = props
    
    return (
        <div className="p-5">
            <Table className="max-w-[50vw]">
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
                                        className="data-[state='on']:bg-emerald-600 w-full rounded-none"
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
        </div>
    )
}