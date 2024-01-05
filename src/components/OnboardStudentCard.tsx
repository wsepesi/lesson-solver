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

import { Button } from "~/components/ui/button"
import type { FormSchema } from "./enrollment"
import { Label } from "~/components/ui/label"
import type { LessonLength } from "lib/types"
import type { OnboardingState } from "~/pages/enroll"
import { buttonStatesToText } from "lib/utils"
import { formatter } from "./CardWithSubmit"
import { useToast } from "./ui/use-toast"

type Props = {
    buttonStates: boolean[][]
    minutes: LessonLength
    setMinutes: (minutes: LessonLength) => void
    setState: (state: OnboardingState) => void
    studentInfo: FormSchema
}

export function OnboardStudentCard(props: Props) {
    const { minutes, setMinutes } = props
    const { toast } = useToast()

    const handleClick = (minutes: LessonLength) => {
        setMinutes(minutes)
    }

    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Welcome {props.studentInfo.name}</CardTitle>
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
                }
                }>Confirm</Button>
            </CardFooter>
        </Card>
    )
}