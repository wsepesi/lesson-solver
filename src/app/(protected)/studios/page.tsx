"use client";

import { type User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { useUser } from "@/hooks/useUser";
import Navbar from "@/components/Navbar";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import type { StudioSchema } from "lib/db-types";
import StudiosLoading from "./loading";

type DummyStudent = {
    id: string
}
export type StudioWithStudents = StudioSchema & {
    students: DummyStudent[]
}

export default function StudiosPage() {
    const supabaseClient = createClient()
    const { user }: { user: User | null } = useUser()
    const { toast } = useToast()

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
                toast({
                    variant: "destructive",
                    title: "Error loading studios",
                    description: "Unable to load your studios. Please try again later."
                })
                setLoading(false)
                return
            }
            const data = res.data as StudioWithStudents[]

            // filter to only matching the user id, sort by creation date
            const filteredData = data.filter(d => d.user_id === user!.id).sort((a, b) => b.id - a.id)
            setStudios(filteredData)
            setLoading(false)
        }
        if (user) void loadData()
    }, [supabaseClient, user, toast])

    return (
        <div className="min-h-screen bg-landing-background font-arimo">
            {(loading || !user) ? <StudiosLoading /> : 
            <>
                <Navbar />
                <TeacherDashboard 
                    studios={studios}
                    user={user}
                />
            </>}
        </div>
    )
}