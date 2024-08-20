import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

import { Button } from "./ui/button";
import { Label } from "./ui/label";
import ManualStudentCalendarHandler from "./ManualStudentCalendarHandler";
import type { StudioWithStudents } from "~/pages/studios/[slug]"
import { useState } from "react";
import { type Event } from "./InteractiveCalendar";

type Props = {
  studio: StudioWithStudents
  setStudio: (studio: StudioWithStudents) => void
  events: Event[]
  setEvents: (events: Event[]) => void
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
          <DialogContent className="min-w-[90vw] max-h-[90vh]">
            <ManualStudentCalendarHandler 
              studio={props.studio}
              setStudio={props.setStudio}
              setOpen={() => {
                setOpen(false)
                setUploading(false)
              }}
              events={props.events}
              setEvents={props.setEvents}
            />
          </DialogContent>
          ) : 
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Student Schedules Manually</DialogTitle>
            <DialogDescription>
              Manage student schedules directly, without sending them an onboarding link. Use our calendar to fill in schedules, or upload your data as a spreadsheet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="gap-4 py-4 flex flex-row justify-center items-center">
            <div className="flex-col">
                <Label>Use Calendar</Label>
                <Button className="w-full" onClick={() => {setUploading(true)}}>Go</Button>
            </div>
            <h3 className="font-thin px-5">OR</h3>
            <div className="flex-col">
                <Label>Upload Data</Label>
                <Button className="w-full">Go</Button>
            </div>
          </div>
        
        </DialogContent>
        }
      </Dialog>
    )
  }