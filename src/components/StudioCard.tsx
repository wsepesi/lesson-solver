import { Card, CardContent, CardDescription, CardTitle } from "src/components/ui/card"

import { Badge } from "src/components/ui/badge"
import Link from "next/link";
import { type StudioWithStudents } from "~/pages/studios";

type Props = {
    studio: StudioWithStudents
}

type Progress = "Not Started" | "In Progress" | "Done"

export default function StudioCard(props: Props) {
    const { studio_name, code, owner_schedule } = props.studio
    const numEnrolled = props.studio.students.length
    const progress: Progress = owner_schedule ? "In Progress" : "Not Started"
    return (
        <Card className="cursor-pointer">
            <Link href={`/studios/${code}`}>
                <CardContent className="grid gap-2 p-4  hover:bg-gray-100">
                    <CardTitle>{studio_name}</CardTitle>
                    <CardDescription>Students Enrolled: {numEnrolled}</CardDescription>
                    <CardDescription>Studio Code: {code}</CardDescription>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{progress}</Badge>
                    </div>
                </CardContent>
            </Link>
        </Card>
    )
}