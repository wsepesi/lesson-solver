"use client";

/**
 * useSchedule Hook - Phase 2.2 Implementation
 * 
 * React hook for managing TimeBlock-based schedules with auto-save functionality.
 * Provides complete schedule persistence with debouncing, optimistic updates,
 * and error handling for the new flexible scheduling system.
 * 
 * Features:
 * - Auto-save with 1-second debounce to reduce API calls
 * - Optimistic updates for immediate UI response
 * - Automatic validation using TimeBlock constraints
 * - JSON schedule format conversion for database compatibility
 * - Comprehensive error handling with typed error states
 * - Loading and saving state management
 * - Cleanup on unmount
 * 
 * Usage:
 * ```typescript
 * function ScheduleComponent({ teacherId }: { teacherId: string }) {
 *   const { 
 *     schedule, 
 *     updateSchedule, 
 *     loading, 
 *     saving, 
 *     error,
 *     hasUnsavedChanges,
 *     saveImmediately 
 *   } = useSchedule(teacherId);
 * 
 *   if (loading) return <div>Loading schedule...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 * 
 *   const handleAddTimeBlock = (dayIndex: number) => {
 *     updateSchedule(prev => {
 *       const newSchedule = cloneWeekSchedule(prev);
 *       newSchedule.days[dayIndex].blocks.push({
 *         start: 540, // 9:00 AM in minutes
 *         duration: 60 // 1 hour
 *       });
 *       return newSchedule;
 *     });
 *   };
 * 
 *   return (
 *     <div>
 *       <AdaptiveCalendar 
 *         schedule={schedule} 
 *         onChange={updateSchedule} 
 *       />
 *       {hasUnsavedChanges && saving && <span>Saving...</span>}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @since Phase 2.2 - Schedule Persistence Hook
 * @see /plans/data-model.md for implementation details
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { WeekSchedule } from '../../lib/scheduling/types';
import { 
  validateWeekSchedule, 
  createEmptyWeekSchedule, 
  cloneWeekSchedule
} from '../../lib/scheduling/utils';

/**
 * Error types for schedule operations
 */
export type ScheduleError = {
  type: 'validation' | 'network' | 'permission' | 'not_found';
  message: string;
  details?: unknown;
};

/**
 * Schedule persistence hook for managing TimeBlock-based schedules
 * Provides auto-save functionality with debouncing and optimistic updates
 */
