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
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"

type Props = {
    students: Student[]
    setStudents: (students: Student[]) => void
}

export function CardWithForm(props: Props) {
    const [formData, setFormData] = React.useState<Student>({
        name: "",
        email: "",
        lessonLength: "30",
    })

    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Add new student</CardTitle>
                <CardDescription>Fill out student details here</CardDescription>
            </CardHeader>
            <CardContent>
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
                    <RadioGroup defaultValue="30" value={formData.lessonLength}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="30" id="r1" onClick={() => setFormData({ ...formData, lessonLength: "30"})}/>
                            <Label htmlFor="r1">30 mins</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="60" id="r2" onClick={() => setFormData({ ...formData, lessonLength: "60"})}/>
                            <Label htmlFor="r2">60 mins</Label>
                        </div>
                    </RadioGroup>
                    </div>
                </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button onClick={() => props.setStudents([...props.students, formData])}>Submit</Button>
            </CardFooter>
        </Card>
    )
}