import { MyStudio } from "~/components/my-studio"
import type { StudioInfo } from "lib/types"
import { useRouter } from "next/router"

type demoStudent = {
    name: string,
    email: string,
    progress: "Not Started" | "In Progress" | "Completed",
}

export default function Studio() {
    // make variable thats the slug, pulled from the url
    const router = useRouter()
    const q = router.query
    const slug = q.slug as string

    const studio: StudioInfo = {
        name: slug,
        numEnrolled: 0,
        code: "string",
        progress: "Not Started",
    }

    const demoStudents: demoStudent[] = [
        {
            name: "Student 1",
            email: "s1@gmail.com",
            progress: "Not Started",
        },
        {
            name: "Student 2",
            email: "s2@gmail.com",
            progress: "Completed",
        },
        {
            name: "Student 3",
            email: "s3@gmail.com",
            progress: "In Progress",
        },
    ]
    return (
        <>
            <MyStudio name={studio.name} students={demoStudents} />
        </>
    )
}

export type {demoStudent}