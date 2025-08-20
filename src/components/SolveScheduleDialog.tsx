"use client";

/* eslint-disable @typescript-eslint/no-misused-promises */
import {
    Dialog,
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
import { useToast } from "./ui/use-toast"

import { solveSchedule } from 'lib/scheduling/solver'

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
    setResolveOpen?: (open: boolean) => void,
    setUnscheduledStudents?: React.Dispatch<React.SetStateAction<string[]>>
}


type ValidationResult = {
    canSolve: boolean;
    errors: string[];
    warnings: string[];
    studentsWithoutSchedules: number;
    totalStudents: number;
}

const validateSolveConditions = (studio: StudioWithStudents): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if teacher has set availability
    if (!studio.owner_schedule) {
        errors.push("No teacher availability set. Please set your availability first.");
    }
    
    // Check if any students are onboarded
    if (!studio.students || studio.students.length === 0) {
        errors.push("No students onboarded. Please share your studio code with students first.");
        return {
            canSolve: false,
            errors,
            warnings,
            studentsWithoutSchedules: 0,
            totalStudents: 0
        };
    }
    
    // Check student schedules
    const totalStudents = studio.students.length;
    const studentsWithSchedules = studio.students.filter(student => student.schedule).length;
    const studentsWithoutSchedules = totalStudents - studentsWithSchedules;
    
    if (studentsWithSchedules === 0) {
        errors.push("No student schedules found. Students need to set their availability before you can create a schedule.");
    } else if (studentsWithoutSchedules > 0) {
        warnings.push(`${studentsWithoutSchedules} of ${totalStudents} students haven't set their availability yet and won't be scheduled.`);
    }
    
    return {
        canSolve: errors.length === 0,
        errors,
        warnings,
        studentsWithoutSchedules,
        totalStudents: studentsWithSchedules
    };
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
    const { toast } = useToast()
    const [length, setLength] = useState("1")
    const [breakLength, setBreakLength] = useState("30")
    const [backToBackPreference, setBackToBackPreference] = useState("agnostic")
    const [, setLoading] = useState(false)
    const [showWarningDialog, setShowWarningDialog] = useState(false)
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

    const handleClick = async () => {
        const validation = validateSolveConditions(props.studio);
        
        // Show errors if validation fails
        if (!validation.canSolve) {
            validation.errors.forEach(error => {
                toast({
                    title: "Cannot solve schedule",
                    description: error,
                    variant: "destructive",
                });
            });
            return;
        }
        
        // Show warnings and get user confirmation if needed
        if (validation.warnings.length > 0) {
            setValidationResult(validation);
            setShowWarningDialog(true);
            return;
        }
        
        // Proceed with solving if no errors or warnings
        await executeSolve();
    }

    const executeSolve = async () => {
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
            
            // Handle both scheduled and unscheduled students
            console.log(`Scheduling solution: ${solution.assignments.length}/${solution.metadata.totalStudents} students scheduled`);
            
            const totalStudents = solution.metadata.totalStudents;
            const scheduledCount = solution.assignments.length;
            const unscheduledCount = solution.unscheduled.length;
            
            // Convert solution to InteractiveCalendar events
            const studentList = students.map(config => config.person);
            const eventList = createEventsFromSolution(solution, studentList, props.studio);
            setEvents(eventList);
            
            // Update unscheduled students if callback provided
            if (props.setUnscheduledStudents) {
                props.setUnscheduledStudents(solution.unscheduled);
            }
            const updateRes = await supabaseClient
                .from("studios")
                .update({ 
                    events: eventList,
                    unscheduled_students: solution.unscheduled 
                })
                .eq("id", props.studio.id)
            if (updateRes.error) {
                console.error(updateRes.error)
                throw new Error("Error updating studio with new events")
            }

            props.setStudio({
                ...props.studio,
                events: eventList,
                unscheduled_students: solution.unscheduled
            })

            // Show appropriate toast based on results
            if (scheduledCount === totalStudents) {
                // Complete success
                toast({
                    title: "Schedule created successfully!",
                    description: `All ${totalStudents} students have been scheduled.`,
                });
            } else if (scheduledCount > 0) {
                // Partial success
                toast({
                    title: "Partial schedule created",
                    description: `${scheduledCount} of ${totalStudents} students scheduled. ${unscheduledCount} students couldn't be fit into the schedule.`,
                    variant: "destructive",
                });
            } else {
                // Complete failure - no students scheduled
                toast({
                    title: "Unable to create schedule",
                    description: "No students could be scheduled. Please try adding more available time slots or adjusting student preferences.",
                    variant: "destructive",
                });
            }

            if (props.setResolveOpen) {
                props.setResolveOpen(false)
            }

        } catch (error) {
            console.error('Error solving schedule:', error);
            
            // Show error toast for system failures
            toast({
                title: "System error",
                description: "An unexpected error occurred while solving the schedule. Please try again.",
                variant: "destructive",
            });
            
            // Close dialog even on errors
            if (props.setResolveOpen) {
                props.setResolveOpen(false)
            }
        }
        
        setLoading(false)
        props.setTaskStatus(props.taskStatus.map((status, i) => props.taskIdx === i ? true : status))
    }
    
    return(
        <>
            <DialogContent className="sm:max-w-[425px] md:max-w-[80vw] w-[40vw] h-[40vh]">
                <DialogHeader>
                <DialogTitle>Schedule your bookings</DialogTitle>
                <DialogDescription>
                    Make sure you&apos;ve onboarded all of your students before you finalize your schedule!
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
            </DialogContent>
            
            {/* Warning dialog for incomplete student schedules */}
            <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Some Students Haven&apos;t Set Availability</DialogTitle>
                        <DialogDescription>
                            Not all students have set their availability. These students won&apos;t be included in the schedule.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {validationResult?.warnings.map((warning, index) => (
                            <p key={index} className="text-sm text-muted-foreground">{warning}</p>
                        ))}
                        <p className="text-sm font-medium">
                            Only {validationResult?.totalStudents} students will be scheduled.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowWarningDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={async () => {
                            setShowWarningDialog(false);
                            await executeSolve();
                        }}>
                            Continue Anyway
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}