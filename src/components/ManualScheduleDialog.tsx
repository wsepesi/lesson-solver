"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import ManualStudentScheduling from "./ManualStudentScheduling";
import type { StudioWithStudents } from "@/app/(protected)/studios/[slug]/page"
import { useState } from "react";
// Event type previously from InteractiveCalendar - now defined inline
export interface Event {
  id: string;
  name: string;
  booking: {
    day: string;
    timeInterval: { start: number; duration: number };
  };
  student_id: number;
};

type Props = {
  studio: StudioWithStudents
  setStudio: (studio: StudioWithStudents) => void
  events: Event[]
  setEvents: (events: Event[]) => void
  taskStatus: boolean[]
  setTaskStatus: (taskStatus: boolean[]) => void
}
export default function ManualScheduleDialog(props: Props) {
  const [open, setOpen] = useState(false)

    return (
      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogTrigger asChild>
          <Button className="w-full bg-landing-blue text-white hover:bg-landing-blue-hover">Add Student Schedules Manually</Button>
        </DialogTrigger>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-4">
          <DialogHeader>
            <DialogTitle>Manual Schedule Entry</DialogTitle>
          </DialogHeader>
          <ManualStudentScheduling 
            studio={props.studio}
            setStudio={props.setStudio}
            setOpen={() => setOpen(false)}
            events={props.events}
            setEvents={props.setEvents}
            taskStatus={props.taskStatus}
            setTaskStatus={props.setTaskStatus}
          />
        </DialogContent>
      </Dialog>
    )
  }