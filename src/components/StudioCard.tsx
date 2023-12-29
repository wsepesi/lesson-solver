import { Card, CardContent, CardDescription, CardTitle } from "src/components/ui/card"

import { Badge } from "src/components/ui/badge"
import Link from "next/link";
import type { StudioInfo } from "lib/types";

export default function StudioCard(props: StudioInfo) {
    const { name, numEnrolled, code, progress } = props
    return (
        <Card className="cursor-pointer">
            <Link href={`/studios/${code}`}>
                <CardContent className="grid gap-2 p-4  hover:bg-gray-100">
                    <CardTitle>Studio {name}</CardTitle>
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