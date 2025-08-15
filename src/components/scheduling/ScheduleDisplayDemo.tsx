"use client";

import React from "react";
import ScheduleDisplay from "./ScheduleDisplay";
import { type ScheduleSolution, type WeekSchedule, type Person } from "lib/scheduling/types";

// Demo data for the ScheduleDisplay component
const createDemoData = () => {
  // Sample students
  const students: Person[] = [
    { id: "1", name: "Alice Johnson", email: "alice@example.com" },
    { id: "2", name: "Bob Smith", email: "bob@example.com" },
    { id: "3", name: "Charlie Brown", email: "charlie@example.com" },
    { id: "4", name: "Diana Wilson", email: "diana@example.com" },
    { id: "5", name: "Eve Davis", email: "eve@example.com" },
  ];

  // Sample teacher schedule (available times)
  const teacherSchedule: WeekSchedule = {
    timezone: "America/New_York",
    days: [
      // Sunday
      { dayOfWeek: 0, blocks: [] },
      // Monday
      {
        dayOfWeek: 1,
        blocks: [
          { start: 540, duration: 240 }, // 9:00 AM - 1:00 PM (4 hours)
          { start: 840, duration: 180 }, // 2:00 PM - 5:00 PM (3 hours)
        ],
      },
      // Tuesday  
      {
        dayOfWeek: 2,
        blocks: [
          { start: 600, duration: 360 }, // 10:00 AM - 4:00 PM (6 hours)
        ],
      },
      // Wednesday
      {
        dayOfWeek: 3,
        blocks: [
          { start: 540, duration: 180 }, // 9:00 AM - 12:00 PM (3 hours)
          { start: 780, duration: 240 }, // 1:00 PM - 5:00 PM (4 hours)
        ],
      },
      // Thursday
      {
        dayOfWeek: 4,
        blocks: [
          { start: 660, duration: 300 }, // 11:00 AM - 4:00 PM (5 hours)
        ],
      },
      // Friday
      {
        dayOfWeek: 5,
        blocks: [
          { start: 480, duration: 180 }, // 8:00 AM - 11:00 AM (3 hours)
          { start: 720, duration: 240 }, // 12:00 PM - 4:00 PM (4 hours)
        ],
      },
      // Saturday
      {
        dayOfWeek: 6,
        blocks: [
          { start: 600, duration: 180 }, // 10:00 AM - 1:00 PM (3 hours)
        ],
      },
    ],
  };

  // Sample schedule solution with some assignments and conflicts
  const scheduleSolution: ScheduleSolution = {
    assignments: [
      // Monday assignments
      {
        studentId: "1",
        dayOfWeek: 1,
        startMinute: 540, // 9:00 AM
        durationMinutes: 60,
      },
      {
        studentId: "2",
        dayOfWeek: 1,
        startMinute: 630, // 10:30 AM
        durationMinutes: 45,
      },
      {
        studentId: "3",
        dayOfWeek: 1,
        startMinute: 870, // 2:30 PM
        durationMinutes: 60,
      },
      // Tuesday assignments  
      {
        studentId: "4",
        dayOfWeek: 2,
        startMinute: 660, // 11:00 AM
        durationMinutes: 60,
      },
      {
        studentId: "5",
        dayOfWeek: 2,
        startMinute: 780, // 1:00 PM
        durationMinutes: 45,
      },
      // Wednesday assignments
      {
        studentId: "1",
        dayOfWeek: 3,
        startMinute: 600, // 10:00 AM
        durationMinutes: 60,
      },
      // Thursday assignments - with conflict
      {
        studentId: "2",
        dayOfWeek: 4,
        startMinute: 720, // 12:00 PM
        durationMinutes: 60,
      },
      {
        studentId: "3",
        dayOfWeek: 4,
        startMinute: 750, // 12:30 PM - CONFLICT with above!
        durationMinutes: 45,
      },
      // Friday assignments
      {
        studentId: "4",
        dayOfWeek: 5,
        startMinute: 540, // 9:00 AM
        durationMinutes: 45,
      },
      // Saturday assignment
      {
        studentId: "5",
        dayOfWeek: 6,
        startMinute: 660, // 11:00 AM
        durationMinutes: 60,
      },
    ],
    unscheduled: [], // No unscheduled students in this demo
    metadata: {
      totalStudents: 5,
      scheduledStudents: 5,
      averageUtilization: 75.5,
      computeTimeMs: 250,
    },
  };

  return {
    solution: scheduleSolution,
    teacherSchedule,
    students,
  };
};

const ScheduleDisplayDemo: React.FC = () => {
  const { solution, teacherSchedule, students } = createDemoData();

  const handleExportCalendar = () => {
    console.log("Calendar export triggered");
  };

  const handleConflictClick = (conflict: unknown[]) => {
    console.log("Conflict clicked:", conflict);
    alert(`Conflict detected between ${conflict.length} lessons. Check console for details.`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Schedule Display Demo</h1>
        <p className="text-gray-600">
          This demo shows the new TimeBlock-based schedule visualization component.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-medium text-blue-800">Demo Features:</p>
          <ul className="text-blue-700 mt-1 space-y-1">
            <li>• Week, Day, and List view modes</li>
            <li>• Conflict detection and highlighting (see Thursday at 12:00-12:30 PM)</li>
            <li>• Utilization metrics and statistics</li>
            <li>• Student color coding for easy identification</li>
            <li>• ICS calendar export functionality</li>
            <li>• Responsive design for mobile and desktop</li>
          </ul>
        </div>
      </div>

      <ScheduleDisplay
        solution={solution}
        teacherSchedule={teacherSchedule}
        students={students}
        teacherName="Demo Teacher"
        onExportCalendar={handleExportCalendar}
        onConflictClick={handleConflictClick}
      />

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
        <h3 className="font-semibold mb-2">Implementation Notes:</h3>
        <ul className="space-y-1 text-gray-700">
          <li>• Uses the new TimeBlock system with minute-level precision</li>
          <li>• Automatically detects scheduling conflicts</li>
          <li>• Calculates utilization metrics and schedule fragmentation</li>
          <li>• Supports timezone-aware calendar export</li>
          <li>• Fully responsive with mobile-optimized list view</li>
          <li>• Integrates with existing UI components (shadcn/ui)</li>
          <li>• Compatible with the new CSP solver output format</li>
        </ul>
      </div>
    </div>
  );
};

export default ScheduleDisplayDemo;