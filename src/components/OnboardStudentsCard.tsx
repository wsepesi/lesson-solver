"use client";

import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { LessonLength, Schedule, Student } from "lib/types"
import type { StudioSchema } from "lib/db-types"
import { createEmptyWeekSchedule, weekScheduleToJsonSchedule } from "lib/scheduling/utils"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { buttonStatesToText, lessonLengthToString } from "lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatter } from "./CardWithSubmit"
import { useToast } from "./ui/use-toast"

type Props = {
    addStudentSchedule: (student: Student, schedule: Schedule) => void
    buttonStates: boolean[][]
    minutes: LessonLength
    setMinutes: (minutes: LessonLength) => void
    setOpen: (open: boolean) => void
    scheduleDisplayText?: string // Optional override for schedule display
    isScheduleEmpty?: () => boolean // Optional override for schedule validation
    studio?: StudioSchema // Studio information for dynamic duration settings
    isChamberMode?: boolean // Whether this is a chamber music group
}


export function OnboardStudentsCard(props: Props) {
    const { minutes, setMinutes, isChamberMode } = props
    const [formData, setFormData] = React.useState<Student>({
        name: "",
        email: "",
        lessonLength: minutes,
    })
    const { toast } = useToast()

    const handleClick = (minutes: LessonLength) => {
        setFormData({ ...formData, lessonLength: minutes })
        setMinutes(minutes)
    }

    return (
        <Card className="w-[350px] h-[calc(100vh-8rem)] flex flex-col"> {/* overflow-auto"> */}
            <CardHeader>
                <CardTitle>{isChamberMode ? 'Add new participant' : 'Add new student'}</CardTitle>
                <CardDescription>Make sure to fill out the calendar before you submit!</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="mb-3 flex-1 overflow-auto">
                    {formatter(props.scheduleDisplayText ?? buttonStatesToText(props.buttonStates))}
                </div>
                <form //TODO: rework as zod form
                    onSubmit={() => console.log(formData)}
                >
                <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        placeholder={isChamberMode ? "Name of participant" : "Name of student"}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                name: e.target.value
                            })}
                        value={formData.name}
                    />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        placeholder={isChamberMode ? "Participant's email" : "Student's email"}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                email: e.target.value
                            })}
                        value={formData.email}
                    />
                    </div>
                    {/* For chamber mode, show fixed rehearsal duration (set by leader) */}
                    {isChamberMode ? (
                        <div className="flex flex-col space-y-1.5">
                            <Label>Rehearsal duration</Label>
                            <p className="text-sm text-gray-600">
                                {props.studio?.rehearsal_duration_minutes ?? 60} minutes (set by group leader)
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="lesson-duration">Lesson length</Label>
                        {/* Show preset durations from studio settings */}
                        {props.studio?.allowed_lesson_durations && props.studio.allowed_lesson_durations.length > 0 && (
                            <RadioGroup defaultValue={props.studio.allowed_lesson_durations[0]?.toString()} value={minutes.toString()}>
                                {props.studio.allowed_lesson_durations.map((duration) => (
                                    <div key={duration} className="flex items-center space-x-2">
                                        <RadioGroupItem
                                            value={duration.toString()}
                                            id={`duration-${duration}`}
                                            onClick={() => handleClick(duration)}
                                        />
                                        <Label htmlFor={`duration-${duration}`}>{duration} mins</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        )}

                        {/* Show custom duration input if enabled */}
                        {props.studio?.allow_custom_duration && (
                            <div className="flex flex-col space-y-2">
                                <Label htmlFor="custom-duration">Or choose custom duration:</Label>
                                <div className="flex items-center space-x-2">
                                    <Input
                                        id="custom-duration"
                                        type="number"
                                        min={props.studio.min_lesson_duration ?? 15}
                                        max={props.studio.max_lesson_duration ?? 120}
                                        value={minutes}
                                        onChange={(e) => {
                                            const newDuration = parseInt(e.target.value) || 30;
                                            const min = props.studio?.min_lesson_duration ?? 15;
                                            const max = props.studio?.max_lesson_duration ?? 120;
                                            if (newDuration >= min && newDuration <= max) {
                                                handleClick(newDuration);
                                            }
                                        }}
                                        placeholder="Duration in minutes"
                                        className="w-32"
                                    />
                                    <span className="text-sm text-gray-500">
                                        ({props.studio.min_lesson_duration}-{props.studio.max_lesson_duration} min)
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Fallback for studios without lesson duration settings */}
                        {(!props.studio?.allowed_lesson_durations || props.studio.allowed_lesson_durations.length === 0) && !props.studio?.allow_custom_duration && (
                            <RadioGroup defaultValue={"30"} value={lessonLengthToString(minutes)}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="30" id="r1" onClick={() => handleClick(30)}/>
                                    <Label htmlFor="r1">30 mins</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="60" id="r2" onClick={() => handleClick(60)}/>
                                    <Label htmlFor="r2">60 mins</Label>
                                </div>
                            </RadioGroup>
                        )}
                        </div>
                    )}
                </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between px-4">
                <Button className="" onClick={() => {
                    // check we have a name and email
                    if (formData.name === "" || formData.email === "") {
                        toast({
                            title: "Please fill out all fields",
                            description: "Name and email are required",
                        })
                        return
                    }
                    else if (props.isScheduleEmpty ? props.isScheduleEmpty() : props.buttonStates.every((row) => row.every((item) => item === false))) {
                        toast({
                            title: "Please fill out the calendar",
                            description: "You can't submit an empty calendar",
                        })
                        return
                    }
                    else {
                        // Create empty WeekSchedule for students without availability
                        const emptySchedule = weekScheduleToJsonSchedule(createEmptyWeekSchedule()) as unknown as Schedule
                        props.addStudentSchedule(formData, emptySchedule)
                        props.setOpen(false)
                        toast({
                            title: isChamberMode ? "Participant added!" : "Student added!",
                            description: "Submitting data...",
                        })
                    }
                }
                }>Add and End</Button>
                <Button onClick={() => {
                    // check we have a name and email
                    if (formData.name === "" || formData.email === "") {
                        toast({
                            title: "Please fill out all fields",
                            description: "Name and email are required",
                        })
                        return
                    }
                    else if (props.isScheduleEmpty ? props.isScheduleEmpty() : props.buttonStates.every((row) => row.every((item) => item === false))) {
                        toast({
                            title: "Please fill out the calendar",
                            description: "You can't submit an empty calendar",
                        })
                        return
                    }
                    else {
                        // Create empty WeekSchedule for students without availability
                        const emptySchedule = weekScheduleToJsonSchedule(createEmptyWeekSchedule()) as unknown as Schedule
                        props.addStudentSchedule(formData, emptySchedule)
                        setFormData({
                            name: "",
                            email: "",
                            lessonLength: minutes,
                        })
                        toast({
                            title: isChamberMode ? "Participant added!" : "Student added!",
                            description: isChamberMode ? "You can add another participant or end." : "You can add another student or end.",
                        })
                    }
                    
                }
                }>Add and Continue</Button>
            </CardFooter>
        </Card>
    )
}