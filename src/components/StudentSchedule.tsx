"use client";

import { AdaptiveCalendar } from "./scheduling/AdaptiveCalendar"
import type { FormSchema } from "./enrollment"
import type { LessonLength } from "lib/types"
import { OnboardStudentCard } from "./OnboardStudentCard"
import type { OnboardingState } from "@/app/enroll/page"
import type { StudioSchema } from "lib/db-types"
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
        <div className="min-h-screen bg-landing-background font-arimo py-8">
            <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-6 w-full">
                    <div className="lg:w-auto flex-shrink-0">
                        <OnboardStudentCard 
                            schedule={schedule}
                            minutes={minutes}
                            setMinutes={setMinutes}
                            setState={setState}
                            studentInfo={props.studentInfo}
                            studio={props.studio}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-lg shadow-sm border border-landing-blue/20 p-4">
                            <AdaptiveCalendar 
                                schedule={schedule}
                                onChange={onScheduleChange}
                                granularity={15}
                                showWeekends={props.studio?.calendar_days === 'full_week'}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}