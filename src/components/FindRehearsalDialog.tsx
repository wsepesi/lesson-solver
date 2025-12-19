"use client";

import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { useState, useMemo } from "react"
import { type StudioWithStudents } from "@/app/(protected)/studios/[slug]/page"
import { createClient } from "@/utils/supabase/client"
import {
    solveChamberStudioSchedule,
    chamberSolutionToWeekSchedule,
} from "lib/scheduling-adapter"
import { useToast } from "./ui/use-toast"
import type { WeekSchedule } from "lib/scheduling/types"

// Event type for chamber rehearsal
interface RehearsalEvent {
    id: string;
    name: string;
    booking: {
        day: string;
        timeInterval: { start: number; duration: number };
    };
    student_id: number;
}

type Props = {
    studio: StudioWithStudents;
    taskStatus: boolean[];
    setTaskStatus: React.Dispatch<React.SetStateAction<boolean[]>>;
    taskIdx: number;
    setEvents: React.Dispatch<React.SetStateAction<RehearsalEvent[]>>;
    setStudio: (studio: StudioWithStudents) => void;
    setChamberOverlap?: (schedule: WeekSchedule) => void;
}

type ValidationResult = {
    canSolve: boolean;
    errors: string[];
    warnings: string[];
    participantsWithoutSchedules: number;
    totalParticipants: number;
}

const validateChamberConditions = (studio: StudioWithStudents): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if leader has set availability
    if (!studio.owner_schedule) {
        errors.push("You haven't set your availability yet. Please set your availability first.");
    }

    // Check if any participants are enrolled
    if (!studio.students || studio.students.length === 0) {
        errors.push("No participants enrolled. Share your group code to invite participants.");
        return {
            canSolve: false,
            errors,
            warnings,
            participantsWithoutSchedules: 0,
            totalParticipants: 0
        };
    }

    // Count participants with/without schedules
    const participantsWithSchedules = studio.students.filter(s => s.schedule).length;
    const participantsWithoutSchedules = studio.students.length - participantsWithSchedules;

    if (participantsWithSchedules === 0) {
        errors.push("No participants have set their availability yet.");
    }

    if (participantsWithoutSchedules > 0) {
        warnings.push(`${participantsWithoutSchedules} participant(s) haven't set their availability yet.`);
    }

    return {
        canSolve: errors.length === 0,
        errors,
        warnings,
        participantsWithoutSchedules,
        totalParticipants: studio.students.length
    };
}

export default function FindRehearsalDialog(props: Props) {
    const { studio, taskStatus, setTaskStatus, taskIdx, setEvents, setStudio, setChamberOverlap } = props;
    const supabaseClient = createClient();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);

    // Validation state
    const validation = useMemo(() => validateChamberConditions(studio), [studio]);

    // Find times, auto-select first slot, and save immediately
    const handleFindTimes = async () => {
        setIsLoading(true);

        try {
            const result = solveChamberStudioSchedule(studio, studio.students);

            if (result.mutualSlots.length === 0) {
                toast({
                    variant: "destructive",
                    title: "No mutual times found",
                    description: "There are no times when all participants are available. Try adjusting availability.",
                });
                return;
            }

            // Auto-select first available slot
            const selectedSlot = result.mutualSlots[0];
            if (!selectedSlot) {
                // This shouldn't happen since we checked length > 0, but TypeScript needs assurance
                throw new Error("No slots available despite check");
            }
            const dayAbbrevs = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];

            // Create the rehearsal event
            const rehearsalEvent: RehearsalEvent = {
                id: "chamber-rehearsal",
                name: "Rehearsal",
                booking: {
                    day: dayAbbrevs[selectedSlot.dayOfWeek] ?? 'M',
                    timeInterval: {
                        start: selectedSlot.startMinute,
                        duration: selectedSlot.durationMinutes
                    }
                },
                student_id: 0 // No specific student - it's a group event
            };

            // Update database
            const { error } = await supabaseClient
                .from("studios")
                .update({
                    events: [rehearsalEvent],
                    unscheduled_students: [] // No unscheduled in chamber mode
                })
                .eq("id", studio.id);

            if (error) {
                throw error;
            }

            // Update local state
            setEvents([rehearsalEvent]);
            setStudio({
                ...studio,
                events: [rehearsalEvent],
                unscheduled_students: []
            });

            // Pass mutual overlap to parent for drag constraints
            if (setChamberOverlap) {
                setChamberOverlap(chamberSolutionToWeekSchedule(result));
            }

            // Mark task as complete
            setTaskStatus(taskStatus.map((status, i) => i === taskIdx ? true : status));

            toast({
                title: "Rehearsal time set!",
                description: "Drag to reschedule if needed.",
            });

        } catch (error) {
            console.error("Error finding/saving rehearsal time:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to set rehearsal time. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Find Rehearsal Time</DialogTitle>
                <DialogDescription>
                    Find a time when all group members are available to rehearse.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
                {/* Validation Errors */}
                {validation.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <h4 className="text-sm font-medium text-red-800 mb-2">Cannot find times yet:</h4>
                        <ul className="list-disc list-inside text-sm text-red-700">
                            {validation.errors.map((error, i) => (
                                <li key={i}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Warnings */}
                {validation.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <h4 className="text-sm font-medium text-yellow-800 mb-2">Note:</h4>
                        <ul className="list-disc list-inside text-sm text-yellow-700">
                            {validation.warnings.map((warning, i) => (
                                <li key={i}>{warning}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Find Times Button */}
                {validation.canSolve && (
                    <div className="flex justify-center py-4">
                        <Button
                            onClick={() => void handleFindTimes()}
                            disabled={isLoading}
                            className="bg-landing-blue text-white hover:bg-landing-blue-hover"
                        >
                            {isLoading ? "Finding times..." : "Find Available Times"}
                        </Button>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
