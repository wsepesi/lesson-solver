"use client";

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"

import { Days } from "lib/utils"
import { Toggle } from "./ui/toggle"
import { useState } from "react"

type Props = {
    minutes: number
    buttonStates: boolean[][]
    setButtonStates: (buttonStates: boolean[][]) => void
    blocks: number
    showWeekends?: boolean
}

export default function Calendar(props: Props) {
    const { buttonStates, setButtonStates, blocks, showWeekends = true } = props
    // const minutes = 30
    const [isSelecting, setSelecting] = useState(false)
    
    // Filter days based on showWeekends preference
    const displayDays = showWeekends ? Days : Days.slice(0, 5) // Mon-Fri only

    const handleClick = (i: number, j: number) => {
        const newButtonStates = [...buttonStates]
        newButtonStates[j]![i] = !newButtonStates[j]![i]
        setButtonStates(newButtonStates)
    }

    const handleMouseDown = (i: number, j: number) => {
        handleClick(i, j)
        setSelecting(true)
    }

    const handleMouseUp = () => {
        setSelecting(false)
    }

    const handleMouseOver = (i: number, j: number) => {
        if (isSelecting) handleClick(i, j)
    }
    
    return (
        <div className="px-5 overflow-auto h-full mr-4">
            {/* <Table className="max-w-[50vw]">
             */}
             <Table className="w-full">
                <TableCaption>Calendar</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead></TableHead>
                        {displayDays.map((day, i) => (
                            <TableHead className={`w-[7rem] px-2 ${i === displayDays.length ? "text-right" : ""} text-center`} key={i}>{day}</TableHead>
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
                            {displayDays.map((_, j) => (
                                <TableCell key={j} className="p-0 m-0 h-full">
                                    <Toggle 
                                        className="data-[state=on]:bg-emerald-600 w-full rounded-none px-0 m-0 py-0 min-h-full"
                                        pressed={buttonStates[j]![i]}
                                        onMouseDown={() => handleMouseDown(i, j)}
                                        onMouseUp={handleMouseUp}
                                        onMouseOver={() => handleMouseOver(i, j)}
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