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
import type { Schedule, State } from "lib/types"
import { buttonStatesToText } from "lib/utils"
import { createEmptyWeekSchedule } from "lib/scheduling/utils"
// buttonsToSchedule removed - component needs migration to minute-based format

import { Button } from "@/components/ui/button"
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
        const colonIndex = line!.indexOf(':');
        
        if (colonIndex !== -1) {
            // Day name and times are on same line
            const dayName = line!.substring(0, colonIndex + 1);
            const times = line!.substring(colonIndex + 1).trim();
            
            ps.push(
                <div className="my-1 text-sm" key={i}>
                    <span className="font-semibold">{dayName}</span>
                    <span className="ml-1">{times}</span>
                </div>
            );
        } else {
            // Handle "No availability set" case
            ps.push(<div className="my-1 text-sm" key={i}>{line}</div>);
        }
    }
    return ps;
  }

export function CardWithSubmit(props: Props) {
    const { toast } = useToast()

    return (
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
                    // TODO: Migrate to minute-based TimeInterval format
                    // For now, create empty schedule as placeholder
                    props.setTeacherSchedule(createEmptyWeekSchedule())
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