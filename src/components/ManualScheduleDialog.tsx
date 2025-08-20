"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

import { Button } from "./ui/button";
import { Label } from "./ui/label";
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
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState(false)

    return (
      <Dialog
        open={open}
        onOpenChange={() => {
          setOpen(!open)
          if (uploading === true) setUploading(false)
        }}
      >
        <DialogTrigger asChild>
          <Button className="w-full">Add Student Schedules Manually</Button>
        </DialogTrigger>
        {uploading ? (
          <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-4">
            <DialogHeader>
              <DialogTitle>Manual Schedule Entry</DialogTitle>
            </DialogHeader>
            <ManualStudentScheduling 
              studio={props.studio}
              setStudio={props.setStudio}
              setOpen={() => {
                setOpen(false)
                setUploading(false)
              }}
              events={props.events}
              setEvents={props.setEvents}
              taskStatus={props.taskStatus}
              setTaskStatus={props.setTaskStatus}
            />
          </DialogContent>
          ) : 
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Student Schedules Manually</DialogTitle>
            <DialogDescription>
              Manage student schedules directly, without sending them an onboarding link. Use our calendar to fill in schedules.
            </DialogDescription>
          </DialogHeader>
          
          <div className="gap-4 py-4 flex flex-row justify-center items-center">
            <div className="flex-col">
                <Label>Use Calendar</Label>
                <Button className="w-full" onClick={() => {setUploading(true)}}>Go</Button>
            </div>
            {/* <h3 className="font-thin px-5">OR</h3>
            <div className="flex-col">
                <Label>Upload Data</Label>
                <Button className="w-full">Go</Button>
            </div> */}
          </div>
        
        </DialogContent>
        }
      </Dialog>
    )
  }