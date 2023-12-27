export class Time {
    hour: number;
    minute: number;
    constructor(hour: number, minute: number) {
        this.hour = hour;
        this.minute = minute;
    }

    greaterThan(other: Time) {
        return this.hour > other.hour || (this.hour === other.hour && this.minute > other.minute);
    }

    lessThan(other: Time) {
        return this.hour < other.hour || (this.hour === other.hour && this.minute < other.minute);
    }

    geq(other: Time) {
        return this.hour > other.hour || (this.hour === other.hour && this.minute >= other.minute);
    }

    leq(other: Time) {
        return this.hour < other.hour || (this.hour === other.hour && this.minute <= other.minute);
    }

    equals(other: Time): boolean {
        return this.hour === other.hour && this.minute === other.minute;
    }

    static toStr(time: Time) {
        return `${time.hour}:${time.minute}`;
    }

    valueOf() {
        return this.hour * 60 + this.minute;
    }

    static fromValue(value: number) {
        return new Time(Math.floor(value / 60), value % 60);
    }
}

export type BlockOfTime = {
    start: Time;
    end: Time;
}

export const blockOfTimeToString = (block: BlockOfTime) => {
    // return as AM PM format ie "9:00 AM - 10:00 AM"
    const start = block.start;
    const end = block.end;
    const startStr = `${start.hour % 12 === 0 ? 12 : start.hour % 12}:${start.minute === 0 ? "00" : start.minute} ${start.hour < 12 ? "AM" : "PM"}`;
    const endStr = `${end.hour % 12 === 0 ? 12 : end.hour % 12}:${end.minute === 0 ? "00" : end.minute} ${end.hour < 12 ? "AM" : "PM"}`;
    return `${startStr} - ${endStr}`;
}

export type Day = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"

export type Schedule = {
    [day in Day]?: BlockOfTime[];
}

export type LessonLength = "30" | "60"

export type StudentSchedule = {
    student: Student;
    schedule: Schedule;
}

export type State = "teacher" | "student" | "result" | "failed"

export type Student = {
    name: string;
    email: string;
    lessonLength: LessonLength;
}

export type StudentWithSchedule = Student & {
    schedule: Schedule
}

export type Interval = {
    start: number,
    end: number
}
export type StudentAvailability =  {
    student: Student,
    availability: BlockOfTime[]
}
export type Scheduled =  {
    student: StudentAvailability,
    interval: BlockOfTime
}

export type ScheduleAndScore = {
    schedule: Scheduled[],
    score: number
}

export type NewStudioInfo = {
    name: string
}

export type StudioProgress = "Not Started" | "In Progress" | "Done"

export type StudioInfo = {
    name: string,
    numEnrolled: number,
    code: string
    progress: StudioProgress
}