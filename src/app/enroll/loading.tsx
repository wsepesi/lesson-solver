import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function EnrollLoading() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-landing-background font-arimo">
      <Card className="w-full max-w-md mx-auto bg-white border border-landing-blue/20">
        <CardHeader>
          <CardTitle className="text-center text-landing-blue">Loading...</CardTitle>
          <CardDescription className="text-center text-landing-blue/70">
            Please wait while we prepare the enrollment form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}