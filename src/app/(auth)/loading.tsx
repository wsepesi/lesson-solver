import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function AuthLoading() {
  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center">
      <div className="max-w-sm rounded-lg shadow-lg bg-white p-6 space-y-6 border border-gray-200 dark:border-gray-700 w-[40vw]">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Loading...</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
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