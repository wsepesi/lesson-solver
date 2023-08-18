interface Time {
    hour: number;
    minute: number;
}

type BlockOfTime = {
    start: Time;
    end: Time;
}

type Day = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"

type Schedule = {
    [day in Day]?: BlockOfTime[];
}

type LessonLength = "30" | "60"

type StudentSchedule = {
    student: Student;
    schedule: Schedule;
}

type State = "teacher" | "student" | "result"

type Student = {
    name: string;
    email: string;
    lessonLength: LessonLength;
}

type StudentWithSchedule = Student & {
    schedule: StudentSchedule;
}