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
    studio: StudioWithStudents,
    isChamberMode?: boolean
}

export default function SendToStudentsDialog(props: Props) {
    const { isChamberMode = false } = props;

    const handleClick = () => {
        props.setTaskStatus(props.taskStatus.map((status, i) => props.taskIdx === i ? true : status))
        props.setOpen(false)
    }

    return(
        <>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>
                    {isChamberMode ? "Invite group members" : "Send out an availability survey"}
                </DialogTitle>
                <DialogDescription>
                    {isChamberMode
                        ? "Share the following link with your chamber group members so they can enter their availability."
                        : "Send the following link to your students to fill out their availability. The studio code is already included in the link."
                    }
                </DialogDescription>
                </DialogHeader>
                    <div className="my-4 p-3 bg-gray-100 rounded border">
                        <a href={`https://usecadenza.com/enroll?code=${props.studio.code}`} className="text-blue-600 hover:text-blue-800 underline break-all">
                            usecadenza.com/enroll?code={props.studio.code}
                        </a>
                    </div>
                    <p className="text-sm text-gray-600">
                        {isChamberMode ? "Group" : "Studio"} code: <span className="font-mono font-bold">{props.studio.code}</span>
                    </p>
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