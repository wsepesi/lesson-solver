import { Skeleton } from "@/components/ui/skeleton"
import Navbar from "@/components/Navbar"

export default function StudioDetailLoading() {
  return (
    <>
      <Navbar />
      <main className="w-full h-full py-1 px-4 md:py-1 md:px-8">
        {/* Progress section skeleton */}
        <section className="mt-4 mb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-6 w-8" />
          </div>
          <Skeleton className="mt-2 h-2 w-full" />
        </section>

        {/* Header skeleton */}
        <header className="mb-8 flex flex-row items-end justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-32" />
        </header>

        <div className="flex space-x-10">
          {/* Main content skeleton (tasks) */}
          <section className="space-y-6 w-2/3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-32" />
              </div>
            ))}
          </section>

          {/* Sidebar skeleton */}
          <aside className="w-1/3 space-y-6">
            {/* Enrolled Students section */}
            <section className="bg-gray-100 p-4 rounded-md">
              <div className="flex flex-row w-full mb-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
              <ul className="space-y-2 flex flex-col">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="flex flex-row w-full justify-between">
                    <div className="flex flex-row justify-start items-center">
                      <Skeleton className="w-5 h-5 rounded-full mr-1" />
                      <Skeleton className="h-6 w-40" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </li>
                ))}
              </ul>
            </section>

            {/* Admin Tasks section */}
            <section className="bg-gray-100 p-4 rounded-md">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </>
  )
}