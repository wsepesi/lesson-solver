"use client";

import { AdaptiveCalendar } from "./scheduling/AdaptiveCalendar";
import { Button } from "./ui/button";
import {
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "./ui/dialog"
import type { WeekSchedule } from "lib/scheduling/types";

type Props = {
    handleSubmit: () => void,
    schedule: WeekSchedule | null,
    onScheduleChange: (schedule: WeekSchedule) => void,
    saving?: boolean,
    showWeekends?: boolean,
}

export default function SetAvailabilityDialog(props: Props) {
    const { schedule, onScheduleChange, handleSubmit, saving, showWeekends } = props;

    if (!schedule) {
        return (
            <DialogContent className="min-w-[80vw] max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Set Availability</DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-center h-64">
                    <div>Loading schedule...</div>
                </div>
            </DialogContent>
        );
    }

    return (
        <DialogContent className="w-[95vw] h-[95vh] max-w-[95vw] max-h-[95vh] p-0">
            <div className="h-full flex flex-col">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle>Set Availability</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden min-h-0 max-h-[calc(100vh-10rem)] pt-2 pl-2">
                    <AdaptiveCalendar 
                        schedule={schedule}
                        onChange={onScheduleChange}
                        granularity={15}
                        showWeekends={showWeekends}
                    />
                </div>
                <DialogFooter className="p-6 pt-4 flex-shrink-0">
                    <Button 
                        onClick={handleSubmit} 
                        disabled={saving}
                        className="w-full"
                    >
                        {saving ? "Saving..." : "Save Availability"}
                    </Button>
                </DialogFooter>
            </div>
        </DialogContent>
    );
}