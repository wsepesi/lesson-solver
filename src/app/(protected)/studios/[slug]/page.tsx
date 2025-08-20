"use client";

import type { StudentSchema, StudioSchema } from "lib/db-types"
import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { MyStudio } from "@/components/my-studio"
import { StudioSkeleton } from "@/components/StudioSkeleton"
import Navbar from "@/components/Navbar"
import { useRouter } from "next/navigation"

export type StudioWithStudents = StudioSchema & {
    students: StudentSchema[]
}

export default function StudioDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
    const supabaseClient = createClient()
    const router = useRouter()
    const [slug, setSlug] = useState<string>("")
    
    useEffect(() => {
        void params.then(p => setSlug(p.slug))
    }, [params])

    const [studio, setStudio] = useState<StudioWithStudents | null>(null)

    useEffect(() => {
        // get studio from db and check if session user is the owner FIXME: maybe like set this up w RLS instead of this janky way of doing it
        const getStudio = async () => {
            // Get authenticated user
            const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
            if (authError || !authUser) {
                router.push("/studios")
                return
            }

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
            
            if (!studio || authUser.id !== studio.user_id) {
                router.push("/studios") // TODO: do this more ceremoniously
                return
            }

            setStudio(studio)
        }
        if (slug) void getStudio()
    }, [supabaseClient, router, slug])

    return (
        <div className="min-h-screen bg-landing-background font-arimo">
            <Navbar />
            {studio ? 
                <MyStudio 
                    studio={studio} 
                    setStudio={setStudio}
                /> : <StudioSkeleton />}
        </div>
    )
}