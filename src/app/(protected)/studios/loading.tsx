import { Skeleton } from "@/components/ui/skeleton"
import Navbar from "@/components/Navbar"

export default function StudiosLoading() {
  return (
    <div className="min-h-screen bg-landing-background font-arimo">
      <Navbar />
      <main className="flex min-h-[calc(100vh-_theme(spacing.16))] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <div className="font-medium my-0 py-0 px-[7vw] flex flex-row justify-between w-full">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl w-full mx-auto">
          {/* Create new studio card placeholder */}
          <div className="bg-landing-blue/10 animate-pulse rounded-lg flex items-center justify-center w-full h-[20vh]">
            <div className="flex items-center justify-center text-landing-blue/40">
              <div className="w-4 h-4 mx-1 bg-landing-blue/30 rounded"></div>
              <div className="h-6 w-32 bg-landing-blue/30 rounded"></div>
            </div>
          </div>
          
          {/* Studio card skeletons */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-landing-blue/20 shadow-sm p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}