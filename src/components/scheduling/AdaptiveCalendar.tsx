"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from 'lib/utils';
import type { 
  CalendarProps, 
  TimeBlock,
  WeekSchedule
} from 'lib/scheduling/types';
import { 
  timeStringToMinutes, 
  minutesToDisplayTime, 
  minutesToTimeString,
  getDayName,
  validateWeekScheduleDetailed,
  mergeTimeBlocks
} from 'lib/scheduling/utils';

// Helper function to calculate valid drop zones for a lesson (merged blocks for visual hints)
function getValidDropZones(
  dayIndex: number,
  lessonDuration: number,
  studentId: string,
  teacherAvailability?: WeekSchedule,
  studentAvailabilities?: Map<string, WeekSchedule>
): TimeBlock[] {
  if (!teacherAvailability || !studentAvailabilities) return [];
  
  const teacherDay = teacherAvailability.days[dayIndex];
  const studentSchedule = studentAvailabilities.get(studentId);
  const studentDay = studentSchedule?.days[dayIndex];
  
  if (!teacherDay || !studentDay) return [];
  
  const validZones: TimeBlock[] = [];
  
  // Find intersections of teacher and student availability
  for (const teacherBlock of teacherDay.blocks) {
    for (const studentBlock of studentDay.blocks) {
      // Calculate overlap between teacher and student blocks
      const overlapStart = Math.max(teacherBlock.start, studentBlock.start);
      const overlapEnd = Math.min(
        teacherBlock.start + teacherBlock.duration,
        studentBlock.start + studentBlock.duration
      );
      
      if (overlapEnd > overlapStart && (overlapEnd - overlapStart) >= lessonDuration) {
        // Create time slots within this overlap where lesson can be placed
        for (let start = overlapStart; start <= overlapEnd - lessonDuration; start += 15) {
          validZones.push({
            start,
            duration: lessonDuration
          });
        }
      }
    }
  }
  
  // Merge overlapping zones and remove duplicates
  return mergeTimeBlocks(validZones);
}

// Helper function to get individual valid drop positions for smart snapping
function getValidDropPositions(
  dayIndex: number,
  lessonDuration: number,
  studentId: string,
  teacherAvailability?: WeekSchedule,
  studentAvailabilities?: Map<string, WeekSchedule>
): number[] {
  if (!teacherAvailability || !studentAvailabilities) return [];
  
  const teacherDay = teacherAvailability.days[dayIndex];
  const studentSchedule = studentAvailabilities.get(studentId);
  const studentDay = studentSchedule?.days[dayIndex];
  
  if (!teacherDay || !studentDay) return [];
  
  const validPositions: number[] = [];
  
  // Find intersections of teacher and student availability
  for (const teacherBlock of teacherDay.blocks) {
    for (const studentBlock of studentDay.blocks) {
      // Calculate overlap between teacher and student blocks
      const overlapStart = Math.max(teacherBlock.start, studentBlock.start);
      const overlapEnd = Math.min(
        teacherBlock.start + teacherBlock.duration,
        studentBlock.start + studentBlock.duration
      );
      
      if (overlapEnd > overlapStart && (overlapEnd - overlapStart) >= lessonDuration) {
        // Create time slots within this overlap where lesson can be placed
        for (let start = overlapStart; start <= overlapEnd - lessonDuration; start += 15) {
          validPositions.push(start);
        }
      }
    }
  }
  
  // Remove duplicates and sort
  return [...new Set(validPositions)].sort((a, b) => a - b);
}

// Helper function to check if a specific time slot is valid
function isValidDropZone(
  dayIndex: number,
  startMinute: number,
  duration: number,
  studentId: string,
  teacherAvailability?: WeekSchedule,
  studentAvailabilities?: Map<string, WeekSchedule>
): boolean {
  const validZones = getValidDropZones(dayIndex, duration, studentId, teacherAvailability, studentAvailabilities);
  return validZones.some(zone => 
    startMinute >= zone.start && 
    (startMinute + duration) <= (zone.start + zone.duration)
  );
}

