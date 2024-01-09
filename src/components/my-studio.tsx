/* eslint-disable @typescript-eslint/no-misused-promises */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"

/**
 * This code was generated by v0 by Vercel.
 * @see https://v0.dev/t/1frRkxHriYN
 */
import { Badge } from "src/components/ui/badge"
import { Button } from "src/components/ui/button"
import { Cross1Icon } from "@radix-ui/react-icons"
import { Days, buttonsToSchedule, scheduleToButtons } from "lib/utils"
import ManualScheduleDialog from "./ManualScheduleDialog"
import { Progress } from "./ui/progress"
import SendToStudentsDialog from "./SendToStudentsDialog"
import SetAvailabilityDialog from "./SetAvailabilityDialog"
import SolveScheduleDialog from "./SolveScheduleDialog"
import { Task } from "./Task"
import type { StudioWithStudents } from "~/pages/studios/[slug]"
import { useState } from "react"
import { type StudentSchema } from "lib/schema"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useRouter } from "next/router"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import MiniStudentSchedule from "./MiniStudentSchedule"

type Props = {
  studio: StudioWithStudents,
  setStudio: (studio: StudioWithStudents) => void,
}

type Task = {
  name: string,
  dialogComponent: React.ReactNode,
}

const AVAILABILITY = 0
const SEND_CODE = 1
const CREATE_SCHEDULE = 2
const isPaid = true

const minutes = 30
const dayLength: number = 12 * 60
const blocks = dayLength / (minutes)

type Progress = "Not Started" | "In Progress" | "Completed"

const getStudentProgress = (student: StudentSchema) => {
  return student.schedule === null ?  "Not Started" : "Completed"
}

