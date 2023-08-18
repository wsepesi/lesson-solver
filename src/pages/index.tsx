import { Button } from "~/components/ui/button";
import CalendarHandler from "~/components/CalendarHandler";
import { CardAndCalendar } from "~/components/CardAndCalendar";
import { Toaster } from "~/components/ui/toaster";
import { useState } from "react"

export default function Home() {
  const [studentSchedules, setStudentSchedules] = useState<StudentSchedule[]>([])
  const [teacherSchedule, setTeacherSchedule] = useState<Schedule>({})
  const [minutes, setMinutes] = useState<LessonLength>("30")
  const [state, setState] = useState<State>("teacher")
  return (
    <>
      <div className="flex flex-row min-h-screen min-w-screen justify-center">
        {state === "teacher" && 
          <div className="flex flex-row w-full">
            <CalendarHandler
              minutes={minutes}
              setState={setState}
              setTeacherSchedule={setTeacherSchedule}
            />
          </div>
        }
        {state === "student" && <CardAndCalendar 
          studentSchedules={studentSchedules}
          setStudentSchedules={setStudentSchedules}
          minutes={minutes}
          setMinutes={setMinutes}
          setState={setState}
        />}
        {/* {state === "result" && } */}
        <Button onClick={() => {
          console.log(studentSchedules)
          console.log(teacherSchedule)
        }}>Log</Button>
      </div>
      <Toaster />
    </>
  );
}