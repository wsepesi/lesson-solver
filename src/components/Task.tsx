"use client";

import { Card, CardContent } from "./ui/card"
import {
  Dialog,
  DialogTrigger,
} from "./ui/dialog"

import { Checkbox } from "./ui/checkbox"

type Props = {
    taskStatus: boolean[],
    task: string,
    i: number,
    children: React.ReactNode,
    setTaskStatus: React.Dispatch<React.SetStateAction<boolean[]>>
    open: boolean,
    setOpen: (input: boolean) => void,
}

export function Task(props: Props) {
    const { taskStatus, task, i } = props
  return (
    <Dialog open={props.open} onOpenChange={props.setOpen}>
      <DialogTrigger asChild>
        <Card 
            key={task}
            className={`rounded-md cursor-pointer hover:bg-landing-blue/5 bg-white border border-landing-blue/20
            ${taskStatus[i] && "bg-landing-blue/10 hover:bg-landing-blue/10 cursor-auto"} 
            `}
        >
            <CardContent className="flex items-center space-x-2 p-4 h-[10vh]">
            <Checkbox id={`task-${i}`} checked={taskStatus[i]} />
                <div 
                    className={`mx-4 text-landing-blue
                    ${taskStatus[i] && "line-through text-landing-blue/50"}`} 
                >
                    {task}
                </div>
            </CardContent>
        </Card>
      </DialogTrigger>
      {props.children}
    </Dialog>
  )
}
