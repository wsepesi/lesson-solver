import { type User, useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

import Navbar from "~/components/Navbar";
import { TeacherDashboard } from "~/components/teacher-dashboard";
import { useEffect, useState } from "react";
import { type StudioSchema } from "lib/schema";


type DummyStudent = {
    id: string
}
export type StudioWithStudents = StudioSchema & {
    students: DummyStudent[]
}

export default function Studios() {
    const supabaseClient = useSupabaseClient()
    const user: User | null = useUser()

    const [studios, setStudios] = useState<StudioWithStudents[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            const studiosWithStudentsQuery = supabaseClient.from("studios").select(`
                *,
                students (
                    id
                )
            `)
            const res = await studiosWithStudentsQuery
            if (res.error ?? !res.data) {
                console.log(res.error)
                alert("There was an error. Please try again later.")
                return
            }
            const data = res.data as StudioWithStudents[]
            console.log(data)
            setStudios(data)
            setLoading(false)
        }
        if (user) void loadData()
    }, [supabaseClient, user])

    return (
        <>
            <Navbar />
            {(loading || !user) ? <p className="w-full h-[80vh] flex flex-row items-center justify-center">Loading...</p> : 
            <TeacherDashboard 
                studios={studios}
                user={user}
            />}
        </>
    )
}