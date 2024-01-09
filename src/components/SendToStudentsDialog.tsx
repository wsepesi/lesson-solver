import {
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"

import { Button } from "./ui/button"
import EmailsInput from "./EmailsInput"
import { useState } from "react"

type Props = {
    taskStatus: boolean[],
    setTaskStatus: React.Dispatch<React.SetStateAction<boolean[]>>,
    taskIdx: number,
    setOpen: (input: boolean) => void,
}

export default function SendToStudentsDialog(props: Props) {
    const [emails, setEmails] = useState<string[]>([])
    const handleClick = () => {
        if (emails.length === 0) {
            alert("Please enter at least one email")
        } else {
            console.log(emails)
            props.setTaskStatus(props.taskStatus.map((status, i) => props.taskIdx === i ? true : status))
            setEmails([])
            props.setOpen(false)
        }
    }
    return(
        <>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Send out an availability survey</DialogTitle>
                <DialogDescription>
                    Enter your student&apos;s emails below and we&apos;ll send them a survey to fill out their availability.
                </DialogDescription>
                </DialogHeader>
                    <EmailsInput emails={emails} setEmails={setEmails} />
                <DialogFooter>
                    <Button 
                        type="submit"
                        onClick={handleClick}
                    >Send</Button>
                </DialogFooter>
            </DialogContent>
        </>
    )
}