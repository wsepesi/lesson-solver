"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from 'lib/utils';
import type { 
  CalendarProps, 
  TimeBlock
} from 'lib/scheduling/types';
import { 
  timeStringToMinutes, 
  minutesToDisplayTime, 
  minutesToTimeString,
  getDayName,
  validateWeekScheduleDetailed,
  mergeTimeBlocks
} from 'lib/scheduling/utils';

// Custom hook for drag selection
function useDragSelection() {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number; minute: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; minute: number } | null>(null);

  const startDrag = useCallback((day: number, minute: number) => {
    // Snap to nearest 15 minutes
    const snappedMinute = Math.round(minute / 15) * 15;
    setIsDragging(true);
    setDragStart({ day, minute: snappedMinute });
    setDragEnd({ day, minute: snappedMinute });
  }, []);

  const updateDrag = useCallback((day: number, minute: number) => {
    if (isDragging && dragStart) {
      // Snap to nearest 15 minutes
      const snappedMinute = Math.round(minute / 15) * 15;
      setDragEnd({ day: dragStart.day, minute: snappedMinute }); // Keep same day during drag
    }
  }, [isDragging, dragStart]);

  const endDrag = useCallback(() => {
    setIsDragging(false);
    const selection = dragStart && dragEnd ? {
      day: dragStart.day,
      startMinute: Math.min(dragStart.minute, dragEnd.minute),
      duration: Math.max(15, Math.abs(dragEnd.minute - dragStart.minute)) // Minimum 15 minutes
    } : null;
    
    setDragStart(null);
    setDragEnd(null);
    
    return selection;
  }, [dragStart, dragEnd]);

  return {
    isDragging,
    dragStart,
    dragEnd,
    startDrag,
    updateDrag,
    endDrag
  };
}

// Time column component for continuous selection
interface TimeColumnProps {
  day: number;
  daySchedule: { blocks: TimeBlock[] };
  minTime: string;
  maxTime: string;
  onMouseDown: (day: number, minute: number) => void;
  onMouseMove: (day: number, minute: number) => void;
  onMouseUp: () => void;
  onBlockClick: (day: number, blockIndex: number, block: TimeBlock) => void;
  dragStart: { day: number; minute: number } | null;
  dragEnd: { day: number; minute: number } | null;
  isDragging: boolean;
  readOnly?: boolean;
}

const TimeColumn: React.FC<TimeColumnProps> = ({
  day,
  daySchedule,
  minTime,
  maxTime,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onBlockClick,
  dragStart,
  dragEnd,
  isDragging,
  readOnly = false
}) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const minMinutes = timeStringToMinutes(minTime);
  const maxMinutes = timeStringToMinutes(maxTime);
  const totalMinutes = maxMinutes - minMinutes;

  // Convert mouse Y position to minutes
  const getMinutesFromY = useCallback((y: number): number => {
    if (!columnRef.current) return 0;
    const rect = columnRef.current.getBoundingClientRect();
    const percentage = y / rect.height;
    const minute = minMinutes + (percentage * totalMinutes);
    return Math.max(minMinutes, Math.min(maxMinutes - 15, minute)); // Ensure at least 15 mins before max
  }, [minMinutes, maxMinutes, totalMinutes]);

  // Convert minutes to Y position percentage
  const getYPercentage = useCallback((minute: number): number => {
    return ((minute - minMinutes) / totalMinutes) * 100;
  }, [minMinutes, totalMinutes]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minute = getMinutesFromY(y);
    onMouseDown(day, minute);
  }, [readOnly, day, onMouseDown, getMinutesFromY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minute = getMinutesFromY(y);
    onMouseMove(day, minute);
  }, [day, onMouseMove, getMinutesFromY]);

  // Render existing time blocks
  const timeBlocks = daySchedule.blocks.map((block, index) => {
    const topPercentage = getYPercentage(block.start);
    const heightPercentage = (block.duration / totalMinutes) * 100;
    
    return (
      <div
        key={index}
        className={cn(
          "absolute left-0 right-0 bg-blue-200 border border-blue-400 rounded-sm opacity-80 cursor-pointer transition-colors",
          {
            "hover:bg-blue-300 hover:opacity-90": !readOnly,
            "cursor-not-allowed": readOnly
          }
        )}
        style={{
          top: `${topPercentage}%`,
          height: `${heightPercentage}%`
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!readOnly) {
            onBlockClick(day, index, block);
          }
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        title={`${minutesToDisplayTime(block.start)} - ${minutesToDisplayTime(block.start + block.duration)}`}
      />
    );
  });

  // Render drag preview
  const dragPreview = isDragging && dragStart && dragEnd && dragStart.day === day ? (
    <div
      className="absolute left-0 right-0 bg-blue-100 border border-blue-300 rounded-sm pointer-events-none"
      style={{
        top: `${getYPercentage(Math.min(dragStart.minute, dragEnd.minute))}%`,
        height: `${(Math.abs(dragEnd.minute - dragStart.minute) / totalMinutes) * 100}%`
      }}
    />
  ) : null;

  return (
    <div
      ref={columnRef}
      className={cn(
        "relative h-full border-r border-gray-200 cursor-pointer select-none",
        {
          "cursor-not-allowed opacity-50": readOnly,
          "hover:bg-gray-50": !readOnly
        }
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={onMouseUp}
      role="gridcell"
      aria-label={`${getDayName(day)} time column`}
    >
      {timeBlocks}
      {dragPreview}
    </div>
  );
};

// Time input component for direct entry
interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
}

const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, placeholder, error }) => {
  return (
    <div className="space-y-1">
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("w-full", {
          "border-red-300 focus:border-red-500": error
        })}
      />
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
};

