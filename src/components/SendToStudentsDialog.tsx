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
import { type StudioWithStudents } from "~/pages/studios/[slug]"

type Props = {
    taskStatus: boolean[],
    setTaskStatus: React.Dispatch<React.SetStateAction<boolean[]>>,
    taskIdx: number,
    setOpen: (input: boolean) => void,
    studio: StudioWithStudents
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
                {/* <DialogHeader>
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
                </DialogFooter> */}
                <DialogHeader>
                <DialogTitle>Send out an availability survey</DialogTitle>
                <DialogDescription>
                    Send the following link to your students to fill out their availability, and tell them to use your 5 digit studio code: {props.studio.code}
                </DialogDescription>
                </DialogHeader>
                    {/* <EmailsInput emails={emails} setEmails={setEmails} /> */}
                    <a href="https://lesson-solver.vercel.app/enroll">lesson-solver.vercel.app/enroll</a>
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