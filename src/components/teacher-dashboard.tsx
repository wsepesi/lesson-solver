/**
 * This code was generated by v0 by Vercel.
 * @see https://v0.dev/t/bhqpGuFxb21
 */
import { Card, CardContent, CardTitle } from "src/components/ui/card"

import Link from "next/link"
import StudioCard from "./StudioCard"
import { type User } from "@supabase/auth-helpers-react"
import { type StudioWithStudents } from "~/pages/studios"


type Props = {
  studios: StudioWithStudents[],
  user: User
}

export function TeacherDashboard(props: Props) {
  const { user, studios } = props
  const isPaid = true
  return (
    <div className="flex flex-col w-full h-full">
      <main className="flex min-h-[calc(100vh - _theme(spacing.16))] flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        {/* <h1 className="text-4xl font-semibold text-center">Studios</h1>
        <hr /> */}
        <div className="font-medium my-0 py-0 px-[7vw] flex flex-row justify-between w-full">
          {/* TODO: username on signup and display here */}
          <p className="text-2xl">Welcome{(user.user_metadata?.first_name) ? ` ${user.user_metadata.first_name}!` : ""}</p>
          <p className="text-gray-500 text-right">{studios.length} / {isPaid ? 50 : 1} Studios Created</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl w-full mx-auto">
          <Card className="bg-black text-white flex items-center justify-center w-full h-[20vh]">
            <Link className="w-full h-full flex items-center justify-center" href="/studios/new">
              <CardContent className="flex items-center justify-center p-0">
                <PlusIcon className="w-4 h-4 mx-1" />
                <CardTitle className="text-center">Create New Studio</CardTitle>
              </CardContent>
            </Link>
          </Card>
          {studios.map((studio) => (
            <StudioCard key={studio.code} studio={studio} />
          ))}
          {/* TODO: loading skeleton */}
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