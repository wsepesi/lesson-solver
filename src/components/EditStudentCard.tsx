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
import type { LessonLength } from "lib/types"
import type { StudentSchema, StudioSchema } from "lib/db-types"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { lessonLengthToString } from "lib/utils"
import { formatter } from "./CardWithSubmit"
import { Input } from "./ui/input"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "./ui/use-toast"

type Props = {
    student: StudentSchema;
    minutes: LessonLength;
    setMinutes: (minutes: LessonLength) => void;
    onSave: () => void;
    onClose: () => void;
    scheduleDisplayText: string;
    isScheduleEmpty: () => boolean;
    studio: StudioSchema;
    loading: boolean;
}

export function EditStudentCard(props: Props) {
    const { minutes, setMinutes, student } = props
    const { toast } = useToast()

    const handleClick = (minutes: LessonLength) => {
        setMinutes(minutes)
    }

    const handleSave = () => {
        if (props.isScheduleEmpty()) {
            toast({
                title: "Please fill out the calendar",
                description: "You can't save an empty schedule",
            })
            return
        }
        props.onSave();
    }

    return (
        <Card className="w-[350px] h-[calc(100vh-8rem)] flex flex-col">
            <CardHeader>
                <CardTitle>Edit {student.first_name}&apos;s Schedule</CardTitle>
                <CardDescription>
                    Update availability and lesson preferences for {student.first_name} {student.last_name}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="mb-3 flex-1 overflow-auto">
                    {formatter(props.scheduleDisplayText)}
                </div>
                
                {/* Student Info Display */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">
                        <div><strong>Name:</strong> {student.first_name} {student.last_name}</div>
                        <div><strong>Email:</strong> {student.email}</div>
                    </div>
                </div>

                <div className="grid w-full items-center gap-4">
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
                </div>
            </CardContent>
            <CardFooter className="flex justify-between px-4">
                <Button 
                    variant="outline" 
                    onClick={props.onClose}
                    disabled={props.loading}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleSave}
                    className="bg-landing-blue text-white hover:bg-landing-blue-hover"
                    disabled={props.loading}
                >
                    {props.loading ? (
                        <>
                            <LoadingSpinner className="w-4 h-4 mr-2" />
                            Saving...
                        </>
                    ) : (
                        "Save"
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}