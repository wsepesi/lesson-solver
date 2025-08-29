"use client";

import type { LessonLength } from "lib/types"
import { AdaptiveCalendar } from "./scheduling/AdaptiveCalendar"
import { EditStudentCard } from "./EditStudentCard"
import type { StudentSchema } from "lib/db-types"
import { useState, useEffect } from "react"
import { type StudioWithStudents } from "@/app/(protected)/studios/[slug]/page"

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

import type { WeekSchedule } from "lib/scheduling/types"
import { 
  createEmptyWeekSchedule, 
  weekScheduleToJsonSchedule, 
  formatWeekScheduleDisplay
} from "lib/scheduling/utils"
import { convertScheduleToWeekSchedule } from "lib/scheduling-adapter"
import { createClient } from "@/utils/supabase/client"
import type { Schedule } from "lib/types"

type Props = {
  student: StudentSchema;
  setStudio: (studio: StudioWithStudents) => void;
  studio: StudioWithStudents;
  onClose: () => void;
  setEvents: (events: Event[]) => void;
  events: Event[];
  setUnscheduledStudents: (students: string[]) => void;
}

export default function EditStudentScheduling(props: Props) {
  const sb = createClient()
  const [minutes, setMinutes] = useState<LessonLength>(
    props.student.lesson_duration_minutes ?? 
    (props.student.lesson_length === "30" ? 30 : 60)
  );
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule>(createEmptyWeekSchedule());
  const [loading, setLoading] = useState(false);

  // Load existing student schedule on mount
  useEffect(() => {
    if (props.student.schedule) {
      const studentWeekSchedule = convertScheduleToWeekSchedule(props.student.schedule);
      setWeekSchedule(studentWeekSchedule);
    }
  }, [props.student.schedule]);

  // Get formatted display text for the week schedule
  const getScheduleDisplayText = (): string => {
    return formatWeekScheduleDisplay(weekSchedule).join('\n')
  }

  // Check if schedule is empty
  const isScheduleEmpty = (): boolean => {
    return weekSchedule.days.every(day => day.blocks.length === 0)
  }

  // Check if the student's current assignment is still valid with new schedule
  const isCurrentAssignmentStillValid = (newSchedule: WeekSchedule): boolean => {
    const currentAssignment = props.events.find(event => event.student_id === props.student.id);
    if (!currentAssignment) return true; // No assignment to check
    
    const dayAbbrevs = ['Sun', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    const dayIndex = dayAbbrevs.indexOf(currentAssignment.booking.day);
    if (dayIndex === -1) return false;
    
    const assignedStart = currentAssignment.booking.timeInterval.start;
    const assignedDuration = currentAssignment.booking.timeInterval.duration;
    const assignedEnd = assignedStart + assignedDuration;
    
    // Check if the assigned time overlaps with any available block
    const dayBlocks = newSchedule.days[dayIndex]?.blocks ?? [];
    for (const block of dayBlocks) {
      const blockStart = block.start;
      const blockEnd = block.start + block.duration;
      
      // Check if assignment is fully contained within this block
      if (assignedStart >= blockStart && assignedEnd <= blockEnd) {
        return true;
      }
    }
    
    return false;
  }

  const handleSaveStudentSchedule = async () => {
    if (isScheduleEmpty()) {
      alert("Please set some availability before saving.");
      return;
    }

    setLoading(true);
    
    try {
      // Convert WeekSchedule to JSON Schedule format for database storage
      const jsonSchedule = weekScheduleToJsonSchedule(weekSchedule) as unknown as Schedule;
      
      // Update student in database
      const { error: updateError } = await sb
        .from("students")
        .update({ 
          schedule: jsonSchedule,
          lesson_duration_minutes: minutes,
          lesson_length: minutes === 30 ? "30" : "60" // Keep for backward compatibility
        })
        .eq("id", props.student.id);
      
      if (updateError) {
        console.error("Error updating student:", updateError);
        alert("Error updating student schedule. Please try again.");
        return;
      }

      // Check if current assignment is still valid
      const isAssignmentValid = isCurrentAssignmentStillValid(weekSchedule);
      
      let updatedEvents = props.events;
      let updatedUnscheduled = props.studio.unscheduled_students ?? [];
      
      if (!isAssignmentValid) {
        // Remove student from events and add to unscheduled
        updatedEvents = props.events.filter(event => event.student_id !== props.student.id);
        if (!updatedUnscheduled.includes(props.student.email)) {
          updatedUnscheduled = [...updatedUnscheduled, props.student.email];
        }
        
        // Update studio in database
        const { error: studioError } = await sb
          .from("studios")
          .update({
            events: updatedEvents,
            unscheduled_students: updatedUnscheduled
          })
          .eq("id", props.studio.id);
        
        if (studioError) {
          console.error("Error updating studio:", studioError);
          alert("Error updating schedule assignments. Please try again.");
          return;
        }
      }

      // Update local state
      const updatedStudent: StudentSchema = {
        ...props.student,
        schedule: jsonSchedule,
        lesson_duration_minutes: minutes,
        lesson_length: minutes === 30 ? "30" as const : "60" as const
      };
      
      const newStudents = props.studio.students.map(s => 
        s.id === props.student.id ? updatedStudent : s
      );
      
      props.setStudio({
        ...props.studio,
        students: newStudents,
        events: updatedEvents,
        unscheduled_students: updatedUnscheduled
      });
      
      props.setEvents(updatedEvents);
      props.setUnscheduledStudents(updatedUnscheduled);
      
      props.onClose();
      
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert("Error saving schedule. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-4rem)] gap-8 p-2">
      <div className="lg:w-80 lg:flex-shrink-0 mr-4">
        <EditStudentCard 
          student={props.student}
          minutes={minutes}
          setMinutes={setMinutes}
          onSave={() => void handleSaveStudentSchedule()}
          onClose={props.onClose}
          scheduleDisplayText={getScheduleDisplayText()}
          isScheduleEmpty={isScheduleEmpty}
          studio={props.studio}
          loading={loading}
        />
      </div>
      <div className="flex-1 min-w-0 overflow-auto">
        <AdaptiveCalendar 
          schedule={weekSchedule}
          onChange={setWeekSchedule}
          granularity={30}
          showWeekends={props.studio.calendar_days === 'full_week'}
        />
      </div>
    </div>
  )
}