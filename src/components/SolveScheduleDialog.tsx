"use client";

/* eslint-disable @typescript-eslint/no-misused-promises */
import {
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"

import { Button } from "./ui/button"
import { Combobox, type Option } from "./Combobox"
import { useState } from "react"
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
import { createClient } from "@/utils/supabase/client"
import { createTeacherConfig, convertScheduleToWeekSchedule } from "lib/scheduling-adapter"
import type { ScheduleSolution } from 'lib/scheduling/types'

import { solveSchedule } from 'lib/scheduling/solver'
const isPaid = true

const lengthOptions: Option[] = [
    { label: "1", value: "1" },
    { label: "1.5", value: "1.5"},
    { label: "2", value: "2" },
    { label: "2.5", value: "2.5" },
    { label: "3", value: "3" },
]

const breakOptions: Option[] = [
    // { label: "15", value: "15" },
    { label: "30", value: "30" },
    // { label: "45", value: "45" },
    { label: "60", value: "60" },
]

const backToBackOptions: Option[] = [
    { label: "Agnostic (Current)", value: "agnostic" },
    { label: "Maximize Back-to-Back", value: "maximize" },
    { label: "Minimize Back-to-Back", value: "minimize" },
]

type Props = {
    studio: StudioWithStudents,
    taskStatus: boolean[],
    setTaskStatus: React.Dispatch<React.SetStateAction<boolean[]>>,
    taskIdx: number,
    setEvents: React.Dispatch<React.SetStateAction<Event[]>>,
    setStudio: (studio: StudioWithStudents) => void,
    setResolveOpen?: (open: boolean) => void
}


const readyToSolve = (taskStatus: boolean[]): boolean => {
    // true if 0 and 1 are true
    if (taskStatus.length < 2) {
        throw new Error("Task status must have length 2")
    }
    return !!taskStatus[0] && !!taskStatus[1]
}


// Create events directly from ScheduleSolution with day information
const createEventsFromSolution = (
    solution: ScheduleSolution,
    students: { id: string; name: string; email: string }[],
    studio: StudioWithStudents
): Event[] => {
    const studentLookup = new Map<string, { id: string; name: string; email: string }>();
    for (const student of students) {
        studentLookup.set(student.email, student);
    }
    
    const dayAbbrevs = ['Sun', 'M', 'Tu', 'W', 'Th', 'F', 'Sat'];
    
    return solution.assignments.map((assignment, index) => {
        const student = studentLookup.get(assignment.studentId);
        if (!student) throw new Error(`Student not found: ${assignment.studentId}`);
        
        const studioStudent = studio.students?.find((s) => s.email === student.email);
        
        return {
            id: index.toString(),
            name: student.name,
            booking: {
                day: dayAbbrevs[assignment.dayOfWeek] ?? 'M',
                timeInterval: {
                    start: assignment.startMinute,
                    duration: assignment.durationMinutes
                }
            },
            student_id: studioStudent?.id ?? 0
        };
    });
}

export default function SolveScheduleDialog(props: Props) {
    const supabaseClient = createClient()
    const { setEvents } = props
    const [length, setLength] = useState("1")
    const [breakLength, setBreakLength] = useState("30")
    const [backToBackPreference, setBackToBackPreference] = useState("agnostic")
    const [, setLoading] = useState(false)
    const [isError, setIsError] = useState(false)

    const handleClick = async () => {
        if (!readyToSolve(props.taskStatus)) {
            alert("Please fill out student schedules and your schedule before generating a final schedule.")
            return
        }
        setLoading(true)
        try {
            // Convert studio data to WeekSchedule format
            const teacherSchedule = convertScheduleToWeekSchedule(props.studio.owner_schedule);
            
            // Create teacher config with constraints
            const teacher = createTeacherConfig(teacherSchedule, props.studio.id.toString());
            teacher.constraints.maxConsecutiveMinutes = Number(length) * 60; // Convert hours to minutes
            teacher.constraints.breakDurationMinutes = Number(breakLength); // Already in minutes
            teacher.constraints.backToBackPreference = backToBackPreference as 'maximize' | 'minimize' | 'agnostic';
            
            // Convert students to StudentConfig format
            const students = props.studio.students
                .filter(student => student.schedule) // Only students with availability
                .map(studentSchema => {
                    const studentPerson = {
                        id: studentSchema.email,
                        name: studentSchema.first_name!,
                        email: studentSchema.email
                    };
                    
                    const availability = convertScheduleToWeekSchedule(studentSchema.schedule);
                    const lessonLength = studentSchema.lesson_length === "30" ? 30 : 60;
                    
                    return {
                        person: studentPerson,
                        preferredDuration: lessonLength,
                        maxLessonsPerWeek: 1,
                        availability
                    };
                });
            
            // Solve using CSP solver
            const solution = solveSchedule(teacher, students, {
                maxTimeMs: 10000,
                maxBacktracks: 1000,
                useConstraintPropagation: true,
                useHeuristics: true,
                searchStrategy: 'backtracking',
                optimizeForQuality: true,
                logLevel: 'basic'
            });
            
            // Check if any students were scheduled
            if (solution.assignments.length === 0) {
                throw new Error('No students could be scheduled. Please check availability constraints.');
            }
            
            // Convert solution to InteractiveCalendar events
            const studentList = students.map(config => config.person);
            const eventList = createEventsFromSolution(solution, studentList, props.studio);
            setEvents(eventList);
            const updateRes = await supabaseClient
                .from("studios")
                .update({ events: eventList })
                .eq("id", props.studio.id)
            if (updateRes.error) {
                console.error(updateRes.error)
                throw new Error("Error updating studio with new events")
            }

            props.setStudio({
                ...props.studio,
                events: eventList
            })

            if (props.setResolveOpen) {
                props.setResolveOpen(false)
            }

        } catch (error) {
            console.error('Error solving schedule:', error);
            setIsError(true);
        }
        
        setLoading(false)
        if (!isError) {
            props.setTaskStatus(props.taskStatus.map((status, i) => props.taskIdx === i ? true : status))
        }
    }
    
    return(
        <>
            <DialogContent className="sm:max-w-[425px] md:max-w-[80vw] w-[40vw] h-[40vh]">
                {(!isError) ?
                <>
                    <DialogHeader>
                    <DialogTitle>Schedule your bookings</DialogTitle>
                    <DialogDescription>
                        Make sure you&apos;ve onboarded all of your students before you finalize your schedule!
                        {!isPaid && (
                            <p className="my-2">On a free plan you only have <strong>ONE</strong> free schedule solve!</p>)}
                    </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p>Create a schedule with no more than <Combobox value={length} setValue={setLength} options={lengthOptions} /> hours of back-to-back events without a <Combobox value={breakLength} setValue={setBreakLength} options={breakOptions} /> minutes break.</p>
                        
                        <p>Back-to-back lesson preference: <Combobox value={backToBackPreference} setValue={setBackToBackPreference} options={backToBackOptions} width="w-[200px]" /></p>
                    </div>
                    <DialogFooter>
                        <Button 
                            type="submit"
                            onClick={handleClick}
                        >Schedule</Button>
                    </DialogFooter>
                </>
                :
                <p className="flex items-center h-full">There was an error creating your schedule. This is likely due to an impossible configuration of your availabilty and student availability, so please try to add more time and try again.</p>}
            </DialogContent>
        </>
    )
}