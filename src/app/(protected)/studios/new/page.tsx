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
import { useRouter } from "next/navigation"

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
    const { user }: { user: User | null } = useUser()
    const router = useRouter()

    const [formData, setFormData] = useState<NewStudioInfo>({
        name: "",
        allowedLessonDurations: [30, 60],
        allowCustomDuration: false,
        minLessonDuration: 15,
        maxLessonDuration: 120,
        calendarDays: 'weekdays',
    })
    const { toast } = useToast()

    const handleClick = async() => {
        if (formData.name === "") {
            toast({
                title: "Please fill out all fields",
                description: "Naming the Studio is required",
            })
            return
        }
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
        try {
            if (user) {
                let success = false

                // try generating a unique code until we get one
                while (!success) {
                    const res = await supabaseClient.from("studios").insert({
                        studio_name: formData.name,
                        user_id: user.id,
                        code: generateRandomCode(),
                        allowed_lesson_durations: formData.allowedLessonDurations,
                        allow_custom_duration: formData.allowCustomDuration,
                        min_lesson_duration: formData.minLessonDuration,
                        max_lesson_duration: formData.maxLessonDuration,
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
                            alert("error, please try again")
                            return
                    }
                }

                // confirm success with user and redirect
                toast({
                    title: "Studio created!",
                    description: "Redirecting...",
                })
                router.push("/studios")
            }
        } catch (e) {
            console.log(e)
            alert("error, please try again")
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
                    <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="name">Studio Name</Label>
                    <Input 
                        id="name" 
                        placeholder="My New Studio" 
                        onChange={(e) => 
                            setFormData({
                                ...formData,
                                name: e.target.value
                            })}
                        value={formData.name}
                    />
                    </div>
                    
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
                            Choose which days to show in calendar views throughout your studio
                        </p>
                    </div>
                </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    void handleClick()
                    // check we have a name and email
                    if (formData.name === "") {
                        toast({
                            title: "Please fill out all fields",
                            description: "Naming the Studio is required",
                        })
                        return
                    }
                    toast({
                        title: "Studio created!",
                        description: "Submitting data...",
                    }) // FIXME: not showing up for whatever reason idk
                    // TODO: await send to DB
                    // redirect to studio page
                }
                }>Continue</Button>
            </CardFooter>
        </Card>
        </div>
            
        </div>
    )
}