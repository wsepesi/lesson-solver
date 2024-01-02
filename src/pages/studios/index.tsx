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

    useEffect(() => {
        const loadData = async () => {
            // const res = await supabaseClient.from("studios").select("*")
            // if (res.error ?? !res.data) {
            //     console.log(res.error)
            //     return
            // }
            // const data = res.data as StudioSchema[]
            // console.log(data)
            // setStudios(data)


            const studiosWithStudentsQuery = supabaseClient.from("studios").select(`
                *,
                students (
                    id
                )
            `)
            const res = await studiosWithStudentsQuery
            if (res.error ?? !res.data) {
                console.log(res.error)
                return
            }
            const data = res.data as StudioWithStudents[]
            console.log(data)
            setStudios(data)
        }
        if (user) void loadData()
    }, [supabaseClient, user])

    return (
        <>
            {/* {user && <p>{user.email}</p>} */}
            <Navbar />
            <TeacherDashboard 
                studios={studios}
                user={user!}
            />
        </>
    )
}