export function MyStudio(props: Props) {
  const supabaseClient = useSupabaseClient()
  const router = useRouter()

  const { studio } = props

  // TODO: populate this from DB on boot
  const [taskStatus, setTaskStatus] = useState<boolean[]>([(studio.owner_schedule !== null && studio.owner_schedule !== undefined), studio.students.length !== 0, false])
  const [myAvailability, setMyAvailability] = useState<boolean[][]>((studio.owner_schedule !== null && studio.owner_schedule !== undefined) ?
    scheduleToButtons(studio.owner_schedule, 30) :
    Array.from({ length: Days.length }, () => 
        Array.from({ length: blocks }, () => false)
    )
  )

  const [taskOpen, setTaskOpen] = useState<boolean[]>([false, false, false])
  const [editAvailability, setEditAvailability] = useState<boolean>(false)

  const handleAvailabilitySubmit = async () => {
    const calendarJson = buttonsToSchedule(myAvailability, 30)
    const res = await supabaseClient.from("studios").update({
      owner_schedule: calendarJson
    }).eq("id", studio.id)

    if (res.error) {
      console.log(res.error)
      alert("error, please try again")
    }

    setTaskStatus(taskStatus.map((status, i) => AVAILABILITY === i ? true : status))
    setTaskOpen(taskOpen.map((status, i) => AVAILABILITY === i ? false : status))
  }

  const handleStudentDelete = async (student: StudentSchema) => {
    const res = await supabaseClient.from("students").delete().eq("id", student.id)

    if (res.error) {
      console.log(res.error)
      alert("error, please try again")
    }

    const newStudents = studio.students.filter((s) => s.id !== student.id)
    const newStudio = { ...studio, students: newStudents }
    props.setStudio(newStudio)
  }

  const handleEditAvailability = async () => {
    const calendarJson = buttonsToSchedule(myAvailability, 30)
    const res = await supabaseClient.from("studios").update({
      owner_schedule: calendarJson
    }).eq("id", studio.id)

    if (res.error) {
      console.log(res.error)
      alert("error, please try again")
    }

    setEditAvailability(false)
    // if schedule is empty, set task status to false
    if (myAvailability.every((day) => day.every((block) => !block))) {
      setTaskStatus(taskStatus.map((status, i) => AVAILABILITY === i ? false : status))
    }
  }

  const tasks: Task[] = [
    {
      name: "Set your availability",
      dialogComponent: <SetAvailabilityDialog 
        handleSubmit={handleAvailabilitySubmit}
        myAvailability={myAvailability}
        setMyAvailability={setMyAvailability}
      />
    },
    {
      name: "Send out code to students",
      dialogComponent: <SendToStudentsDialog 
        taskStatus={taskStatus} 
        setTaskStatus={setTaskStatus}
        taskIdx={SEND_CODE}
        setOpen={(input: boolean) => {
          setTaskOpen(taskOpen.map((status, i) => SEND_CODE === i ? input : status))
        }}
        />
    },
    {
      name: "Create your schedule",
      dialogComponent: <SolveScheduleDialog />
    },
  ]

  const handleStudioDelete = async () => {
    
    const res = await supabaseClient.from("studios").delete().eq("id", studio.id)

    if (res.error) {
      console.log(res.error)
      alert("error, please try again")
    }

    await router.push("/studios")
  }

  return (
    <main className="w-full h-full py-1 px-4 md:py-1 md:px-8">
      <section className="mt-12 mb-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Progress</h2>
          <Badge>{taskStatus.reduce((acc, curr) => acc + (curr ? 1 : 0), 0)}/3</Badge>
        </div>
         <Progress className="mt-2" value={
        (taskStatus.reduce((acc, curr) => acc + (curr ? 1 : 0), 0) / taskStatus.length) * 100
      }/>
      </section>
      <header className="mb-8 flex flex-row items-end justify-between">
        <h1 className="text-4xl font-bold tracking-tight">{studio.studio_name}</h1>
        <h3 className="text-xl tracking-tight font-light text-gray-500">Studio Code: {studio.code}</h3>
      </header>
      <div className="flex space-x-10">
        <section className="space-y-6 w-2/3">
          {tasks.map((task, i) => (
            <Task
              key={i}
              taskStatus={taskStatus}
              task={task.name}
              i={i}
              setTaskStatus={setTaskStatus}
              open={taskOpen[i]!}
              setOpen={(input: boolean) => {
                setTaskOpen(taskOpen.map((status, j) => i === j ? input : status))
              }}
            >
              {task.dialogComponent}
            </Task>
          ))}
        </section>
        <aside className="w-1/3 space-y-6">
          <section className="bg-gray-100 p-4 rounded-md">
            <div className="flex flex-row w-full mb-4">
              <h2 className="text-xl font-bold w-full">Enrolled Students</h2>
              <p className="text-right w-full">{studio.students.length} / {isPaid ? 50 : 5} students</p>
              {/* TODO: add a tooltip to explain the limit if the user isnt premium */}
            </div>
            <ul className="space-y-2 flex flex-col">
              {studio.students.length ? (studio.students.map((student) => {
                const progress = getStudentProgress(student)
                return (
                <li key={student.id} className="flex flex-row w-full justify-between">
                  <div className="flex flex-row justify-start items-center">
                    {/* make sure the border has a thin radius and is a circle */}
                    <div 
                      className="w-5 h-5 cursor-pointer hover:bg-slate-200 flex flex-row items-center p-1 border border-gray-300 rounded-full mr-1"
                      onClick={() => handleStudentDelete(student)}
                    >
                      <Cross1Icon className="" />
                    </div>
                    <Popover>
                      <PopoverTrigger>
                        <p className="font-mono px-1 border rounded-md border-black cursor-pointer self-start text-left">{student.first_name} {student.last_name}, {student.email}</p>
                      </PopoverTrigger>
                      <PopoverContent>
                        <MiniStudentSchedule student={student} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Badge 
                  className={`min-w-[6.5vw] flex flex-row justify-center ml-4 h-6 self-center
                  ${progress === "Completed" && "bg-emerald-600"}
                  `} // ${progress === "In Progress" && "bg-yellow-500"}
                  >{progress}</Badge>
                </li>
              )})) : <p className="text-center">No students have been invited or enrolled yet!</p>}
            </ul>
          </section>
          <section className="bg-gray-100 p-4 rounded-md">
            <h2 className="text-xl font-bold mb-4">Admin Tasks</h2>
            <div className="space-y-2">
              <Dialog 
                open={taskOpen[SEND_CODE]} 
                onOpenChange={(input: boolean) => {
                  setTaskOpen(taskOpen.map((status, i) => SEND_CODE === i ? input : status))
                }}
              >
                <DialogTrigger asChild>
                  <Button className="w-full">Invite Students</Button>
                </DialogTrigger>
                <SendToStudentsDialog 
                  taskStatus={taskStatus} 
                  setTaskStatus={setTaskStatus}
                  taskIdx={SEND_CODE}
                  setOpen={(input: boolean) => {
                    setTaskOpen(taskOpen.map((status, i) => SEND_CODE === i ? input : status))
                  }}
                />
              </Dialog>
              <ManualScheduleDialog 
                studio={studio}
                setStudio={props.setStudio}
              />
              {taskStatus[AVAILABILITY] && 
              <Dialog open={editAvailability} onOpenChange={setEditAvailability}>
                <DialogTrigger asChild>
                  <Button className="w-full">Edit Your Availability</Button>
                </DialogTrigger>
                <SetAvailabilityDialog 
                  handleSubmit={handleEditAvailability}
                  myAvailability={myAvailability}
                  setMyAvailability={setMyAvailability}
                />
              </Dialog>
              }
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">Manage Studio</Button>
                </DialogTrigger>
                <DialogContent className="w-[50vw] max-h-[50vh] flex flex-col justify-center items-center">
                  <DialogHeader>
                    <DialogTitle>Manage Studio</DialogTitle>
                    <DialogDescription>
                      Change your studio info, or delete the studio.
                    </DialogDescription>
                  </DialogHeader>
                  {/* <div>
                    <Label>Studio Name</Label>
                    <div className="flex flex-row justify-center items-center">
                      <Input className="w-[20vw]" placeholder="Studio Name" />
                      <Button className="mx-2"><CheckIcon className="w-4 h-4" /></Button>
                    </div>
                  </div> */}
                  {/* <Separator /> */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-[10vw]"variant="destructive">Delete Studio</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          studio and remove the data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleStudioDelete}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DialogContent>
              </Dialog>
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}
