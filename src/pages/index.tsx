import Calendar from "~/components/Calendar";
import { CardWithForm } from "~/components/CardWithForm";
import { useState } from "react"

export default function Home() {
  const [students, setStudents] = useState<Student[]>([])
  return (
    <>
      <div className="flex flex-row items-center min-h-screen min-w-screen justify-between">
        <div className="flex flex-row max-w-[20vw] min-h-screen justify-center">
          <CardWithForm students={students} setStudents={setStudents}/>
        </div>
        <div className="flex flex-row w-[74vw] h-screen justify-center">
          <Calendar minutes={"30"} />
          {/* <CardWithForm students={students} setStudents={setStudents}/> */}
        </div>
      </div>
    </>
  );
}
