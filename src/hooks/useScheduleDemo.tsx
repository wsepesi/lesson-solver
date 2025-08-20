"use client";

/**
 * Demo component showing how to use the useSchedule hook
 * This is a simple example for testing and documentation purposes
 */

import React from 'react';
import { useSchedule } from './useSchedule';
import { cloneWeekSchedule, formatDuration, blockToTimeRange, createEmptyWeekSchedule } from '../../lib/scheduling/utils';

interface ScheduleDemoProps {
  ownerId: string;
}

export function ScheduleDemo({ ownerId }: ScheduleDemoProps) {
  const { 
    schedule, 
    updateSchedule, 
    loading, 
    saving, 
    error,
    hasUnsavedChanges,
    saveImmediately,
    resetToSaved,
    clearError
  } = useSchedule(ownerId);

  // Handle adding a test time block
  const handleAddTimeBlock = () => {
    if (!schedule) return;
    
    updateSchedule(prev => {
      if (!prev) return createEmptyWeekSchedule();
      const newSchedule = cloneWeekSchedule(prev);
      
      // Add a 1-hour block on Monday from 9:00-10:00 AM
      newSchedule.days[1]!.blocks.push({
        start: 540, // 9:00 AM in minutes from midnight
        duration: 60 // 1 hour
      });
      
      return newSchedule;
    });
  };

  // Handle clearing all time blocks for a day
  const handleClearDay = (dayIndex: number) => {
    if (!schedule) return;
    
    updateSchedule(prev => {
      if (!prev) return createEmptyWeekSchedule();
      const newSchedule = cloneWeekSchedule(prev);
      const day = newSchedule.days[dayIndex];
      if (day) {
        day.blocks = [];
      }
      return newSchedule;
    });
  };

  if (loading) {
    return (
      <div className="p-4 border rounded-md">
        <div className="animate-pulse">Loading schedule...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 rounded-md bg-red-50">
        <div className="text-red-800 font-semibold">Error: {error.message}</div>
        <div className="text-red-600 text-sm mt-1">Type: {error.type}</div>
        <button 
          onClick={clearError}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Clear Error
        </button>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="p-4 border rounded-md">
        <div>No schedule available</div>
      </div>
    );
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="p-4 border rounded-md space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Schedule Demo</h3>
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <span className="text-sm text-yellow-600">
              {saving ? 'Saving...' : 'Unsaved changes'}
            </span>
          )}
          {saving && (
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          )}
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex space-x-2">
        <button 
          onClick={handleAddTimeBlock}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Add Monday 9-10 AM
        </button>
        <button 
          onClick={() => {
            void saveImmediately().catch(console.error);
          }}
          disabled={!hasUnsavedChanges || saving}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
        >
          Save Now
        </button>
        <button 
          onClick={resetToSaved}
          disabled={!hasUnsavedChanges}
          className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:bg-gray-400"
        >
          Reset Changes
        </button>
      </div>

      {/* Schedule display */}
      <div className="space-y-2">
        <h4 className="font-medium">Current Schedule:</h4>
        <div className="text-sm text-gray-600">
          Timezone: {schedule.timezone}
        </div>
        
        {schedule.days.map((day, index) => (
          <div key={index} className="border-l-4 border-blue-200 pl-3 py-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{dayNames[day.dayOfWeek]}</div>
                {day.blocks.length === 0 ? (
                  <div className="text-gray-500 text-sm">No availability</div>
                ) : (
                  <div className="space-y-1">
                    {day.blocks.map((block, blockIndex) => {
                      const [start, end] = blockToTimeRange(block);
                      const duration = formatDuration(block.duration);
                      return (
                        <div key={blockIndex} className="text-sm">
                          {start} - {end} ({duration})
                        </div>
                      );
                    })}
                    <div className="text-xs text-gray-500">
                      Total: {formatDuration(day.blocks.reduce((sum, block) => sum + block.duration, 0))}
                    </div>
                  </div>
                )}
              </div>
              
              {day.blocks.length > 0 && (
                <button
                  onClick={() => handleClearDay(index)}
                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Schedule metadata */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Owner ID: {ownerId}</div>
        <div>
          Total available time: {formatDuration(
            schedule.days.reduce((total, day) => 
              total + day.blocks.reduce((dayTotal, block) => dayTotal + block.duration, 0), 0
            )
          )}
        </div>
      </div>
    </div>
  );
}