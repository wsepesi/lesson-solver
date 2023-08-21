import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert"

export function FailAlert() {
  return (
    <Alert variant={"destructive"} className="w-auto h-[10vh] my-[40vh]">
      <AlertTitle>Failure</AlertTitle>
      <AlertDescription>
        The schedule failed to solve...
      </AlertDescription>
    </Alert>
  )
}
