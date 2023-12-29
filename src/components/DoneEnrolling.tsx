import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "src/components/ui/card"

export function DoneEnrolling() { 
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Done!</CardTitle>
          <CardDescription className="text-center">
          We&apos;ve sent your schedule off to the studio. You&apos;ll be notified when times are finalized.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center font-light">
          <div>If you want to change your schedule, you can input the same studio code and email again.</div>
        </CardContent>
      </Card>
    </div>
  )
}
