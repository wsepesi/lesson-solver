import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import type { Schedule, State } from "lib/types"

import { Button } from "~/components/ui/button"
import { buttonsToSchedule } from "lib/utils"
import { useToast } from "./ui/use-toast"

type Props = {
    setState: (state: State) => void
    setTeacherSchedule: (schedule: Schedule) => void
    buttonStates: boolean[][]
}

export function CardWithSubmit(props: Props) {
    const { toast } = useToast()

    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Add availablilty</CardTitle>
                <CardDescription>First, fill out your schedule</CardDescription>
            </CardHeader>
            <CardContent>
            </CardContent>
            <CardFooter className="flex justify-right">
                <Button onClick={() => {
                    props.setTeacherSchedule(
                        buttonsToSchedule(props.buttonStates, "30")
                    )
                    props.setState("student")
                    toast({
                        title: "Schedule added!",
                        description: "Now add your students...",
                    })
                }
                }>Submit and Continue</Button>
            </CardFooter>
        </Card>
    )
}