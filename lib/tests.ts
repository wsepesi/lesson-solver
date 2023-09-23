import type { BlockOfTime, LessonLength } from "./types";
import type { Scheduled, StudentAvailability } from "./types";

import { Time } from "./types";
import { schedule } from "./solver";

const getIntervals = (arrs: number[][]): BlockOfTime[] => {
   return arrs.map((arr) => {
        return { start: new Time(arr[0]!, 0), end: new Time(arr[1]!, 0)}
    })
}

const toStr = (lessonLength: number): LessonLength => {
    return lessonLength === 30 ? "30" : "60"
}

const getStudents = (arrs: [number, [number, number][]][]): StudentAvailability[] => {
    return arrs.map((arr) => {
        return {
            student: {
                lessonLength: toStr(arr[0]),
                name: "test",
                email: "test"
            },
            availability: getIntervals(arr[1])
        }
    })
}

const checker = (result: Scheduled[] | null, A_me: BlockOfTime[], S: StudentAvailability[], testNum: number) => {
    // check if each student is scheduled at a time they are available, and that the teacher is available, and the scheduled blocks are non-overlapping
    if (result === null) {
        console.log("No solution found")
        return
    }
    // check if each student is scheduled at a time they are available
    result.forEach((scheduled) => {
        const avail = scheduled.student.availability
        const interval = scheduled.interval

        let isAvail = false
        avail.forEach((block) => {
            // check if the interval is within the block
            if (interval.start.geq(block.start) && interval.end.leq(block.end)) {
                isAvail = true
            }
        })
        if (!isAvail) {
            console.log("Student scheduled at time not available")
        }
    })

    // check if the teacher is available
    result.forEach((scheduled) => {
        const interval = scheduled.interval
        let isAvail = false
        A_me.forEach((block) => {
            if (interval.start.geq(block.start) && interval.end.leq(block.end)) {
                isAvail = true
            }
        })
        if (!isAvail) {
            console.log("Teacher scheduled at time not available")
        }
    })

    // check if the scheduled blocks are non-overlapping
    const used: BlockOfTime[] = []
    result.forEach((scheduled) => {
        const interval = scheduled.interval
        used.forEach((block) => {
            if (!(interval.start.geq(block.end) || interval.end.leq(block.start))) {
                console.log("Overlapping scheduled blocks")
            }
        })
        used.push(interval)
    })

    // check if the scheduled blocks are of the correct length
    result.forEach((scheduled) => {
        const interval = scheduled.interval
        const lessonLength = scheduled.student.student.lessonLength
        const length = lessonLength === "30" ? 30 : 60
        if (interval.end.valueOf() - interval.start.valueOf() !== length) {
            console.log("Incorrect length of scheduled block")
        }
    })
}


export const runTests = () => {
    

    // Test case 1 - Basic example with one student
    let A_me: BlockOfTime[] = getIntervals([[8, 10], [13, 16], [18, 21]])
    let S: StudentAvailability[] = getStudents([[60, [[7, 9], [10, 13]]]]);

    let result = schedule(A_me, S);
    console.log(result, "res")
    checker(result, A_me, S, 1);
    result = []

    // Test case 2 - More students, unavailability at the start
    A_me = getIntervals([[8, 22]]);
    S = getStudents([[30, [[6, 20]]], [60, [[12, 13], [15, 16]]], [60, [[9, 11], [17, 19]]]]);

    result = schedule(A_me, S);
    console.log(result, 'Test 2 Result')
    checker(result, A_me, S, 2);
   
    // Test case 3 - More students, different lengths of lessons
    A_me = getIntervals([[8, 22]]);
    S = getStudents([[30, [[8, 10], [12, 13]]], [60, [[11, 20]]], [60, [[8, 22]]], [60, [[8, 22]]], [60, [[8, 22]]]]);

    result = schedule(A_me, S);
    console.log(result, 'Test 3 Result');
    checker(result, A_me, S, 3);
    // checker(result, 3);


    // Test case 4 - Overlapping interval on student's schedules
    A_me = getIntervals([[8, 20], [21, 24]]);
    S = getStudents(
    [[30, [[7, 9], [10, 12], [13, 15], [20, 23]]], 
    [60, [[7, 9], [11, 13], [14, 17], [22, 24]]], 
    [30, [[7, 9], [10, 13], [13, 15], [20, 22]]], 
    [60, [[7, 9], [11, 12], [14, 17], [23, 24]]], 
    [30, [[8, 10], [12, 15], [17, 21], [22, 24]]]])
        

    result = schedule(A_me, S);
    console.log(result, 'Test 4 Result');
    checker(result, A_me, S, 4);

    // checker(result, 4);
    // // The conformance to assertions depends upon the specifics of scheduling policy

    // // Test case 5 - Test more than one valid solution (uses random assign)
    // A_me = [[8, 22]];
    // S = Array(15).fill(0).map((_, i) => [30 * (i % 4 + 1), [[8, 22]]]);

    // result = schedule(A_me, S);
    // console.log(result, 'Test 5 Result');
    // checker(result, 5);
}