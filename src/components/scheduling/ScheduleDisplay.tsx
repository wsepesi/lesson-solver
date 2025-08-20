"use client";

import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  Clock, 
  Users, 
  Download, 
  List, 
  Grid3x3, 
  Eye,
  AlertTriangle,
  TrendingUp,
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "lib/utils";
import {
  type WeekSchedule,
  type LessonAssignment,
  type ScheduleSolution,
  type Person
} from "lib/scheduling/types";
import {
  minutesToTimeString,
  timeBlockToString,
  dayNames,
  shortDayNames,
  detectConflicts,
  calculateUtilization,
  generateICS,
  getStudentColor
} from "lib/scheduling/display-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Main component props
interface ScheduleDisplayProps {
  solution: ScheduleSolution;
  teacherSchedule: WeekSchedule;
  students: Person[];
  teacherName: string;
  className?: string;
  onExportCalendar?: () => void;
  onConflictClick?: (conflict: LessonAssignment[]) => void;
}

type ViewMode = "week" | "day" | "list";

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({
  solution,
  teacherSchedule,
  students,
  teacherName,
  className,
  onExportCalendar,
  onConflictClick
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDay, setSelectedDay] = useState<number>(1); // Monday by default
  
  // Calculate metrics
  const metrics = useMemo(() => calculateUtilization(solution, teacherSchedule), [solution, teacherSchedule]);
  const conflicts = useMemo(() => detectConflicts(solution.assignments), [solution.assignments]);
  
  // Group assignments by day for week view
  const assignmentsByDay = useMemo(() => {
    const grouped: Record<number, LessonAssignment[]> = {};
    solution.assignments.forEach(assignment => {
      grouped[assignment.dayOfWeek] ??= [];
      grouped[assignment.dayOfWeek]!.push(assignment);
    });
    
    // Sort assignments within each day by start time
    Object.values(grouped).forEach(dayAssignments => {
      dayAssignments.sort((a, b) => a.startMinute - b.startMinute);
    });
    
    return grouped;
  }, [solution.assignments]);

  // Export to ICS
  const handleExport = () => {
    const icsContent = generateICS(solution, students, teacherName);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${teacherName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-schedule.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    onExportCalendar?.();
  };

  // Week View Component
  const WeekView = () => (
    <div className="grid grid-cols-7 gap-2 h-[500px]">
      {dayNames.map((dayName, dayIndex) => {
        const dayAssignments = assignmentsByDay[dayIndex] ?? [];
        const isWeekend = dayIndex === 0 || dayIndex === 6;
        
        return (
          <div
            key={dayIndex}
            className={cn(
              "border rounded-lg p-2 overflow-y-auto",
              isWeekend ? "bg-gray-50" : "bg-white"
            )}
          >
            <h3 className="font-semibold text-sm mb-2 sticky top-0 bg-white z-20">
              {shortDayNames[dayIndex]}
            </h3>
            <div className="space-y-1">
              {dayAssignments.map((assignment, index) => {
                const student = students.find(s => s.id === assignment.studentId);
                const isConflicted = conflicts.some(conflict => conflict.includes(assignment));
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "p-2 rounded text-xs cursor-pointer transition-colors",
                      isConflicted 
                        ? "bg-red-100 border-red-300 border hover:bg-red-200" 
                        : `${getStudentColor(assignment.studentId, 'bg')} ${getStudentColor(assignment.studentId, 'border')} border hover:opacity-80`
                    )}
                    onClick={() => {
                      if (isConflicted) {
                        const conflict = conflicts.find(c => c.includes(assignment));
                        if (conflict) onConflictClick?.(conflict);
                      }
                    }}
                  >
                    <div className={cn(
                      "font-medium truncate",
                      isConflicted ? "text-red-800" : getStudentColor(assignment.studentId, 'text')
                    )}>
                      {student?.name ?? `Student ${assignment.studentId}`}
                    </div>
                    <div className="text-gray-600">
                      {minutesToTimeString(assignment.startMinute)}
                    </div>
                    <div className="text-gray-500">
                      {assignment.durationMinutes}min
                    </div>
                    {isConflicted && (
                      <div className="flex items-center mt-1 text-red-600">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        <span className="text-xs">Conflict</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Day View Component
  const DayView = () => {
    const dayAssignments = assignmentsByDay[selectedDay] ?? [];
    const teacherDaySchedule = teacherSchedule.days.find(d => d.dayOfWeek === selectedDay);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}
              disabled={selectedDay === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {dayNames[selectedDay]}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDay(Math.min(6, selectedDay + 1))}
              disabled={selectedDay === 6}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Badge variant="outline">
            {dayAssignments.length} lessons
          </Badge>
        </div>
        
        <div className="border rounded-lg p-4 min-h-[400px]">
          {teacherDaySchedule && (
            <div className="mb-4">
              <h4 className="font-medium text-sm text-gray-600 mb-2">Available Times:</h4>
              <div className="flex flex-wrap gap-2">
                {teacherDaySchedule.blocks.map((block, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {timeBlockToString(block)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {dayAssignments.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No lessons scheduled for this day
              </div>
            ) : (
              dayAssignments.map((assignment, index) => {
                const student = students.find(s => s.id === assignment.studentId);
                const isConflicted = conflicts.some(conflict => conflict.includes(assignment));
                
                return (
                  <Card
                    key={index}
                    className={cn(
                      "p-4 cursor-pointer transition-colors",
                      isConflicted 
                        ? "border-red-300 bg-red-50 hover:bg-red-100" 
                        : `${getStudentColor(assignment.studentId, 'border')} hover:opacity-80`
                    )}
                    onClick={() => {
                      if (isConflicted) {
                        const conflict = conflicts.find(c => c.includes(assignment));
                        if (conflict) onConflictClick?.(conflict);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className={cn(
                              "w-3 h-3 rounded-full",
                              isConflicted ? "bg-red-500" : getStudentColor(assignment.studentId, 'bg').replace('bg-', 'bg-').replace('-100', '-500')
                            )}
                          />
                          <h4 className={cn(
                            "font-medium",
                            isConflicted ? "text-red-800" : getStudentColor(assignment.studentId, 'text')
                          )}>
                            {student?.name ?? `Student ${assignment.studentId}`}
                          </h4>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center mt-1">
                          <Clock className="w-4 h-4 mr-1" />
                          {timeBlockToString({
                            start: assignment.startMinute,
                            duration: assignment.durationMinutes
                          })}
                        </div>
                        <div className="text-sm text-gray-500">
                          Duration: {assignment.durationMinutes} minutes
                        </div>
                      </div>
                      
                      {isConflicted && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Conflict
                        </Badge>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // List View Component (mobile-friendly)
  const ListView = () => (
    <div className="space-y-2">
      {solution.assignments.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No lessons scheduled
        </div>
      ) : (
        solution.assignments
          .sort((a, b) => {
            if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
            return a.startMinute - b.startMinute;
          })
          .map((assignment, index) => {
            const student = students.find(s => s.id === assignment.studentId);
            const isConflicted = conflicts.some(conflict => conflict.includes(assignment));
            
            return (
              <Card
                key={index}
                className={cn(
                  "p-3 cursor-pointer transition-colors",
                  isConflicted 
                    ? "border-red-300 bg-red-50 hover:bg-red-100" 
                    : `${getStudentColor(assignment.studentId, 'border')} hover:opacity-80`
                )}
                onClick={() => {
                  if (isConflicted) {
                    const conflict = conflicts.find(c => c.includes(assignment));
                    if (conflict) onConflictClick?.(conflict);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className={cn(
                          "w-3 h-3 rounded-full",
                          isConflicted ? "bg-red-500" : getStudentColor(assignment.studentId, 'bg').replace('bg-', 'bg-').replace('-100', '-500')
                        )}
                      />
                      <div className={cn(
                        "font-medium",
                        isConflicted ? "text-red-800" : getStudentColor(assignment.studentId, 'text')
                      )}>
                        {student?.name ?? `Student ${assignment.studentId}`}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {dayNames[assignment.dayOfWeek]}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {timeBlockToString({
                        start: assignment.startMinute,
                        duration: assignment.durationMinutes
                      })}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {assignment.durationMinutes}min
                    </Badge>
                    {isConflicted && (
                      <div className="mt-1">
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Conflict
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
      )}
    </div>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with metrics and controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Users className="w-6 h-6 mr-2" />
            Schedule Overview
          </h2>
          <p className="text-gray-600 mt-1">
            {solution.metadata.scheduledStudents} of {solution.metadata.totalStudents} students scheduled
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            value={viewMode}
            onValueChange={(value: ViewMode) => setViewMode(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">
                <div className="flex items-center">
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  Week
                </div>
              </SelectItem>
              <SelectItem value="day">
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  Day
                </div>
              </SelectItem>
              <SelectItem value="list">
                <div className="flex items-center">
                  <List className="w-4 h-4 mr-2" />
                  List
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export ICS
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Utilization</p>
                <p className="text-2xl font-bold">
                  {metrics.utilizationRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold">
                  {solution.metadata.scheduledStudents}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold">
                  {(metrics.scheduledMinutes / 60).toFixed(1)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conflicts</p>
                <p className="text-2xl font-bold text-red-600">
                  {conflicts.length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Gaps</p>
                <p className="text-2xl font-bold">
                  {(metrics.avgFragmentation / 60).toFixed(1)}h
                </p>
              </div>
              <FileText className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Schedule View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            {viewMode === "week" ? "Week View" : 
             viewMode === "day" ? "Day View" : "List View"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === "week" && <WeekView />}
          {viewMode === "day" && <DayView />}
          {viewMode === "list" && <ListView />}
        </CardContent>
      </Card>
      
      {/* Unscheduled Students */}
      {solution.unscheduled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">
              Unscheduled Students ({solution.unscheduled.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {solution.unscheduled.map((studentId, index) => {
                const student = students.find(s => s.id === studentId);
                return (
                  <Badge key={index} variant="destructive">
                    {student?.name ?? `Student ${studentId}`}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScheduleDisplay;