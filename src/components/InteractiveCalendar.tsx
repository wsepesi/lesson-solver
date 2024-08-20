import { DndContext, type DragEndEvent, type DragOverEvent, DragOverlay, type DragStartEvent, type UniqueIdentifier, useDraggable, useDroppable } from '@dnd-kit/core';
import React, { useState } from 'react';
import { Card } from "./ui/card";
import { type StudioWithStudents } from '~/pages/studios/[slug]';
import { scheduleToButtons } from 'lib/heur_solver';
import { resolveLessonLength, transpose } from 'lib/utils';

type Schedule = boolean[][];

interface Booking {
  day: string;
  time_start: string;
  time_end: string;
}

export interface Event {
  id: string;
  name: string;
  booking: Booking;
  other_avail_times: Schedule;
  student_id: number
}

const days = ['M', 'Tu', 'W', 'Th', 'F'];
const hours = Array.from({ length: 24 }, (_, i) => i + 9)
  .filter(hour => hour >= 9 && hour <= 21)
  .flatMap(hour => [`${hour % 12 || 12}:00${hour < 12 ? 'am' : 'pm'}`, `${hour % 12 || 12}:30${hour < 12 ? 'am' : 'pm'}`]);

const getDayIndex = (day: string) => days.indexOf(day);
const getTimeIndex = (time: string) => hours.indexOf(time);
const getEventDurationInCells = (event: Event) => {
  const startIndex = getTimeIndex(event.booking.time_start);
  const endIndex = getTimeIndex(event.booking.time_end);
  return endIndex - startIndex;
};

const CalendarEvent: React.FC<{ 
  event: Event; 
  isDragging: boolean; 
  isDroppable: boolean;
  dragOverCell: { day: string; time: string } | null;
}> = ({ event, isDragging, isDroppable }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
  });

  const style = {
    height: `${getEventDurationInCells(event) * 30}px`,
    backgroundColor: 'black',
    opacity: isDragging ? (isDroppable ? 0.7 : 0.5) : 1,
    zIndex: 3,
  }; 

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`absolute w-full left-0 text-white rounded text-sm px-1 overflow-hidden flex items-center border border-white translate-x-${transform ? transform.x: 0} translate-y-${transform ? transform.y: 0}`}
    >
      {event.name}
    </div>
  );
};

