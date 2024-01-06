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
            className={`rounded-md cursor-pointer hover:bg-gray-300
            ${taskStatus[i] && "bg-gray-100 hover:bg-gray-100 cursor-auto"} 
            `}
        >
            <CardContent className="flex items-center space-x-2 p-4 h-[10vh]">
            <Checkbox id={`task-${i}`} checked={taskStatus[i]} />
                <div 
                    className={`mx-4 
                    ${taskStatus[i] && "line-through"}`} 
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
