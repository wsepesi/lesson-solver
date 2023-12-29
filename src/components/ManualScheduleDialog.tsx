import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

import { Button } from "./ui/button";
import CalendarHandler from "./CalendarHandler";
import { Label } from "./ui/label";
import ManualStudentCalendarHandler from "./ManualStudentCalendarHandler";
import { useState } from "react";

export default function ManualScheduleDialog() {
  const [uploading, setUploading] = useState(false)

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full">Add Student Schedules Manually</Button>
        </DialogTrigger>
        {uploading ? (
          <DialogContent className="min-w-[80vw] max-h-[90vh]">
            <ManualStudentCalendarHandler 
              minutes={"30"}
              setState={() => console.log("hello")}
              handleSubmit={() => console.log("hello")}
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