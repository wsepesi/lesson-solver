import * as z from 'zod';

import { Enrollment, type FormSchema } from '~/components/enrollment';
import { useRouter } from 'next/router';
import { useState } from 'react';
import StudentSchedule from '~/components/StudentSchedule';
import type { LessonLength } from 'lib/types';
import { DayLength, Days } from '../../../lib/utils'
import { DoneEnrolling } from '~/components/DoneEnrolling';
import { type StudioSchema } from 'lib/schema';

export const useTypedRouter = <T extends z.Schema>(schema: T) => {
    const { query, ...router } = useRouter();

    type safeSchema = {
        success: boolean;
        data?: z.infer<typeof schema>;
        error?: z.ZodError
    }
  
    return {
      query: schema.safeParse(query) as safeSchema,
      ...router
    };
  };

const routerSchema = z.object({
    code: z.string().min(5).max(5).optional()
});

export type RouterSchema = z.infer<typeof routerSchema>;

export type OnboardingState = "enroll" | "schedule" | "done";

export default function Enroll() {
    const [state, setState] = useState<OnboardingState>("enroll");
    const [formData, setFormData] = useState<FormSchema>({
        first_name: "",
        last_name: "",
        email: "",
        studioCode: ""
    });
    const [minutes, setMinutes] = useState<LessonLength>(30);
    const [buttonStates, setButtonStates] = useState<boolean[][]>(
        Array.from({ length: Days.length }, () => 
        Array.from({ length: DayLength }, () => false)
    )
    );
    const [studio, setStudio] = useState<StudioSchema | null>(null);

    const { query } = useTypedRouter(routerSchema);
    return (
        <>
            {state === "enroll" && <Enrollment 
                query={query.success ? query.data : undefined}
                setFormData={setFormData}
                setState={setState}
                studio={studio}
                setStudio={setStudio}
            />}
            {state === "schedule" && <StudentSchedule 
                setState={setState}
                buttonStates={buttonStates}
                setButtonStates={setButtonStates}
                minutes={minutes}
                setMinutes={setMinutes}
                studentInfo={formData}
                studio={studio}
            />}
            {state === "done" && <DoneEnrolling />}
        </>
    )
}