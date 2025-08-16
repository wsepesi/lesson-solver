import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { timeIntervalToString, type Scheduled } from "lib/types"

type Props = {
    scheduled: Scheduled[]
}
  
  export function ResultsTable(props: Props) {
    const { scheduled } = props
    return (
      <Table className="mx-[25vw] max-w-[50vw] my-[25vh]">
        <TableCaption>Final schedules</TableCaption>
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
                const timeString = timeIntervalToString(schedule.interval)
                
                return (
                    <TableRow key={schedule.student.student.name}>
                        <TableCell>{schedule.student.student.name}</TableCell>
                        <TableCell>{schedule.student.student.email}</TableCell>
                        <TableCell>TBD</TableCell>
                        <TableCell className="text-right">{timeString}</TableCell>
                    </TableRow>
                )
            })}
        </TableBody>
      </Table>
    )
  }
  