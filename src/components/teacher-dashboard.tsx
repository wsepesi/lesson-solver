/**
 * This code was generated by v0 by Vercel.
 * @see https://v0.dev/t/bhqpGuFxb21
 */
import { Card, CardContent, CardTitle } from "src/components/ui/card"

import Link from "next/link"
import StudioCard from "./StudioCard"
import type { StudioInfo } from "lib/types"

const DemoCardInfo: StudioInfo[] = [
  {
    name: "Alpha",
    numEnrolled: 50,
    code: "ALPHA123",
    progress: "Not Started",
  },
  {
    name: "Beta",
    numEnrolled: 35,
    code: "BETA456",
    progress: "In Progress",
  },
  {
    name: "Gamma",
    numEnrolled: 70,
    code: "GAMMA789",
    progress: "Done",
  },
]

export function TeacherDashboard() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <main className="flex min-h-[calc(100vh - _theme(spacing.16))] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <h1 className="text-4xl font-semibold text-center">Studios</h1>
        <hr />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl w-full mx-auto">
          <Card className="bg-black text-white flex items-center justify-center">
            <Link href="/studios/new">
              <CardContent className="flex items-center justify-center px-5 py-5">
                <PlusIcon className="w-4 h-4" />
                <CardTitle className="text-center">Create New Studio</CardTitle>
              </CardContent>
            </Link>
          </Card>
          {DemoCardInfo.map((info) => (
            <StudioCard key={info.code} {...info} />
          ))}
        </div>
      </main>
    </div>
  )
}


function PlusIcon(props: { className?: string }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}