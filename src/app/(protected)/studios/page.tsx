import { createClient } from "@/utils/supabase/server";
import Navbar from "@/components/Navbar";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import type { StudioSchema } from "lib/db-types";

type DummyStudent = {
    id: string
}
export type StudioWithStudents = StudioSchema & {
    students: DummyStudent[]
}

export default async function StudiosPage() {
    const supabase = await createClient();
    
    // Get user (already verified in layout)
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch studios with students
    const { data: studiosData, error } = await supabase
        .from("studios")
        .select(`
            *,
            students (
                id
            )
        `)
        .eq("user_id", user!.id)
        .order("id", { ascending: false });

    if (error) {
        console.error("Error loading studios:", error);
        // For now, just return empty array - in production you'd want proper error handling
        const studios: StudioWithStudents[] = [];
        return (
            <div className="min-h-screen bg-landing-background font-arimo">
                <Navbar />
                <TeacherDashboard 
                    studios={studios}
                    user={user!}
                />
            </div>
        );
    }

    const studios = (studiosData || []) as StudioWithStudents[];

    return (
        <div className="min-h-screen bg-landing-background font-arimo">
            <Navbar />
            <TeacherDashboard 
                studios={studios}
                user={user!}
            />
        </div>
    );
}