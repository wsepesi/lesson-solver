import {
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"

import { Button } from "./ui/button"

export default function SolveScheduleDialog() {
    return(
        <>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Schedule your bookings</DialogTitle>
                <DialogDescription>
                    Make sure you&apos;ve onboarded all of your students before you finalize your schedule!
                </DialogDescription>
                </DialogHeader>
                    {/* <p>hi</p> */}
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