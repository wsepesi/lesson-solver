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
import { buttonStatesToText, buttonsToSchedule } from "lib/utils"

import { Button } from "~/components/ui/button"
import { useToast } from "./ui/use-toast"

type Props = {
    setState: (state: State) => void
    setTeacherSchedule: (schedule: Schedule) => void
    buttonStates: boolean[][]
    handleSubmit: () => void
}

export const formatter = (str: string): React.ReactElement[] => {
    const ps: React.ReactElement[] = [];
    const lines = str.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line!.split(/[;,]/); // Split on commas and semicolons
        const formattedParts: React.ReactNode[] = [];
  
        for (let j = 0; j < parts.length; j++) {
            const part = parts[j]!.trim();
            if (j === 0) {
                formattedParts.push(<p key={j}><strong>{part}</strong></p>);
            } else {
                formattedParts.push(<p key={j}>{part}</p>);
            }
        }
  
        ps.push(<div className="my-2" key={i}>{formattedParts}</div>);
    }
    return ps;
  }

export function CardWithSubmit(props: Props) {
    const { toast } = useToast()

    return (
        // <Card className="w-[350px]">
        <Card className="w-[16vw] flex flex-col justify-between overflow-auto">
            <CardHeader>
                <CardTitle>Add availablilty</CardTitle>
                <CardDescription>Fill out your schedule</CardDescription>
            </CardHeader>
            <CardContent>
                <div>{formatter(buttonStatesToText(props.buttonStates))}</div>
            </CardContent>
            <CardFooter className="flex justify-center">
                <Button 
                className="w-full"
                onClick={() => {
                    props.setTeacherSchedule(
                        buttonsToSchedule(props.buttonStates, 30)
                    )
                    props.setState("student")
                    toast({
                        title: "Schedule added!",
                        description: "Now add your students...",
                    })
                    props.handleSubmit()
                }
                }>Submit</Button>
            </CardFooter>
        </Card>
    )
}