// Helper function to check if a block would overlap with existing blocks
function wouldOverlapExistingBlocks(
  daySchedule: { blocks: TimeBlock[] },
  newBlock: TimeBlock,
  excludeBlockIndex?: number
): boolean {
  const newStart = newBlock.start;
  const newEnd = newBlock.start + newBlock.duration;
  
  for (let i = 0; i < daySchedule.blocks.length; i++) {
    // Skip the block we're moving (when dragging)
    if (excludeBlockIndex !== undefined && i === excludeBlockIndex) {
      continue;
    }
    
    const existing = daySchedule.blocks[i];
    if (!existing) continue;
    
    const existingStart = existing.start;
    const existingEnd = existing.start + existing.duration;
    
    // Check for overlap: blocks overlap if one starts before the other ends
    if (newStart < existingEnd && newEnd > existingStart) {
      return true;
    }
  }
  
  return false;
}

// Custom hook for drag selection
function useDragSelection(snapMode: SnapMode) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number; minute: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; minute: number } | null>(null);

  const applyCreationSnapping = useCallback((minute: number): number => {
    switch (snapMode) {
      case 'grid':
        // Snap to nearest 15 minutes
        return Math.round(minute / 15) * 15;
      case 'precise':
        // No snapping: return exact minute
        return Math.round(minute);
      default:
        return Math.round(minute / 15) * 15;
    }
  }, [snapMode]);

  const startDrag = useCallback((day: number, minute: number) => {
    const snappedMinute = applyCreationSnapping(minute);
    setIsDragging(true);
    setDragStart({ day, minute: snappedMinute });
    setDragEnd({ day, minute: snappedMinute });
  }, [applyCreationSnapping]);

  const updateDrag = useCallback((day: number, minute: number) => {
    if (isDragging && dragStart) {
      const snappedMinute = applyCreationSnapping(minute);
      setDragEnd({ day: dragStart.day, minute: snappedMinute }); // Keep same day during drag
    }
  }, [isDragging, dragStart, applyCreationSnapping]);

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
  totalHours: number;
  onMouseDown: (day: number, minute: number) => void;
  onMouseMove: (day: number, minute: number) => void;
  onMouseUp: () => void;
  onBlockClick: (day: number, blockIndex: number, block: TimeBlock) => void;
  onBlockDragStart?: (day: number, blockIndex: number, block: TimeBlock, offsetY: number) => void;
  onBlockDrag?: (day: number, minute: number) => void;
  onBlockDragEnd?: () => void;
  draggedBlock?: { originalDay: number; currentDay: number; blockIndex: number; block: TimeBlock; offsetY: number } | null;
  dragStart: { day: number; minute: number } | null;
  dragEnd: { day: number; minute: number } | null;
  isDragging: boolean;
  mode?: 'edit' | 'rearrange';
  // Props for availability hints
  validDropZones?: TimeBlock[];
  teacherAvailability?: WeekSchedule;
  studentAvailabilities?: Map<string, WeekSchedule>;
  // Display student names on time blocks
  showStudentNames?: boolean;
  // Snap mode for visual indicators
  snapMode?: SnapMode;
}

