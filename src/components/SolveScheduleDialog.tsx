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

const isPaid = true

const lengthOptions: Option[] = [
    { label: "1", value: "1" },
    { label: "1.5", value: "1.5"},
    { label: "2", value: "2" },
    { label: "2.5", value: "2.5" },
    { label: "3", value: "3" },
]

const breakOptions: Option[] = [
    { label: "15", value: "15" },
    { label: "30", value: "30" },
    { label: "45", value: "45" },
    { label: "60", value: "60" },
]

export default function SolveScheduleDialog() {
    const [config, setConfig] = useState(true)
    const [length, setLength] = useState("1")
    const [breakLength, setBreakLength] = useState("15")
    return(
        <>
            <DialogContent className="sm:max-w-[425px] md:max-w-[80vw] w-[40vw] h-[40vh]">
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
                        onClick={() => console.log("hello")}
                    >Schedule</Button>
                </DialogFooter>
            </DialogContent>
        </>
    )
}