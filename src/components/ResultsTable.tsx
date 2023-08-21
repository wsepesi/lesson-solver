import { type Scheduled } from "lib/solver"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { blockOfTimeToSchedule } from "lib/utils"
import { blockOfTimeToString } from "lib/types"

type Props = {
    scheduled: Scheduled[]
}
  
  export function ResultsTable(props: Props) {
    const { scheduled } = props
    return (
      <Table className="mx-[25vw] max-w-[50vw] my-[25vh]">
        <TableCaption>Final schedules:</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Day</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {scheduled.map((schedule) => {
                const asSchedule = blockOfTimeToSchedule(schedule.interval)
                const selectedDay = Object.keys(asSchedule)[0]!
                const selectedTime = Object.values(asSchedule)[0]![0]!
                return (
                    <TableRow key={schedule.student.student.name}>
                        <TableCell>{schedule.student.student.name}</TableCell>
                        <TableCell>{schedule.student.student.email}</TableCell>
                        <TableCell>{selectedDay}</TableCell>
                        <TableCell className="text-right">{blockOfTimeToString(selectedTime)}</TableCell>
                    </TableRow>
                )
            })}
        </TableBody>
      </Table>
    )
  }
  