const TimeColumn: React.FC<TimeColumnProps> = ({
  day,
  daySchedule,
  minTime,
  maxTime,
  totalHours,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onBlockClick,
  onBlockDragStart,
  onBlockDrag,
  onBlockDragEnd,
  draggedBlock,
  dragStart,
  dragEnd,
  isDragging,
  mode = 'edit',
  validDropZones = [],
  teacherAvailability: _teacherAvailability,
  studentAvailabilities: _studentAvailabilities,
  showStudentNames = false,
  snapMode = 'grid'
}) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const minMinutes = timeStringToMinutes(minTime);
  const maxMinutes = timeStringToMinutes(maxTime);

  // Convert mouse Y position to minutes (53px per hour)
  const getMinutesFromY = useCallback((y: number): number => {
    if (!columnRef.current) return 0;
    const hours = y / 53; // 53px per hour
    const minute = minMinutes + (hours * 60);
    return Math.max(minMinutes, Math.min(maxMinutes - 15, minute)); // Ensure at least 15 mins before max
  }, [minMinutes, maxMinutes]);

  // Convert minutes to Y position pixels (53px per hour)
  const getYPixels = useCallback((minute: number): number => {
    return ((minute - minMinutes) / 60) * 53; // 53px per hour
  }, [minMinutes]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'rearrange') return; // Prevent drag-to-create in rearrange mode
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minute = getMinutesFromY(y);
    onMouseDown(day, minute);
  }, [mode, day, onMouseDown, getMinutesFromY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minute = getMinutesFromY(y);
    
    // Handle block dragging in rearrange mode
    if (draggedBlock && onBlockDrag) {
      onBlockDrag(day, minute);
    } else {
      onMouseMove(day, minute);
    }
  }, [day, onMouseMove, onBlockDrag, draggedBlock, getMinutesFromY]);

  // Render existing time blocks
  const timeBlocks = daySchedule.blocks.map((block, index) => {
    const topPixels = getYPixels(block.start);
    const heightPixels = (block.duration / 60) * 53; // 53px per hour
    
    // Hide the block if it's currently being dragged
    const isBeingDragged = draggedBlock && 
      draggedBlock.originalDay === day && 
      draggedBlock.blockIndex === index;
    
    if (isBeingDragged) {
      return null; // Don't render the original block while dragging
    }
    
    return (
      <div
        key={index}
        className={cn(
          "absolute left-0 right-0 bg-blue-200 border border-blue-400 rounded-sm opacity-80 cursor-pointer transition-colors flex items-center justify-center",
          {
            "hover:bg-blue-300 hover:opacity-90": mode === 'edit',
            "cursor-move hover:bg-blue-300 hover:opacity-90": mode === 'rearrange'
          }
        )}
        style={{
          top: `${topPixels}px`,
          height: `${heightPixels}px`
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (mode === 'edit') {
            onBlockClick(day, index, block);
          }
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (mode === 'rearrange' && onBlockDragStart) {
            const rect = e.currentTarget.getBoundingClientRect();
            const offsetY = e.clientY - rect.top;
            onBlockDragStart(day, index, block, offsetY);
          }
        }}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        title={`${minutesToDisplayTime(block.start)} - ${minutesToDisplayTime(block.start + block.duration)}`}
      >
        {showStudentNames && block.metadata?.studentName && (
          <span className="text-xs font-medium text-blue-800 px-1 text-center leading-tight truncate">
            {block.metadata.studentName}
          </span>
        )}
      </div>
    );
  });

  // Render drag preview for new block creation
  const dragPreview = isDragging && dragStart && dragEnd && dragStart.day === day ? (
    <div
      className="absolute left-0 right-0 bg-blue-100 border border-blue-300 rounded-sm pointer-events-none"
      style={{
        top: `${getYPixels(Math.min(dragStart.minute, dragEnd.minute))}px`,
        height: `${(Math.abs(dragEnd.minute - dragStart.minute) / 60) * 53}px`
      }}
    />
  ) : null;

  // Render drag preview for block repositioning
  const blockDragPreview = draggedBlock && draggedBlock.currentDay === day ? (
    <div
      className="absolute left-0 right-0 bg-green-200 border border-green-400 rounded-sm pointer-events-none opacity-80"
      style={{
        top: `${getYPixels(draggedBlock.block.start)}px`,
        height: `${(draggedBlock.block.duration / 60) * 53}px`
      }}
    />
  ) : null;

  // Render availability hints when dragging in rearrange mode
  const availabilityHints = mode === 'rearrange' && draggedBlock && validDropZones.length > 0 ? (
    validDropZones.map((zone, index) => (
      <div
        key={index}
        className="absolute left-0 right-0 bg-gray-200 border border-gray-300 rounded-sm pointer-events-none opacity-40"
        style={{
          top: `${getYPixels(zone.start)}px`,
          height: `${(zone.duration / 60) * 53}px`
        }}
      />
    ))
  ) : null;

  // Generate visual grid indicators based on snap mode
  const snapIndicators = useMemo(() => {
    if (snapMode === 'precise') {
      // Show 5-minute marks for precise mode
      const indicators = [];
      for (let minute = minMinutes; minute < maxMinutes; minute += 5) {
        indicators.push(
          <div
            key={minute}
            className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
            style={{
              top: `${getYPixels(minute)}px`,
            }}
          />
        );
      }
      return indicators;
    } else if (snapMode === 'smart' && draggedBlock && validDropZones.length > 0) {
      // Show available time slot markers for smart mode
      return validDropZones.map((zone, index) => (
        <div
          key={`smart-${index}`}
          className="absolute left-0 w-1 bg-green-400 pointer-events-none opacity-60"
          style={{
            top: `${getYPixels(zone.start)}px`,
            height: `${(zone.duration / 60) * 53}px`,
          }}
        />
      ));
    }
    return null;
  }, [snapMode, minMinutes, maxMinutes, getYPixels, draggedBlock, validDropZones]);

  return (
    <div
      ref={columnRef}
      className={cn(
        "relative border-r border-gray-200 cursor-pointer select-none",
        {
          "hover:bg-gray-50": mode === 'edit'
        }
      )}
      style={{ height: `${totalHours * 53}px` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => {
        if (draggedBlock && onBlockDragEnd) {
          onBlockDragEnd();
        } else {
          onMouseUp();
        }
      }}
      role="gridcell"
      aria-label={`${getDayName(day)} time column`}
    >
      {snapIndicators}
      {timeBlocks.filter(block => block !== null)}
      {availabilityHints}
      {dragPreview}
      {blockDragPreview}
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

// Snap mode types for drag operations
type SnapMode = 'grid' | 'precise' | 'smart';

// Main AdaptiveCalendar component
export const AdaptiveCalendar: React.FC<CalendarProps> = ({
  schedule,
  onChange,
  constraints: _constraints,
  granularity: _granularity = 15,
  minTime = '00:00',
  maxTime = '23:59',
  readOnly = false,
  mode = readOnly ? 'rearrange' : 'edit',
  showWeekends = false,
  teacherAvailability,
  studentAvailabilities,
  showStudentNames = false,
  onStudentDrop,
  draggedStudent
}) => {
  const [directInputStart, setDirectInputStart] = useState('');
  const [directInputEnd, setDirectInputEnd] = useState('');
  const [selectedDay, setSelectedDay] = useState(1); // Default to Monday
  const [snapMode, setSnapMode] = useState<SnapMode>('smart');
  const [inputError, setInputError] = useState('');
  
  // State for time block editing (inline in sidebar)
  const [selectedBlock, setSelectedBlock] = useState<{
    day: number;
    blockIndex: number;
    block: TimeBlock;
  } | null>(null);
  
  // State for block dragging in rearrange mode
  const [draggedBlock, setDraggedBlock] = useState<{
    originalDay: number;
    currentDay: number;
    blockIndex: number;
    block: TimeBlock;
    offsetY: number;
  } | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editError, setEditError] = useState('');
  
  // State for valid drop zones (per day) during dragging
  const [validDropZonesByDay, setValidDropZonesByDay] = useState<Map<number, TimeBlock[]>>(new Map());
  
  // Refs for auto-scroll functionality
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  
  const { isDragging, dragStart, dragEnd, startDrag, updateDrag, endDrag } = useDragSelection(snapMode);
  
  const displayDays = useMemo(() => showWeekends ? 
    Array.from({ length: 7 }, (_, i) => i) : 
    Array.from({ length: 5 }, (_, i) => i + 1), [showWeekends]); // Mon-Fri

  // Generate hour markers for the time column (every hour for 24-hour display)
  const minMinutes = timeStringToMinutes(minTime);
  const maxMinutes = timeStringToMinutes(maxTime);
  const totalMinutes = maxMinutes - minMinutes;
  const totalHours = Math.ceil(totalMinutes / 60);
  const calendarHeight = totalHours * 53; // 53px per hour (2/3 of original 80px)
  const hourMarkers: Array<{ minute: number }> = [];
  
  for (let minute = minMinutes; minute <= maxMinutes; minute += 60) {
    hourMarkers.push({ minute });
  }

  // Convert minutes to Y position pixels (53px per hour) - for main calendar
  const getYPixels = useCallback((minute: number): number => {
    return ((minute - minMinutes) / 60) * 53; // 53px per hour
  }, [minMinutes]);

  // Handle mouse interactions
  const handleMouseDown = useCallback((day: number, minute: number) => {
    if (mode === 'rearrange') return; // Prevent drag-to-create in rearrange mode
    startDrag(day, minute);
  }, [mode, startDrag]);

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
    if (mode !== 'edit') return; // Only allow editing in edit mode
    
    setSelectedBlock({ day, blockIndex, block });
    setEditStartTime(minutesToTimeString(block.start));
    setEditEndTime(minutesToTimeString(block.start + block.duration));
    setEditError('');
    // Clear the manual input fields when switching to edit mode
    setDirectInputStart('');
    setDirectInputEnd('');
    setInputError('');
  }, [mode]);

  // Handle block drag start (rearrange mode)
  const handleBlockDragStart = useCallback((day: number, blockIndex: number, block: TimeBlock, offsetY: number) => {
    setDraggedBlock({ originalDay: day, currentDay: day, blockIndex, block, offsetY });
    
    // Calculate valid drop zones for this lesson if availability data is provided
    if (mode === 'rearrange' && teacherAvailability && studentAvailabilities && block.metadata?.studentId) {
      const studentId = block.metadata.studentId.toString();
      const lessonDuration = block.duration;
      const validZonesMap = new Map<number, TimeBlock[]>();
      
      // Calculate valid zones for each day
      displayDays.forEach(dayIndex => {
        const validZones = getValidDropZones(
          dayIndex,
          lessonDuration,
          studentId,
          teacherAvailability,
          studentAvailabilities
        );
        if (validZones.length > 0) {
          validZonesMap.set(dayIndex, validZones);
        }
      });
      
      setValidDropZonesByDay(validZonesMap);
    }
  }, [mode, teacherAvailability, studentAvailabilities, displayDays]);

  // Helper function to apply snapping based on current snap mode
  const applySnapping = useCallback((targetStart: number, day: number): number => {
    switch (snapMode) {
      case 'grid':
        // Original behavior: snap to 15-minute intervals
        return Math.round(targetStart / 15) * 15;
        
      case 'precise':
        // No snapping: return exact minute
        return Math.round(targetStart);
        
      case 'smart':
        // Snap to nearest valid drop position if available
        if (draggedBlock && teacherAvailability && studentAvailabilities && draggedBlock.block.metadata?.studentId) {
          const studentId = draggedBlock.block.metadata.studentId.toString();
          const validPositions = getValidDropPositions(
            day,
            draggedBlock.block.duration,
            studentId,
            teacherAvailability,
            studentAvailabilities
          );
          
          if (validPositions.length > 0) {
            // Find the closest valid position
            const closestPosition = validPositions.reduce((closest, position) => {
              const currentDistance = Math.abs(position - targetStart);
              const closestDistance = Math.abs(closest - targetStart);
              return currentDistance < closestDistance ? position : closest;
            });
            return closestPosition;
          }
        }
        // Fallback to grid snapping if no valid positions
        return Math.round(targetStart / 15) * 15;
        
      default:
        return Math.round(targetStart / 15) * 15;
    }
  }, [snapMode, draggedBlock, teacherAvailability, studentAvailabilities]);

  // Handle block drag (rearrange mode)
  const handleBlockDrag = useCallback((day: number, minute: number) => {
    if (!draggedBlock) return;
    
    // Calculate new start time based on mouse position minus offset
    const newStart = Math.max(0, Math.min(1439 - draggedBlock.block.duration, minute));
    
    // Apply snapping based on current snap mode
    const snappedStart = applySnapping(newStart, day);
    
    // Update the dragged block position
    setDraggedBlock(prev => prev ? {
      ...prev,
      currentDay: day, // Allow cross-day dragging
      block: {
        ...prev.block,
        start: snappedStart
      }
    } : null);
  }, [draggedBlock, applySnapping]);

  // Handle block drag end (rearrange mode)
  const handleBlockDragEnd = useCallback(() => {
    if (!draggedBlock) return;
    
    // Check if the drop is valid when availability data is provided
    const isValidAvailability = mode === 'rearrange' && teacherAvailability && studentAvailabilities && draggedBlock.block.metadata?.studentId
      ? isValidDropZone(
          draggedBlock.currentDay,
          draggedBlock.block.start,
          draggedBlock.block.duration,
          draggedBlock.block.metadata.studentId.toString(),
          teacherAvailability,
          studentAvailabilities
        )
      : true; // Allow move if no availability data (backward compatibility)
    
    // Check if the new position would overlap with existing lessons
    const targetDaySchedule = schedule.days[draggedBlock.currentDay];
    const excludeIndex = draggedBlock.originalDay === draggedBlock.currentDay ? draggedBlock.blockIndex : undefined;
    const wouldOverlap = targetDaySchedule ? wouldOverlapExistingBlocks(
      targetDaySchedule,
      draggedBlock.block,
      excludeIndex
    ) : false;
    
    const isValidDrop = isValidAvailability && !wouldOverlap;
    
    if (isValidDrop) {
      // Valid drop - perform the move
      const newSchedule = { ...schedule };
      
      // Get original day schedule where block started
      const originalDay = draggedBlock.originalDay;
      const targetDay = draggedBlock.currentDay;
      
      const originalDaySchedule = newSchedule.days[originalDay];
      const targetDaySchedule = newSchedule.days[targetDay];
      
      if (originalDaySchedule && targetDaySchedule) {
        // Remove block from original position (using the original block index)
        originalDaySchedule.blocks.splice(draggedBlock.blockIndex, 1);
        
        // Add block to new position with updated start time, preserving metadata
        targetDaySchedule.blocks.push({
          start: draggedBlock.block.start,
          duration: draggedBlock.block.duration,
          metadata: draggedBlock.block.metadata // Preserve metadata during move
        });
        
        // Re-sort blocks in target day (don't merge - each block is a separate lesson)
        targetDaySchedule.blocks.sort((a, b) => a.start - b.start);
        
        // If it was a cross-day move, also clean up the original day (don't merge)
        if (originalDay !== targetDay) {
          originalDaySchedule.blocks.sort((a, b) => a.start - b.start);
        }
        
        onChange(newSchedule);
      }
    }
    // If invalid drop, the block will just return to its original position (no action needed)
    
    // Clear drag state and valid zones
    setDraggedBlock(null);
    setValidDropZonesByDay(new Map());
  }, [draggedBlock, schedule, onChange, mode, teacherAvailability, studentAvailabilities]);

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
      if (mode !== 'edit') return;
      
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
  }, [mode, isDragging, endDrag, schedule, selectedDay, onChange]);

  // Auto-scroll to 9am when calendar becomes visible using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // When calendar becomes visible and we haven't scrolled yet
          if (entry.isIntersecting && !hasScrolledRef.current) {
            const targetMinutes = 540; // 9 * 60 = 9:00am
            const scrollPosition = ((targetMinutes - minMinutes) / 60) * 53 - 100; // 53px per hour, smaller offset
            (entry.target as HTMLDivElement).scrollTop = Math.max(0, scrollPosition);
            hasScrolledRef.current = true;
          }
        });
      },
      { threshold: 0.1 } // Trigger when 10% of calendar is visible
    );

    if (scrollContainerRef.current) {
      observer.observe(scrollContainerRef.current);
    }

    return () => observer.disconnect();
  }, [minMinutes]);

  // Reset scroll flag when schedule changes (e.g., dialog reopens)
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [schedule]);

  // Calculate valid drop zones when a student is being dragged
  useEffect(() => {
    if (draggedStudent) {
      const validZones = new Map<number, TimeBlock[]>();
      displayDays.forEach(day => {
        const zones = getValidDropZones(day, draggedStudent.lessonDuration, draggedStudent.studentId, teacherAvailability, studentAvailabilities);
        validZones.set(day, zones);
      });
      setValidDropZonesByDay(validZones);
    } else {
      setValidDropZonesByDay(new Map());
    }
  }, [draggedStudent, displayDays, teacherAvailability, studentAvailabilities]);

  // Validation
  const validation = validateWeekScheduleDetailed(schedule);

  return (
    <div className="flex" id="adaptive-calendar">
      {/* Sidebar for direct entry and editing - edit mode only */}
      {mode === 'edit' && (
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
                <Button onClick={handleBlockEdit} disabled={mode !== 'edit'} className="flex-1" size="sm">
                  Update
                </Button>
                <Button onClick={handleBlockDelete} variant="destructive" disabled={mode !== 'edit'} className="flex-1" size="sm">
                  Delete
                </Button>
              </div>
              
              <Button onClick={handleCancelEdit} variant="outline" disabled={mode !== 'edit'} className="w-full" size="sm">
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
              
              <Button onClick={handleDirectInput} disabled={mode !== 'edit'} className="w-full">
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
      )}

      {/* Main calendar */}
      <div className="flex-1 p-2 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {mode === 'edit' ? (
              <>
                <span className="font-bold text-landing-blue">Click</span> and <span className="font-bold text-landing-blue">drag</span> to select time blocks.
              </>
            ) : (
              <>
                <span className="font-bold text-landing-blue">Drag</span> lessons to reschedule them.
              </>
            )}
          </span>
          {mode === 'rearrange' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Snap:</label>
              <Select value={snapMode} onValueChange={(value: SnapMode) => setSnapMode(value)}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">15min grid</SelectItem>
                  <SelectItem value="precise">Precise</SelectItem>
                  <SelectItem value="smart">Smart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <div className="border rounded-lg h-[calc(100%-3rem)] flex flex-col">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 flex bg-gray-50 border-b">
            <div className="w-20 p-3 text-sm font-medium border-r">Time</div>
            {displayDays.map(day => (
              <div key={day} className="flex-1 p-3 text-sm font-medium text-center border-r last:border-r-0">
                {getDayName(day)}
              </div>
            ))}
          </div>
          
          {/* Scrollable Calendar content */}
          <div 
            ref={scrollContainerRef}
            className="overflow-y-auto" 
            style={{ height: '535px' }} 
            id="calendar-scroll-container"
          >
            <div className="flex relative" style={{ height: `${calendarHeight}px` }}>
              {/* Time labels column */}
              <div className="w-20 border-r bg-gray-50 relative" style={{ height: `${calendarHeight}px` }}>
                {hourMarkers.map(({ minute }) => (
                  <div
                    key={minute}
                    className="absolute text-xs text-gray-600 pr-2 text-right w-full"
                    style={{ top: `${getYPixels(minute)}px`, transform: 'translateY(-50%)' }}
                  >
                    {minutesToDisplayTime(minute)}
                  </div>
                ))}
              </div>
              
              {/* Day columns */}
              <div className="flex-1 flex" style={{ height: `${calendarHeight}px` }}>
                {displayDays.map(day => {
                  const daySchedule = schedule.days[day] ?? { blocks: [] };
                  return (
                    <div 
                      key={day} 
                      className="flex-1 relative"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const studentData = e.dataTransfer.getData("application/json");
                        if (studentData && onStudentDrop) {
                          try {
                            const data = JSON.parse(studentData) as unknown;
                            if (typeof data === 'object' && data !== null && 
                                'studentId' in data && 'lessonDuration' in data && 
                                'studentName' in data && 'studentDbId' in data) {
                              const typedData = data as {
                                studentId: string;
                                studentName: string;
                                lessonDuration: number;
                                studentDbId: number;
                              };
                              const rect = e.currentTarget.getBoundingClientRect();
                              const y = e.clientY - rect.top;
                              const minute = Math.round(((y / 53) * 60 + minMinutes) / 15) * 15; // Snap to 15-minute intervals
                              
                              // Validate if this is a good drop zone
                              if (isValidDropZone(day, minute, typedData.lessonDuration, typedData.studentId, teacherAvailability, studentAvailabilities)) {
                                onStudentDrop(typedData, day, minute);
                              }
                            }
                          } catch (error) {
                            console.error("Error parsing student data:", error);
                          }
                        }
                      }}
                    >
                      {/* Hour lines */}
                      {hourMarkers.map(({ minute }, index) => (
                        <div
                          key={index}
                          className="absolute left-0 right-0 border-t border-gray-100"
                          style={{ top: `${getYPixels(minute)}px` }}
                        />
                      ))}
                      
                      {/* Valid drop zones for student dragging */}
                      {draggedStudent && validDropZonesByDay.has(day) && (
                        <>
                          {validDropZonesByDay.get(day)!.map((zone, zoneIndex) => (
                            <div
                              key={`dropzone-${zoneIndex}`}
                              className="absolute left-0 right-0 bg-green-100 border-2 border-dashed border-green-400 opacity-60 pointer-events-none"
                              style={{
                                top: `${((zone.start - minMinutes) / 60) * 53}px`,
                                height: `${(zone.duration / 60) * 53}px`
                              }}
                            />
                          ))}
                        </>
                      )}
                      
                      <TimeColumn
                        day={day}
                        daySchedule={daySchedule}
                        minTime={minTime}
                        maxTime={maxTime}
                        totalHours={totalHours}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onBlockClick={handleBlockClick}
                        onBlockDragStart={handleBlockDragStart}
                        onBlockDrag={handleBlockDrag}
                        onBlockDragEnd={handleBlockDragEnd}
                        draggedBlock={draggedBlock}
                        dragStart={dragStart}
                        dragEnd={dragEnd}
                        isDragging={isDragging}
                        mode={mode}
                        validDropZones={validDropZonesByDay.get(day) ?? []}
                        teacherAvailability={teacherAvailability}
                        studentAvailabilities={studentAvailabilities}
                        showStudentNames={showStudentNames}
                        snapMode={snapMode}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdaptiveCalendar;