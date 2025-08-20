import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "src/components/ui/card"

export function DoneEnrolling() { 
  return (
    <div className="flex justify-center items-center min-h-screen bg-landing-background font-arimo">
      <Card className="w-full max-w-md mx-auto bg-white border border-landing-blue/20">
        <CardHeader>
          <CardTitle className="text-center text-landing-blue">Done!</CardTitle>
          <CardDescription className="text-center text-landing-blue/70">
          We&apos;ve sent your schedule off to the studio. You&apos;ll be notified when times are finalized.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center font-light text-landing-blue/60">
          <div>If you want to change your schedule, you can input the same studio code and email again.</div>
        </CardContent>
      </Card>
    </div>
  )
}
