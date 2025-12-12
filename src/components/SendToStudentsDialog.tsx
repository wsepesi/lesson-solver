"use client";

import {
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"

import { Button } from "./ui/button"
import { type StudioWithStudents } from "@/app/(protected)/studios/[slug]/page"

type Props = {
    taskStatus: boolean[],
    setTaskStatus: React.Dispatch<React.SetStateAction<boolean[]>>,
    taskIdx: number,
    setOpen: (input: boolean) => void,
    studio: StudioWithStudents
}

export default function SendToStudentsDialog(props: Props) {
    const handleClick = () => {
        // if (emails.length === 0) {
        //     alert("Please enter at least one email")
        // } else {
        //     console.log(emails)
        //     props.setTaskStatus(props.taskStatus.map((status, i) => props.taskIdx === i ? true : status))
        //     setEmails([])
        //     props.setOpen(false)
        // }
        props.setTaskStatus(props.taskStatus.map((status, i) => props.taskIdx === i ? true : status))
        props.setOpen(false)
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
                    Send the following link to your students to fill out their availability. The studio code is already included in the link.
                </DialogDescription>
                </DialogHeader>
                    {/* <EmailsInput emails={emails} setEmails={setEmails} /> */}
                    <div className="my-4 p-3 bg-gray-100 rounded border">
                        <a href={`https://usecadenza.com/enroll?code=${props.studio.code}`} className="text-blue-600 hover:text-blue-800 underline break-all">
                            usecadenza.com/enroll?code={props.studio.code}
                        </a>
                    </div>
                <DialogFooter>
                    <Button 
                        type="submit"
                        onClick={handleClick}
                    >Done!</Button>
                </DialogFooter>
            </DialogContent>
        </>
    )
}