export function useSchedule(ownerId: string) {
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ScheduleError | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const supabaseClient = createClient();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedScheduleRef = useRef<WeekSchedule | null>(null);

  /**
   * Save schedule to Supabase using existing schema
   * This bridges the gap until Phase 1.2 schema is implemented
   */
  const saveScheduleToSupabase = useCallback(async (schedule: WeekSchedule, ownerId: string) => {
    // Convert WeekSchedule to JSON format for storage
    const jsonSchedule = convertWeekScheduleToJson(schedule);
    
    // For now, we'll store in the studios table as teacher schedules
    // TODO: Add logic to determine teacher vs student and route accordingly
    const { error: updateError } = await supabaseClient
      .from('studios')
      .update({ 
        owner_schedule: jsonSchedule
      })
      .eq('user_id', ownerId);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }
  }, [supabaseClient]);

  /**
   * Debounced save function with 1 second delay
   */
  const debouncedSave = useCallback((newSchedule: WeekSchedule) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      void (async () => {
      try {
        setSaving(true);
        setError(null);
        
        // Validate schedule before saving
        if (!validateWeekSchedule(newSchedule)) {
          throw new Error('Invalid schedule data structure');
        }

        // Save to database
        await saveScheduleToSupabase(newSchedule, ownerId);
        
        lastSavedScheduleRef.current = cloneWeekSchedule(newSchedule);
        setHasUnsavedChanges(false);
        
      } catch (err) {
        const error: ScheduleError = {
          type: 'network',
          message: err instanceof Error ? err.message : 'Failed to save schedule',
          details: err
        };
        setError(error);
        console.error('Schedule save error:', err);
      } finally {
        setSaving(false);
      }
      })();
    }, 1000);
  }, [ownerId, saveScheduleToSupabase]);

  /**
   * Load schedule from Supabase
   */
  const loadScheduleFromSupabase = useCallback(async (ownerId: string): Promise<WeekSchedule> => {
    const { data, error: fetchError } = await supabaseClient
      .from('studios')
      .select('owner_schedule')
      .eq('user_id', ownerId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No rows found - return empty schedule
        return createEmptyWeekSchedule();
      }
      throw new Error(`Failed to load schedule: ${fetchError.message}`);
    }

    // Convert from JSON format to WeekSchedule
    if (data.owner_schedule) {
      return convertJsonToWeekSchedule(data.owner_schedule as Record<string, unknown>);
    }
    
    return createEmptyWeekSchedule();
  }, [supabaseClient]);

  /**
   * Convert WeekSchedule to JSON Schedule format for database storage
   */
  const convertWeekScheduleToJson = (weekSchedule: WeekSchedule): Record<string, unknown> => {
    // This is a conversion function for database storage
    // Implementation depends on JSON Schedule type structure
    const jsonSchedule: Record<string, unknown> = {
      Monday: undefined,
      Tuesday: undefined,
      Wednesday: undefined,
      Thursday: undefined,
      Friday: undefined,
      Saturday: undefined,
      Sunday: undefined,
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    weekSchedule.days.forEach((day) => {
      const dayName = dayNames[day.dayOfWeek];
      if (dayName && day.blocks.length > 0) {
        jsonSchedule[dayName] = day.blocks.map(block => ({
          start: {
            hour: Math.floor(block.start / 60),
            minute: block.start % 60
          },
          end: {
            hour: Math.floor((block.start + block.duration) / 60),
            minute: (block.start + block.duration) % 60
          }
        }));
      }
    });

    return jsonSchedule;
  };

  /**
   * Convert JSON Schedule format to WeekSchedule
   */
  const convertJsonToWeekSchedule = (jsonSchedule: Record<string, unknown>): WeekSchedule => {
    const weekSchedule = createEmptyWeekSchedule();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    dayNames.forEach((dayName, dayIndex) => {
      const dayBlocks = jsonSchedule[dayName];
      if (dayBlocks && Array.isArray(dayBlocks)) {
        const daySchedule = weekSchedule.days[dayIndex];
        if (daySchedule) {
          daySchedule.blocks = dayBlocks.map((block: unknown) => {
            const blockData = block as Record<string, { hour: number; minute: number }>;
            return {
              start: blockData.start!.hour * 60 + blockData.start!.minute,
              duration: (blockData.end!.hour * 60 + blockData.end!.minute) - (blockData.start!.hour * 60 + blockData.start!.minute)
            };
          });
        }
      }
    });

    return weekSchedule;
  };

  /**
   * Load schedule on mount and when ownerId changes
   */
  useEffect(() => {
    if (!ownerId) {
      setLoading(false);
      return;
    }

    const loadInitialSchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const loadedSchedule = await loadScheduleFromSupabase(ownerId);
        setSchedule(loadedSchedule);
        lastSavedScheduleRef.current = cloneWeekSchedule(loadedSchedule);
        setHasUnsavedChanges(false);
        
      } catch (err) {
        const error: ScheduleError = {
          type: 'network',
          message: err instanceof Error ? err.message : 'Failed to load schedule',
          details: err
        };
        setError(error);
        console.error('Schedule load error:', err);
        
        // Set empty schedule as fallback
        const emptySchedule = createEmptyWeekSchedule();
        setSchedule(emptySchedule);
        lastSavedScheduleRef.current = emptySchedule;
        
      } finally {
        setLoading(false);
      }
    };

    void loadInitialSchedule();
  }, [ownerId, supabaseClient, loadScheduleFromSupabase]);

  /**
   * Update schedule with optimistic updates and auto-save
   */
  const updateSchedule = useCallback((newSchedule: WeekSchedule | ((prev: WeekSchedule | null) => WeekSchedule)) => {
    setSchedule(prev => {
      const updatedSchedule = typeof newSchedule === 'function' ? newSchedule(prev) : newSchedule;
      
      // Validate the new schedule
      if (!validateWeekSchedule(updatedSchedule)) {
        const error: ScheduleError = {
          type: 'validation',
          message: 'Invalid schedule data - changes not saved',
        };
        setError(error);
        return prev; // Don't update if invalid
      }
      
      // Clear any existing errors
      setError(null);
      setHasUnsavedChanges(true);
      
      // Trigger debounced save
      void debouncedSave(updatedSchedule);
      
      return updatedSchedule;
    });
  }, [debouncedSave]);

  /**
   * Force immediate save (useful for form submissions)
   */
  const saveImmediately = useCallback(async () => {
    if (!schedule) return;
    
    // Cancel any pending debounced save
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    try {
      setSaving(true);
      setError(null);
      
      await saveScheduleToSupabase(schedule, ownerId);
      lastSavedScheduleRef.current = cloneWeekSchedule(schedule);
      setHasUnsavedChanges(false);
      
    } catch (err) {
      const error: ScheduleError = {
        type: 'network',
        message: err instanceof Error ? err.message : 'Failed to save schedule',
        details: err
      };
      setError(error);
      throw new Error(error.message); // Re-throw so caller can handle
    } finally {
      setSaving(false);
    }
  }, [schedule, ownerId, saveScheduleToSupabase]);

  /**
   * Reset schedule to last saved state
   */
  const resetToSaved = useCallback(() => {
    if (lastSavedScheduleRef.current) {
      setSchedule(cloneWeekSchedule(lastSavedScheduleRef.current));
      setHasUnsavedChanges(false);
      setError(null);
    }
  }, []);

  /**
   * Clear all errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    schedule,
    updateSchedule,
    saveImmediately,
    resetToSaved,
    loading,
    saving,
    error,
    clearError,
    hasUnsavedChanges,
    
    // Computed states for UI
    isReady: !loading && schedule !== null,
    canSave: schedule !== null && !saving,
    hasError: error !== null,
  };
}

/**
 * Hook variant specifically for student schedules
 * Uses the same underlying logic but targets student records
 */
export function useStudentSchedule(studentId: string) {
  // This would be implemented similarly but target the students table
  // For now, delegate to the main hook
  return useSchedule(studentId);
}

/**
 * Hook variant specifically for teacher schedules
 * Uses the same underlying logic but targets studio/teacher records
 */
export function useTeacherSchedule(teacherId: string) {
  // This would be implemented similarly but target the studios table
  // For now, delegate to the main hook
  return useSchedule(teacherId);
}