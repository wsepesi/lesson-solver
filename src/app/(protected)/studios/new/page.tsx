"use client";

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Navbar from "@/components/Navbar"
import type { NewStudioInfo } from "lib/types"
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast"
import { type User } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/client"
import { useUser } from "@/hooks/useUser"

const generateRandomCode = (len = 5) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""
    for (let i = 0; i < len; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
}

export default function NewStudioPage() {
    const supabaseClient = createClient()
    const { user, loading }: { user: User | null; loading: boolean } = useUser()

    const [formData, setFormData] = useState<NewStudioInfo>({
        name: "",
        mode: 'individual_lessons',
        allowedLessonDurations: [30, 60],
        allowCustomDuration: false,
        minLessonDuration: 15,
        maxLessonDuration: 120,
        rehearsalDurationMinutes: 60,
        calendarDays: 'weekdays',
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    const handleClick = async() => {
        if (loading) {
            toast({
                title: "Please wait",
                description: "Loading user data...",
            })
            return
        }
        if (!user) {
            toast({
                variant: "destructive",
                title: "Not logged in",
                description: "Please log in to create a studio",
            })
            return
        }
        if (formData.name === "") {
            toast({
                title: "Please fill out all fields",
                description: "Naming the Studio is required",
            })
            return
        }
        // Mode-specific validation
        if (formData.mode === 'individual_lessons') {
            if (formData.allowedLessonDurations.length === 0 && !formData.allowCustomDuration) {
                toast({
                    title: "Please select lesson durations",
                    description: "Choose at least one preset duration or enable custom durations",
                })
                return
            }
            if (formData.allowCustomDuration && formData.minLessonDuration >= formData.maxLessonDuration) {
                toast({
                    title: "Invalid duration range",
                    description: "Minimum duration must be less than maximum duration",
                })
                return
            }
        } else if (formData.mode === 'chamber_music') {
            if (!formData.rehearsalDurationMinutes || formData.rehearsalDurationMinutes < 15) {
                toast({
                    title: "Please select rehearsal duration",
                    description: "Rehearsal duration must be at least 15 minutes",
                })
                return
            }
        }
        
        setIsSubmitting(true)
        try {
            let success = false

            // try generating a unique code until we get one
            while (!success) {
                const res = await supabaseClient.from("studios").insert({
                    studio_name: formData.name,
                    user_id: user.id,
                    code: generateRandomCode(),
                    studio_mode: formData.mode,
                    // Individual lessons mode fields
                    allowed_lesson_durations: formData.mode === 'individual_lessons' ? formData.allowedLessonDurations : [],
                    allow_custom_duration: formData.mode === 'individual_lessons' ? formData.allowCustomDuration : false,
                    min_lesson_duration: formData.mode === 'individual_lessons' ? formData.minLessonDuration : null,
                    max_lesson_duration: formData.mode === 'individual_lessons' ? formData.maxLessonDuration : null,
                    // Chamber music mode field
                    rehearsal_duration_minutes: formData.mode === 'chamber_music' ? formData.rehearsalDurationMinutes : null,
                    // Common fields
                    calendar_days: formData.calendarDays,
                })
                switch (res.status) {
                    case 201:
                        success = true
                        break
                    case 409:
                        // code already exists, try again
                        break
                    default:
                        console.log(res)
                        toast({
                            variant: "destructive",
                            title: "Error",
                            description: "Failed to create studio. Please try again.",
                        })
                        setIsSubmitting(false)
                        return
                }
            }

            // confirm success with user and redirect
            toast({
                title: "Studio created!",
                description: "Redirecting...",
            })
            // Hard redirect to ensure fresh data and reliable navigation
            window.location.href = "/studios"
        } catch (e) {
            console.log(e)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to create studio. Please try again.",
            })
            setIsSubmitting(false)
        }
    }
    return (
        <div className="h-screen bg-landing-background font-arimo">
        <Navbar />
        <div className="flex justify-center items-center w-full h-full max-h-[90vh]">
        <Card className="w-[500px] max-h-[80vh] overflow-y-auto">
            <CardHeader>
                <CardTitle>Create new Studio</CardTitle>
                {/* <CardDescription>Make sure to fill out the calendar before you submit!</CardDescription> */}
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={() => console.log(formData)}
                >
                <div className="grid w-full items-center gap-4">
                    {/* Mode Selection */}
                    <div className="flex flex-col space-y-1.5">
                        <Label>What type of studio?</Label>
                        <RadioGroup
                            value={formData.mode}
                            onValueChange={(value: 'individual_lessons' | 'chamber_music') => setFormData({
                                ...formData,
                                mode: value
                            })}
                            className="flex flex-col space-y-2"
                        >
                            <div className="flex items-start space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                                <RadioGroupItem value="individual_lessons" id="individual_lessons" className="mt-1" />
                                <div className="flex flex-col">
                                    <Label htmlFor="individual_lessons" className="text-sm font-medium cursor-pointer">
                                        Individual Lessons
                                    </Label>
                                    <p className="text-xs text-landing-blue/60">
                                        Schedule one-on-one lessons with students
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                                <RadioGroupItem value="chamber_music" id="chamber_music" className="mt-1" />
                                <div className="flex flex-col">
                                    <Label htmlFor="chamber_music" className="text-sm font-medium cursor-pointer">
                                        Chamber Music Group
                                    </Label>
                                    <p className="text-xs text-landing-blue/60">
                                        Find a shared rehearsal time with all members
                                    </p>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="name">{formData.mode === 'chamber_music' ? 'Group Name' : 'Studio Name'}</Label>
                    <Input
                        id="name"
                        placeholder={formData.mode === 'chamber_music' ? 'My Chamber Group' : 'My New Studio'}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                name: e.target.value
                            })}
                        value={formData.name}
                    />
                    </div>

                    {/* Individual Lessons: Duration Options */}
                    {formData.mode === 'individual_lessons' && (
                        <>
                            <div className="flex flex-col space-y-1.5">
                                <Label>Allowed Lesson Durations (minutes)</Label>
                                <div className="flex flex-wrap gap-2">
                                    {[15, 30, 45, 60, 90, 120].map((duration) => (
                                        <div key={duration} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`duration-${duration}`}
                                                checked={formData.allowedLessonDurations.includes(duration)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setFormData({
                                                            ...formData,
                                                            allowedLessonDurations: [...formData.allowedLessonDurations, duration].sort((a, b) => a - b)
                                                        });
                                                    } else {
                                                        setFormData({
                                                            ...formData,
                                                            allowedLessonDurations: formData.allowedLessonDurations.filter(d => d !== duration)
                                                        });
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`duration-${duration}`} className="text-sm">{duration}min</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="custom-duration"
                                    checked={formData.allowCustomDuration}
                                    onCheckedChange={(checked) => setFormData({
                                        ...formData,
                                        allowCustomDuration: !!checked
                                    })}
                                />
                                <Label htmlFor="custom-duration">Allow students to choose custom durations</Label>
                            </div>

                            {formData.allowCustomDuration && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col space-y-1.5">
                                        <Label htmlFor="min-duration">Min Duration (min)</Label>
                                        <Input
                                            id="min-duration"
                                            type="number"
                                            min="5"
                                            max="240"
                                            value={formData.minLessonDuration}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                minLessonDuration: parseInt(e.target.value) || 15
                                            })}
                                        />
                                    </div>
                                    <div className="flex flex-col space-y-1.5">
                                        <Label htmlFor="max-duration">Max Duration (min)</Label>
                                        <Input
                                            id="max-duration"
                                            type="number"
                                            min="5"
                                            max="240"
                                            value={formData.maxLessonDuration}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                maxLessonDuration: parseInt(e.target.value) || 120
                                            })}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Chamber Music: Fixed Duration */}
                    {formData.mode === 'chamber_music' && (
                        <div className="flex flex-col space-y-1.5">
                            <Label>Rehearsal Duration</Label>
                            <RadioGroup
                                value={formData.rehearsalDurationMinutes.toString()}
                                onValueChange={(value) => setFormData({
                                    ...formData,
                                    rehearsalDurationMinutes: parseInt(value)
                                })}
                                className="flex flex-wrap gap-2"
                            >
                                {[30, 45, 60, 90, 120].map((duration) => (
                                    <div key={duration} className="flex items-center space-x-2">
                                        <RadioGroupItem value={duration.toString()} id={`rehearsal-${duration}`} />
                                        <Label htmlFor={`rehearsal-${duration}`} className="text-sm">{duration} min</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                            <p className="text-xs text-landing-blue/60">
                                All participants will meet for this duration each week
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col space-y-1.5">
                        <Label>Calendar Display</Label>
                        <RadioGroup
                            value={formData.calendarDays}
                            onValueChange={(value: 'weekdays' | 'full_week') => setFormData({
                                ...formData,
                                calendarDays: value
                            })}
                            className="flex flex-col space-y-2"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="weekdays" id="weekdays" />
                                <Label htmlFor="weekdays" className="text-sm font-normal">
                                    Weekdays only (Monday - Friday)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="full_week" id="full_week" />
                                <Label htmlFor="full_week" className="text-sm font-normal">
                                    Full week (Monday - Sunday)
                                </Label>
                            </div>
                        </RadioGroup>
                        <p className="text-xs text-landing-blue/60">
                            Choose which days to show in calendar views
                        </p>
                    </div>
                </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button 
                    onClick={() => void handleClick()}
                    disabled={isSubmitting || loading}
                >
                    {isSubmitting ? "Creating..." : "Continue"}
                </Button>
            </CardFooter>
        </Card>
        </div>
            
        </div>
    )
}