const CalendarCell: React.FC<{ 
  day: string; 
  time: string; 
  events: Event[]; 
  isAvailable: boolean;
  isHourMark: boolean;
  potentialEventOutline: { start: boolean; end: boolean; isDroppable: boolean } | null;
}> = ({ day, time, events, isAvailable, isHourMark, potentialEventOutline }) => {
  const { setNodeRef } = useDroppable({
    id: `${day}-${time}`,
    data: { day, time },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        relative h-[30px] border-l border-gray-200
        ${isHourMark ? 'border-t border-gray-300' : ''}
        ${isAvailable ? 'bg-green-50' : 'bg-white'}
        ${potentialEventOutline?.start ? 'border-t-2 border-l-2 border-blue-500' : ''}
        ${potentialEventOutline?.end ? 'border-b-2 border-r-2 border-blue-500' : ''}
        ${potentialEventOutline && !potentialEventOutline.isDroppable ? 'bg-red-100' : ''}
      `}
    >
      {events.map(event => (
        <CalendarEvent 
          key={event.id} 
          event={event} 
          isDragging={false}
          isDroppable={true}
          dragOverCell={null}
        />
      ))}
    </div>
  );
};

const getStudentByEvent = (event: Event, studio: StudioWithStudents) => {
  return studio.students.find(student => student.id === event.student_id);
}

const InteractiveCalendar: React.FC<{ events: Event[]; mySchedule: Schedule, setEvents: React.Dispatch<React.SetStateAction<Event[]>>, studio: StudioWithStudents }> = ({ events, mySchedule, setEvents, studio }) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: string; time: string } | null>(null);

  const isTimeAvailable = (event: Event, day: string, time: string, duration: number) => {
    const student = getStudentByEvent(event, studio)
    if (!student) return false;
    const studentSchedule = transpose(scheduleToButtons(student.schedule))
    const dayIndex = getDayIndex(day);
    const startTimeIndex = getTimeIndex(time);
    for (let i = 0; i < duration; i++) {
      if (startTimeIndex + i >= hours.length || 
          !studentSchedule[startTimeIndex + i]?.[dayIndex] ||
          !mySchedule?.[startTimeIndex + i]?.[dayIndex]) {
        return false;
      }
      if (startTimeIndex + i + 1 < hours.length && startTimeIndex + i - 1 >= 0) {
        if ((!studentSchedule[startTimeIndex + i + 1]![dayIndex] || !mySchedule[startTimeIndex + i + 1]![dayIndex]) && 
            (!studentSchedule[startTimeIndex + i - 1]![dayIndex] || !mySchedule[startTimeIndex + i - 1]![dayIndex])) {
          return false
        }
      }
    }
    return true;
  };

  const doesEventOverlap = (day: string, time: string, duration: number, excludeEventId: string) => {
    const startIndex = getTimeIndex(time);
    return events.some(event => 
      event.id !== excludeEventId &&
      event.booking.day === day &&
      getTimeIndex(event.booking.time_start) < startIndex + duration &&
      getTimeIndex(event.booking.time_end) > startIndex
    );
  };

  const isCellDroppable = (day: string, time: string) => {
    if (activeId === null) return false;
    const activeEvent = events.find(event => event.id === activeId);
    if (!activeEvent) return false;

    const duration = getEventDurationInCells(activeEvent);
    return isTimeAvailable(activeEvent, day, time, duration) && !doesEventOverlap(day, time, duration, activeEvent.id);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.over) {
      const { day, time } = event.over.data.current as { day: string; time: string };
      setDragOverCell({ day, time });
    } else {
      setDragOverCell(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    if (over && activeId) {
      const { day, time } = over.data.current as { day: string; time: string };
      if (isCellDroppable(day, time)) {
        const updatedEvents: Event[] = events.map(evt => {
          if (evt.id === activeId) {
            const duration = getEventDurationInCells(evt);
            const endTimeIndex = getTimeIndex(time) + duration;
            const endTime = endTimeIndex < hours.length ? hours[endTimeIndex]! : hours[hours.length - 1]!
            return {
              ...evt,
              booking: {
                ...evt.booking,
                day,
                time_start: time,
                time_end: endTime
              }
            };
          }
          return evt;
        });
        setEvents(updatedEvents);
      }
    }
    setActiveId(null);
    setDragOverCell(null);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <Card className="py-3 w-[55vw]">
        <div className="overflow-auto max-h-[70vh]">
          <div className="grid grid-cols-6 gap-0 min-w-[600px] pr-[3vw]">
            <div className="col-span-1 sticky top-0 bg-white z-10"></div>
            {days.map(day => (
              <div key={day} className="text-center font-bold sticky top-0 bg-white z-10 py-2">
                {day}
              </div>
            ))}
            {hours.map((time, index) => (
              <React.Fragment key={time}>
                <div className="text-right pr-2 text-sm text-gray-500">{index % 2 === 0 ? time : ''}</div>
                {days.map(day => (
                  <CalendarCell
                    key={`${day}-${time}`}
                    day={day}
                    time={time}
                    events={events.filter(
                      event =>
                        event.booking.day === day &&
                        event.booking.time_start === time
                    )}
                    isAvailable={activeId ? isTimeAvailable(events.find(e => e.id === activeId)!, day, time, 1) : false}
                    isHourMark={index % 2 === 0}
                    potentialEventOutline={activeId && dragOverCell?.day === day && dragOverCell?.time === time
                      ? {
                          start: true,
                          end: getTimeIndex(time) + getEventDurationInCells(events.find(e => e.id === activeId)!) - 1 === index,
                          isDroppable: isCellDroppable(day, time)
                        }
                      : null
                    }
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Card>
      <DragOverlay>
        {activeId && dragOverCell ? (
          <CalendarEvent
            event={events.find(event => event.id === activeId)!}
            isDragging={true}
            isDroppable={isCellDroppable(dragOverCell.day, dragOverCell.time)}
            dragOverCell={dragOverCell}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default InteractiveCalendar;