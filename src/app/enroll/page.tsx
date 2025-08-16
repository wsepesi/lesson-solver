'use client';

import * as z from 'zod';
import { Enrollment, type FormSchema } from '@/components/enrollment';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import StudentSchedule from '@/components/StudentSchedule';
import type { LessonLength } from 'lib/types';
import { DoneEnrolling } from '@/components/DoneEnrolling';
import type { StudioSchema } from 'lib/db-types';
import { createEmptyWeekSchedule } from '../../../lib/scheduling/utils';
import type { WeekSchedule } from '../../../lib/scheduling/types';

const routerSchema = z.object({
    code: z.string().min(5).max(5).optional()
});

export type RouterSchema = z.infer<typeof routerSchema>;

export type OnboardingState = "enroll" | "schedule" | "done";

function EnrollContent() {
    const [state, setState] = useState<OnboardingState>("enroll");
    const [formData, setFormData] = useState<FormSchema>({
        first_name: "",
        last_name: "",
        email: "",
        studioCode: ""
    });
    const [minutes, setMinutes] = useState<LessonLength>(30);
    
    // Use new WeekSchedule instead of boolean arrays
    const [studentSchedule, setStudentSchedule] = useState<WeekSchedule>(createEmptyWeekSchedule());
    const [studio, setStudio] = useState<StudioSchema | null>(null);

    // Handle search params in App Router
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const parsedQuery = routerSchema.safeParse({ code });

    return (
        <>
            {state === "enroll" && <Enrollment 
                query={parsedQuery.success ? parsedQuery.data : undefined}
                setFormData={setFormData}
                setState={setState}
                studio={studio}
                setStudio={setStudio}
            />}
            {state === "schedule" && <StudentSchedule 
                setState={setState}
                schedule={studentSchedule}
                onScheduleChange={setStudentSchedule}
                minutes={minutes}
                setMinutes={setMinutes}
                studentInfo={formData}
                studio={studio}
            />}
            {state === "done" && <DoneEnrolling />}
        </>
    )
}

export default function EnrollPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EnrollContent />
        </Suspense>
    )
}