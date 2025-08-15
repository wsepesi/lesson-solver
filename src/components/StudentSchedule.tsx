"use client";

import { AdaptiveCalendar } from "./scheduling/AdaptiveCalendar"
import type { FormSchema } from "./enrollment"
import type { LessonLength } from "lib/types"
import { OnboardStudentCard } from "./OnboardStudentCard"
import type { OnboardingState } from "@/app/enroll/page"
import { type StudioSchema } from "lib/schema"
import type { WeekSchedule } from "lib/scheduling/types"

type Props = {
    setState: (state: OnboardingState) => void,
    schedule: WeekSchedule,
    onScheduleChange: (schedule: WeekSchedule) => void,
    minutes: LessonLength,
    setMinutes: (minutes: LessonLength) => void,
    studentInfo: FormSchema
    studio: StudioSchema | null
}

export default function StudentSchedule(props: Props) {
    const { schedule, onScheduleChange, setState, minutes, setMinutes } = props
    
    return (
        <>
            <div className="flex flex-row w-full">
                <OnboardStudentCard 
                    schedule={schedule}
                    minutes={minutes}
                    setMinutes={setMinutes}
                    setState={setState}
                    studentInfo={props.studentInfo}
                    studio={props.studio}
                />
                <div className="flex-1">
                    <AdaptiveCalendar 
                        schedule={schedule}
                        onChange={onScheduleChange}
                        granularity={15}
                        minTime="07:00"
                        maxTime="22:00"
                    />
                </div>
            </div>
        </>
    )
}