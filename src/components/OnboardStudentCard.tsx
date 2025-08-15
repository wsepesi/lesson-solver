"use client";

import * as React from "react"
import { useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import type { StudentInsertSchema, StudioSchema } from "lib/schema"
import { formatter } from "./CardWithSubmit"

import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import type { FormSchema } from "./enrollment"
import { Label } from "@/components/ui/label"
import type { LessonLength } from "lib/types"
import type { OnboardingState } from "@/app/enroll/page"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useToast } from "./ui/use-toast"
import type { WeekSchedule } from "lib/scheduling/types"
import { weekScheduleToLegacySchedule, formatWeekScheduleDisplay } from "lib/scheduling/utils"

type Props = {
    schedule: WeekSchedule
    minutes: LessonLength
    setMinutes: (minutes: LessonLength) => void
    setState: (state: OnboardingState) => void
    studentInfo: FormSchema
    studio: StudioSchema | null
}

type InsertStudent = Omit<StudentInsertSchema, "id">

export function OnboardStudentCard(props: Props) {
    const sb = useSupabaseClient()
    const { minutes, setMinutes } = props
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    const handleClick = (minutes: LessonLength) => {
        setMinutes(minutes)
    }

    const handleSubmitStudent = async (studentInfo: FormSchema, schedule: WeekSchedule, minutes: LessonLength, studio: StudioSchema | null) => {
        if (!studio) {
            toast({
                variant: "destructive",
                title: "Studio error",
                description: "Studio information is missing. Please try again."
            })
            return
        }

        setLoading(true)

        try {
            // Convert WeekSchedule to legacy format for database storage
            const legacySchedule = weekScheduleToLegacySchedule(schedule);

            const dbStudent: InsertStudent = {
                email: studentInfo.email,
                first_name: studentInfo.first_name,
                last_name: studentInfo.last_name,
                lesson_length: minutes === 30 ? "30": "60",
                schedule: legacySchedule,
                studio_id: studio.id,
            }

            const { error } = await sb.from("students").insert(dbStudent)
            if (error) {
                toast({
                    variant: "destructive",
                    title: "Enrollment failed",
                    description: "Unable to complete enrollment. Please try again."
                })
                console.log(error)
                setLoading(false)
                return
            }

            toast({
                title: "Enrollment successful!",
                description: "You've been enrolled in the studio."
            })
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Unexpected error",
                description: "Something went wrong. Please try again."
            })
            console.error(error)
        } finally {
            setLoading(false)
        }
    }
    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Welcome {props.studentInfo.first_name} {props.studentInfo.last_name}</CardTitle>
                <CardDescription>Fill out your availability on the calendar</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="pb-5">{formatter(formatWeekScheduleDisplay(props.schedule).join('\n'))}</div>
                <form>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="framework">Lesson length</Label>
                        <RadioGroup defaultValue="30" value={minutes === 30 ? "30" : "60"}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="30" id="r1" onClick={() => handleClick(30)}/>
                                <Label htmlFor="r1">30 mins</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="60" id="r2" onClick={() => handleClick(60)}/>
                                <Label htmlFor="r2">60 mins</Label>
                            </div>
                        </RadioGroup>
                        </div>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button 
                    disabled={loading}
                    className="min-w-[100px]"
                    onClick={() => {
                        // Check if schedule has any availability
                        const hasAvailability = props.schedule.days.some(day => day.blocks.length > 0);
                        if (!hasAvailability) {
                            toast({
                                title: "No availability selected",
                                description: "Please fill in your schedule",
                            })
                            return
                        }
                        props.setState("done")

                        void handleSubmitStudent(props.studentInfo, props.schedule, props.minutes, props.studio)
                    }
                }>
                    {loading ? <LoadingSpinner size="sm" /> : "Confirm"}
                </Button>
            </CardFooter>
        </Card>
    )
}