"use client";

import React, { useState } from 'react';
import { AdaptiveCalendar } from './AdaptiveCalendar';
import type { WeekSchedule, SchedulingConstraints } from 'lib/scheduling/types';
import { createEmptyWeekSchedule } from 'lib/scheduling/utils';

// Demo component to showcase the AdaptiveCalendar
export const AdaptiveCalendarDemo: React.FC = () => {
  const [schedule, setSchedule] = useState<WeekSchedule>(() => {
    const emptySchedule = createEmptyWeekSchedule();
    
    // Add some sample blocks for demonstration
    emptySchedule.days[1] = {
      dayOfWeek: 1,
      blocks: [
        { start: 540, duration: 60 }, // 9:00 AM - 10:00 AM Monday
        { start: 780, duration: 90 }, // 1:00 PM - 2:30 PM Monday
      ]
    };
    
    emptySchedule.days[3] = {
      dayOfWeek: 3,
      blocks: [
        { start: 600, duration: 120 }, // 10:00 AM - 12:00 PM Wednesday
      ]
    };
    
    return emptySchedule;
  });

  const constraints: SchedulingConstraints = {
    maxConsecutiveMinutes: 180, // 3 hours max consecutive
    breakDurationMinutes: 15,   // 15 minute breaks
    minLessonDuration: 30,      // 30 minutes minimum
    maxLessonDuration: 120,     // 2 hours maximum
    allowedDurations: [30, 45, 60, 90, 120]
  };

  const handleScheduleChange = (newSchedule: WeekSchedule) => {
    setSchedule(newSchedule);
    console.log('Schedule updated:', newSchedule);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Adaptive Calendar Demo</h1>
        <p className="text-gray-600">
          This demo shows the new minute-level precision scheduling component.
          Try clicking and dragging on the calendar, using the direct time input,
          or changing the granularity.
        </p>
      </div>
      
      <AdaptiveCalendar
        schedule={schedule}
        onChange={handleScheduleChange}
        constraints={constraints}
        granularity={30}
        minTime="07:00"
        maxTime="22:00"
        showWeekends={false}
        timezone="America/New_York"
      />
      
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Features Demonstrated:</h2>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>✅ Visual time grid with customizable granularity (5, 10, 15, 30, 60 min)</li>
          <li>✅ Click and drag to create time blocks</li>
          <li>✅ Direct time input with text fields</li>
          <li>✅ Multi-day selection capability</li>
          <li>✅ Visual feedback for validation errors</li>
          <li>✅ Responsive design and accessibility features</li>
          <li>✅ Comprehensive TypeScript typing</li>
          <li>✅ Real-time schedule updates and persistence</li>
          <li>✅ Constraint validation and error handling</li>
        </ul>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Current Schedule JSON:</h2>
        <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
          {JSON.stringify(schedule, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default AdaptiveCalendarDemo;