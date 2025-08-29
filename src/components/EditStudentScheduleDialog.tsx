"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import EditStudentScheduling from "./EditStudentScheduling";
import type { StudioWithStudents } from "@/app/(protected)/studios/[slug]/page"
import type { StudentSchema } from "lib/db-types";

// Event type previously from InteractiveCalendar - now defined inline
export interface Event {
  id: string;
  name: string;
  booking: {
    day: string;
    timeInterval: { start: number; duration: number };
  };
  student_id: number;
}

type Props = {
  student: StudentSchema;
  studio: StudioWithStudents;
  setStudio: (studio: StudioWithStudents) => void;
  events: Event[];
  setEvents: (events: Event[]) => void;
  setUnscheduledStudents: (students: string[]) => void;
  open: boolean;
  onClose: () => void;
}

export default function EditStudentScheduleDialog(props: Props) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          props.onClose();
        }
      }}
    >
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-4">
        <DialogHeader>
          <DialogTitle>Edit Schedule for {props.student.first_name} {props.student.last_name}</DialogTitle>
          <DialogDescription>
            Modify the availability for this student. Changes may affect their current lesson assignment.
          </DialogDescription>
        </DialogHeader>
        <EditStudentScheduling 
          student={props.student}
          studio={props.studio}
          setStudio={props.setStudio}
          onClose={props.onClose}
          events={props.events}
          setEvents={props.setEvents}
          setUnscheduledStudents={props.setUnscheduledStudents}
        />
      </DialogContent>
    </Dialog>
  )
}