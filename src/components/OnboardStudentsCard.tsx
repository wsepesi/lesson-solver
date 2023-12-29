import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import type { LessonLength, State, Student } from "lib/types"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { buttonStatesToText } from "lib/utils"
import { formatter } from "./CardWithSubmit"
import { useToast } from "./ui/use-toast"

type Props = {
    addStudentSchedule: (student: Student, buttonStates: boolean[][]) => void
    buttonStates: boolean[][]
    minutes: LessonLength
    setMinutes: (minutes: LessonLength) => void
    setState: (state: State) => void
    reset: (func: () => void) => void
}

export function OnboardStudentsCard(props: Props) {
    const { minutes, setMinutes } = props
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
        <Card className="w-[350px] overflow-auto">
            <CardHeader>
                <CardTitle>Add new student</CardTitle>
                <CardDescription>Make sure to fill out the calendar before you submit!</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="pb-5">{formatter(buttonStatesToText(props.buttonStates))}</div>
                <form
                    onSubmit={() => console.log(formData)}
                >
                <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                        id="name" 
                        placeholder="Name of student" 
                        onChange={(e) => 
                            setFormData({
                                ...formData,
                                name: e.target.value
                            })}
                        value={formData.name}
                    />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="name">Email</Label>
                    <Input 
                        id="name" 
                        placeholder="Student's email" 
                        onChange={(e) => 
                            setFormData({
                                ...formData,
                                email: e.target.value
                            })}
                        value={formData.email}
                    />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="framework">Lesson length</Label>
                    <RadioGroup defaultValue="30" value={minutes}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="30" id="r1" onClick={() => handleClick("30")}/>
                            <Label htmlFor="r1">30 mins</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="60" id="r2" onClick={() => handleClick("60")}/>
                            <Label htmlFor="r2">60 mins</Label>
                        </div>
                    </RadioGroup>
                    </div>
                </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between px-3">
                <Button className="" onClick={() => {
                    // check we have a name and email
                    if (formData.name === "" || formData.email === "") {
                        toast({
                            title: "Please fill out all fields",
                            description: "Name and email are required",
                        })
                        return
                    }
                    props.addStudentSchedule(formData, props.buttonStates)
                    props.setState("result")
                    toast({
                        title: "Student added!",
                        description: "Submitting data...",
                    })
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
                    props.addStudentSchedule(formData, props.buttonStates)
                    props.reset(() => setFormData({
                        name: "",
                        email: "",
                        lessonLength: minutes,
                    }))
                    toast({
                        title: "Student added!",
                        description: "You can add another student or end.",
                    })
                }
                }>Add and Continue</Button>
            </CardFooter>
        </Card>
    )
}