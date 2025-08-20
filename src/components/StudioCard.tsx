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
        <Link href={`/studios/${code}`}>
            <Card className="cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-gray-50 h-[20vh]">
                <CardContent className="grid gap-2 p-4 h-full flex flex-col justify-center">
                    <CardTitle>{studio_name}</CardTitle>
                    <CardDescription>Students Enrolled: {numEnrolled}</CardDescription>
                    <CardDescription>Studio Code: {code}</CardDescription>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{progress}</Badge>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}