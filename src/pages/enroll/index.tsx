import * as z from 'zod';

import { Enrollment, type FormSchema } from '~/components/enrollment';
import { useRouter } from 'next/router';
import { useState } from 'react';
import StudentSchedule from '~/components/StudentSchedule';
import type { LessonLength } from 'lib/types';
import { DayLength, Days } from '../../../lib/utils'
import { DoneEnrolling } from '~/components/DoneEnrolling';

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
        name: "",
        email: "",
        studioCode: ""
    });
    const [minutes, setMinutes] = useState<LessonLength>("30");
    const [buttonStates, setButtonStates] = useState<boolean[][]>(
        Array.from({ length: Days.length }, () => 
        Array.from({ length: DayLength }, () => false)
    )
    );
    
    const { query } = useTypedRouter(routerSchema);
    return (
        <>
            {state === "enroll" && <Enrollment 
                query={query.success ? query.data : undefined}
                setFormData={setFormData}
                setState={setState}
            />}
            {state === "schedule" && <StudentSchedule 
                setState={setState}
                buttonStates={buttonStates}
                setButtonStates={setButtonStates}
                minutes={minutes}
                setMinutes={setMinutes}
                studentInfo={formData}
            />}
            {state === "done" && <DoneEnrolling />}
        </>
    )
}