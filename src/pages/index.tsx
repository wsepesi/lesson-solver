export default function Home() {
  return (
    <>
      <h1>hello</h1>
    </>
  )

}

// import type { LessonLength, Schedule, Scheduled, State, StudentAvailability, StudentSchedule } from "lib/types";
// import { useEffect, useState } from "react"

// import CalendarHandler from "~/components/CalendarHandler";
// import { CardAndCalendar } from "~/components/CardAndCalendar";
// import { FailAlert } from "~/components/FailAlert";
// import { ResultsTable } from "~/components/ResultsTable";
// import { Toaster } from "~/components/ui/toaster";
// import { schedule } from "lib/solver";
// import { scheduleToAvailability } from "lib/utils";

// export default function Home() {
//   const [studentSchedules, setStudentSchedules] = useState<StudentSchedule[]>([])
//   const [teacherSchedule, setTeacherSchedule] = useState<Schedule>({})
//   const [minutes, setMinutes] = useState<LessonLength>("30")
//   const [state, setState] = useState<State>("teacher")
//   const [finalSchedule, setFinalSchedule] = useState<Scheduled[]>([])

//   useEffect(() => {
//     if (state === "result") {
//       try {
//         const teacherAvailability = scheduleToAvailability(teacherSchedule)
//         const studentAvailabilities: StudentAvailability[] = studentSchedules.map((studentSchedule) => {
//           return {
//             student: studentSchedule.student,
//             availability: scheduleToAvailability(studentSchedule.schedule)
//           }
//         })
//         const scheduled = schedule(teacherAvailability, studentAvailabilities)
//         if (scheduled === null || scheduled.length === 0) {
//           throw new Error("No schedule found")
//         }
//         const finalSchedule = scheduled.sort((a, b) => {
//           return a.interval.start.valueOf() - b.interval.start.valueOf()
//         })
//         setFinalSchedule(finalSchedule)
//       } catch (e) {
//         alert(e)
//         console.log(e)
//         console.log(studentSchedules, "studentSchedules")
//         console.log(teacherSchedule, "teacherSchedule")
//         setState("failed")
//       }
//     }
//   }, [state, teacherSchedule, studentSchedules])
//   return (
//     <>
//       <div className="flex flex-row min-h-screen min-w-screen justify-center">
//         {state === "teacher" && 
//           <div className="flex flex-row w-full">
//             <CalendarHandler
//               minutes={minutes}
//               setState={setState}
//               setTeacherSchedule={setTeacherSchedule}
//             />
//           </div>
//         }
//         {state === "student" && <CardAndCalendar 
//           studentSchedules={studentSchedules}
//           setStudentSchedules={setStudentSchedules}
//           minutes={minutes}
//           setMinutes={setMinutes}
//           setState={setState}
//         />}
//         {state === "result" && <ResultsTable
//           scheduled={finalSchedule}
//         />}
//         {state === "failed" && <FailAlert />}
//       </div>
//       <Toaster />
//     </>
//   );
// }