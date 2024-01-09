import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import type { StudentInsertSchema, StudioSchema } from "lib/schema"
import { buttonStatesToText, buttonsToSchedule } from "lib/utils"

import { Button } from "~/components/ui/button"
import type { FormSchema } from "./enrollment"
import { Label } from "~/components/ui/label"
import type { LessonLength } from "lib/types"
import type { OnboardingState } from "~/pages/enroll"
import { formatter } from "./CardWithSubmit"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useToast } from "./ui/use-toast"

type Props = {
    buttonStates: boolean[][]
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

    const handleClick = (minutes: LessonLength) => {
        setMinutes(minutes)
    }

    const handleSubmitStudent = async (studentInfo: FormSchema, buttonStates: boolean[][], minutes: LessonLength, studio: StudioSchema | null) => {
        if (!studio) {
            alert("studio is null")
            return
        }

        const dbStudent: InsertStudent = {
            email: studentInfo.email,
            first_name: studentInfo.first_name,
            last_name: studentInfo.last_name,
            lesson_length: minutes === 30 ? "30": "60",
            schedule: buttonsToSchedule(buttonStates, minutes),
            studio_id: studio.id,
        }

        const { error } = await sb.from("students").insert(dbStudent)
        if (error) {
            alert("error with inserting student")
            console.log(error)
            return
        }
    }
    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Welcome {props.studentInfo.first_name} {props.studentInfo.last_name}</CardTitle>
                <CardDescription>Fill out your availability on the calendar</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="pb-5">{formatter(buttonStatesToText(props.buttonStates))}</div>
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
                <Button onClick={() => {
                    // CHECK if buttonstates are nonempty
                    if (props.buttonStates.every((day) => day.every((block) => !block))) {
                        toast({
                            title: "No availability selected",
                            description: "Please fill in your schedule",
                        })
                        return
                    }
                    props.setState("done")

                    void handleSubmitStudent(props.studentInfo, props.buttonStates, props.minutes, props.studio)
                }
                }>Confirm</Button>
            </CardFooter>
        </Card>
    )
}