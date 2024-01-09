import type { StudentSchema, StudioSchema } from "lib/schema"
import { useEffect, useState } from "react"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"

import { MyStudio } from "~/components/my-studio"
import Navbar from "~/components/Navbar"
import { useRouter } from "next/router"

export type StudioWithStudents = StudioSchema & {
    students: StudentSchema[]
}

export default function Studio() {
    const user = useUser()
    const supabaseClient = useSupabaseClient()
    // make variable thats the slug, pulled from the url
    const router = useRouter()
    const slug = router.query.slug as string

    const [studio, setStudio] = useState<StudioWithStudents | null>(null)

    useEffect(() => {
        // get studio from db and check if session user is the owner FIXME: maybe like set this up w RLS instead of this janky way of doing it
        const getStudio = async () => {
            const res = await supabaseClient.from("studios").select(`
                *,
                students (
                    *
                )
            `).eq("code", slug)
            if (res.error ?? !res.data) { //TODO: HANDLE
                console.log(res.error)
                return
            }
            const studio = res.data[0] as StudioWithStudents
            
            if (user!.id !== studio.user_id) {
                await router.push("/studios") // TODO: do this more ceremoniously
            }

            setStudio(studio)
        }
        if (user) void getStudio()
    }, [supabaseClient, user, router, slug])

    return (
        <>
            <Navbar />
            {studio ? 
                <MyStudio 
                    studio={studio} 
                    setStudio={setStudio}
                /> : <p className="w-full h-[80vh] flex flex-row items-center justify-center">Loading...</p>}
        </>
    )
}