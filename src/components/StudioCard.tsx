import { Card, CardContent, CardDescription, CardTitle } from "src/components/ui/card"

import { Badge } from "src/components/ui/badge"
import Link from "next/link";
import { type StudioWithStudents } from "@/app/(protected)/studios/page";

type Props = {
    studio: StudioWithStudents
}

type Progress = "Not Started" | "In Progress" | "Done"

const determineProgress = (studio: StudioWithStudents): Progress => {
    if (studio.events && studio.events.length > 0) {
        return "Done"
    }
    if (studio.owner_schedule) {
        return "In Progress"
    }
    return "Not Started"
}

export default function StudioCard(props: Props) {
    const { studio_name, code } = props.studio
    const numEnrolled = props.studio.students.length
    const progress: Progress = determineProgress(props.studio)
    return (
        <Link href={`/studios/${code}`} prefetch={true}>
            <Card className="cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-landing-blue/5 h-[20vh] bg-white border border-landing-blue/20">
                <CardContent className="grid gap-2 p-4 h-full flex flex-col justify-center">
                    <CardTitle className="text-landing-blue">{studio_name}</CardTitle>
                    <CardDescription className="text-landing-blue/70">Students Enrolled: {numEnrolled}</CardDescription>
                    <CardDescription className="text-landing-blue/70">Studio Code: {code}</CardDescription>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-landing-blue text-landing-blue">{progress}</Badge>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}