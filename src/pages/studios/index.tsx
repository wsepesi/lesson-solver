import Navbar from "~/components/Navbar";
import { TeacherDashboard } from "~/components/teacher-dashboard";
// import { useEffect } from "react";
import { useUser } from "@supabase/auth-helpers-react";

export default function Studios() {
    const user = useUser()

    // useEffect(() => {
    //     console.log(user)
    // }, [user])
    return (
        <>
            {/* {user && <p>{user.email}</p>} */}
            <Navbar />
            <TeacherDashboard />
        </>
    )
}