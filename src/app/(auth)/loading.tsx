import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function AuthLoading() {
  return (
    <div className="bg-landing-background font-arimo min-h-screen flex items-center justify-center">
      <div className="max-w-sm rounded-lg shadow-lg bg-white p-6 space-y-6 border border-landing-blue/20 w-[40vw]">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-landing-blue">Loading...</h1>
          <p className="text-landing-blue/60">
            Please wait while we prepare your authentication
          </p>
        </div>
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    </div>
  )
}