// Main AdaptiveCalendar component
export const AdaptiveCalendar: React.FC<CalendarProps> = ({
  schedule,
  onChange,
  constraints: _constraints,
  granularity: _granularity = 15,
  minTime = '07:00',
  maxTime = '22:00',
  readOnly = false,
  showWeekends = false
}) => {
  const [directInputStart, setDirectInputStart] = useState('');
  const [directInputEnd, setDirectInputEnd] = useState('');
  const [selectedDay, setSelectedDay] = useState(1); // Default to Monday
  const [inputError, setInputError] = useState('');
  
  // State for time block editing (inline in sidebar)
  const [selectedBlock, setSelectedBlock] = useState<{
    day: number;
    blockIndex: number;
    block: TimeBlock;
  } | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editError, setEditError] = useState('');
  
  const { isDragging, dragStart, dragEnd, startDrag, updateDrag, endDrag } = useDragSelection();
  
  const displayDays = showWeekends ? 
    Array.from({ length: 7 }, (_, i) => i) : 
    Array.from({ length: 5 }, (_, i) => i + 1); // Mon-Fri

  // Generate hour markers for the time column
  const minMinutes = timeStringToMinutes(minTime);
  const maxMinutes = timeStringToMinutes(maxTime);
  const totalMinutes = maxMinutes - minMinutes;
  const hourMarkers: Array<{ minute: number; percentage: number }> = [];
  
  for (let minute = minMinutes; minute < maxMinutes; minute += 60) {
    const percentage = ((minute - minMinutes) / totalMinutes) * 100;
    hourMarkers.push({ minute, percentage });
  }

  // Handle mouse interactions
  const handleMouseDown = useCallback((day: number, minute: number) => {
    if (readOnly) return;
    startDrag(day, minute);
  }, [readOnly, startDrag]);

  const handleMouseMove = useCallback((day: number, minute: number) => {
    updateDrag(day, minute);
  }, [updateDrag]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    const selection = endDrag();
    if (!selection || selection.duration < 15) return; // Minimum 15 minutes

    // Apply the selection to the schedule
    const newSchedule = { ...schedule };
    const daySchedule = newSchedule.days[selection.day];
    
    if (daySchedule) {
      const newBlock: TimeBlock = {
        start: selection.startMinute,
        duration: selection.duration
      };
      
      // Add new block and merge (only creates blocks, never removes)
      daySchedule.blocks.push(newBlock);
      daySchedule.blocks = mergeTimeBlocks(daySchedule.blocks);
    }
    
    onChange(newSchedule);
  }, [isDragging, endDrag, schedule, onChange]);

  // Handle time block click for editing
  const handleBlockClick = useCallback((day: number, blockIndex: number, block: TimeBlock) => {
    if (readOnly) return;
    
    setSelectedBlock({ day, blockIndex, block });
    setEditStartTime(minutesToTimeString(block.start));
    setEditEndTime(minutesToTimeString(block.start + block.duration));
    setEditError('');
    // Clear the manual input fields when switching to edit mode
    setDirectInputStart('');
    setDirectInputEnd('');
    setInputError('');
  }, [readOnly]);

  // Handle block edit
  const handleBlockEdit = useCallback(() => {
    if (!selectedBlock) return;
    
    setEditError('');
    
    if (!editStartTime || !editEndTime) {
      setEditError('Please enter both start and end times');
      return;
    }
    
    try {
      const startMinutes = timeStringToMinutes(editStartTime);
      const endMinutes = timeStringToMinutes(editEndTime);
      
      if (endMinutes <= startMinutes) {
        setEditError('End time must be after start time');
        return;
      }
      
      if (startMinutes < minMinutes || endMinutes > maxMinutes) {
        setEditError(`Time must be between ${minTime} and ${maxTime}`);
        return;
      }
      
      const newSchedule = { ...schedule };
      const daySchedule = newSchedule.days[selectedBlock.day];
      
      if (daySchedule) {
        // Update the block
        daySchedule.blocks[selectedBlock.blockIndex] = {
          start: startMinutes,
          duration: endMinutes - startMinutes
        };
        
        // Re-merge blocks in case of overlaps
        daySchedule.blocks = mergeTimeBlocks(daySchedule.blocks);
        onChange(newSchedule);
      }
      
      setSelectedBlock(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Invalid time format');
    }
  }, [selectedBlock, editStartTime, editEndTime, minMinutes, maxMinutes, minTime, maxTime, schedule, onChange]);

  // Handle block delete
  const handleBlockDelete = useCallback(() => {
    if (!selectedBlock) return;
    
    const newSchedule = { ...schedule };
    const daySchedule = newSchedule.days[selectedBlock.day];
    
    if (daySchedule) {
      daySchedule.blocks.splice(selectedBlock.blockIndex, 1);
      onChange(newSchedule);
    }
    
    setSelectedBlock(null);
  }, [selectedBlock, schedule, onChange]);

  // Handle canceling edit
  const handleCancelEdit = useCallback(() => {
    setSelectedBlock(null);
    setEditStartTime('');
    setEditEndTime('');
    setEditError('');
  }, []);

  // Handle direct time input
  const handleDirectInput = useCallback(() => {
    setInputError('');
    
    if (!directInputStart || !directInputEnd) {
      setInputError('Please enter both start and end times');
      return;
    }
    
    try {
      const startMinutes = timeStringToMinutes(directInputStart);
      const endMinutes = timeStringToMinutes(directInputEnd);
      
      if (endMinutes <= startMinutes) {
        setInputError('End time must be after start time');
        return;
      }
      
      const newBlock: TimeBlock = {
        start: startMinutes,
        duration: endMinutes - startMinutes
      };
      
      const newSchedule = { ...schedule };
      const daySchedule = newSchedule.days[selectedDay];
      
      if (daySchedule) {
        daySchedule.blocks.push(newBlock);
        daySchedule.blocks = mergeTimeBlocks(daySchedule.blocks);
        onChange(newSchedule);
        
        // Clear inputs
        setDirectInputStart('');
        setDirectInputEnd('');
      }
    } catch (error) {
      setInputError(error instanceof Error ? error.message : 'Invalid time format');
    }
  }, [directInputStart, directInputEnd, selectedDay, schedule, onChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (readOnly) return;
      
      switch (event.key) {
        case 'Escape':
          // Clear selection
          if (isDragging) {
            endDrag();
          }
          break;
        case 'Delete':
        case 'Backspace':
          // Clear selected blocks for current day
          if (event.ctrlKey || event.metaKey) {
            const newSchedule = { ...schedule };
            newSchedule.days[selectedDay] = { 
              ...newSchedule.days[selectedDay]!, 
              blocks: [] 
            };
            onChange(newSchedule);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, isDragging, endDrag, schedule, selectedDay, onChange]);

  // Validation
  const validation = validateWeekScheduleDetailed(schedule);

  return (
    <div className="h-full flex">
      {/* Sidebar for direct entry or editing */}
      <div className="w-64 px-3 border-r bg-gray-50 space-y-3 pt-3">
        {selectedBlock ? (
          // Edit mode
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Edit Time Block</h3>
              <p className="text-xs text-gray-600">
                {getDayName(selectedBlock.day)} - Adjust exact times
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Start Time</Label>
                <TimeInput
                  value={editStartTime}
                  onChange={setEditStartTime}
                  placeholder="09:00"
                  error={editError}
                />
              </div>
              
              <div className="space-y-1">
                <Label>End Time</Label>
                <TimeInput
                  value={editEndTime}
                  onChange={setEditEndTime}
                  placeholder="10:00"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleBlockEdit} disabled={readOnly} className="flex-1" size="sm">
                  Update
                </Button>
                <Button onClick={handleBlockDelete} variant="destructive" disabled={readOnly} className="flex-1" size="sm">
                  Delete
                </Button>
              </div>
              
              <Button onClick={handleCancelEdit} variant="outline" disabled={readOnly} className="w-full" size="sm">
                Cancel
              </Button>
            </div>
            
            {editError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{editError}</div>
            )}
          </div>
        ) : (
          // Add mode
          <div className="space-y-4">
            <h3 className="font-medium">Add Time Block</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Day</Label>
                <Select
                  value={selectedDay.toString()}
                  onValueChange={(value) => setSelectedDay(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {displayDays.map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {getDayName(day)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label>Start Time</Label>
                <TimeInput
                  value={directInputStart}
                  onChange={setDirectInputStart}
                  placeholder="09:00"
                  error={inputError}
                />
              </div>
              
              <div className="space-y-1">
                <Label>End Time</Label>
                <TimeInput
                  value={directInputEnd}
                  onChange={setDirectInputEnd}
                  placeholder="10:00"
                />
              </div>
              
              <Button onClick={handleDirectInput} disabled={readOnly} className="w-full">
                Add Time Block
              </Button>
            </div>
            {inputError && (
              <div className="text-sm text-red-600">{inputError}</div>
            )}
          </div>
        )}

        {/* Weekly Summary */}
        <div className="space-y-2">
          <h3 className="font-medium">Weekly Summary</h3>
          <div className="space-y-1">
            {displayDays.map(day => {
              const daySchedule = schedule.days[day];
              const totalMinutes = daySchedule?.blocks.reduce((sum, block) => sum + block.duration, 0) ?? 0;
              return (
                <div key={day} className="flex justify-between text-sm">
                  <span>{getDayName(day).slice(0, 3)}</span>
                  <span className="text-gray-600">
                    {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation Errors */}
        {!validation.isValid && (
          <div className="space-y-2">
            <h3 className="font-medium text-red-600">Issues</h3>
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {error.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main calendar */}
      <div className="flex-1 p-2 space-y-3">
        <div className="text-sm text-gray-600">
          Click and drag to select time blocks.
        </div>
        
        <div className="border rounded-lg h-[calc(100%-2rem)] flex flex-col">
          {/* Header */}
          <div className="flex bg-gray-50 border-b">
            <div className="w-20 p-3 text-sm font-medium border-r">Time</div>
            {displayDays.map(day => (
              <div key={day} className="flex-1 p-3 text-sm font-medium text-center border-r last:border-r-0">
                {getDayName(day)}
              </div>
            ))}
          </div>
          
          {/* Calendar content */}
          <div className="flex-1 flex relative min-h-0">
            {/* Time labels column */}
            <div className="w-20 border-r bg-gray-50 relative">
              {hourMarkers.map(({ minute, percentage }) => (
                <div
                  key={minute}
                  className="absolute text-xs text-gray-600 pr-2 text-right w-full"
                  style={{ top: `${percentage}%`, transform: 'translateY(-50%)' }}
                >
                  {minutesToDisplayTime(minute)}
                </div>
              ))}
            </div>
            
            {/* Day columns */}
            <div className="flex-1 flex">
              {displayDays.map(day => {
                const daySchedule = schedule.days[day] ?? { blocks: [] };
                return (
                  <div key={day} className="flex-1 relative">
                    {/* Hour lines */}
                    {hourMarkers.map(({ percentage }, index) => (
                      <div
                        key={index}
                        className="absolute left-0 right-0 border-t border-gray-100"
                        style={{ top: `${percentage}%` }}
                      />
                    ))}
                    
                    <TimeColumn
                      day={day}
                      daySchedule={daySchedule}
                      minTime={minTime}
                      maxTime={maxTime}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onBlockClick={handleBlockClick}
                      dragStart={dragStart}
                      dragEnd={dragEnd}
                      isDragging={isDragging}
                      readOnly={readOnly}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdaptiveCalendar;