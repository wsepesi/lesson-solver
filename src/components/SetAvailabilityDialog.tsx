import CalendarHandler from "./CalendarHandler"
import {
    DialogContent,
} from "./ui/dialog"

type Props = {
    handleSubmit: () => void,
    myAvailability: boolean[][],
    setMyAvailability: (myAvailability: boolean[][]) => void,
}

export default function SetAvailabilityDialog(props: Props) {
    return(
            <>
            <DialogContent className="min-w-[80vw] max-h-[90vh]">
                <CalendarHandler 
                    minutes={"30"}
                    setState={() => console.log("hello")}
                    setTeacherSchedule={() => console.log("hello")}
                    handleSubmit={props.handleSubmit}
                    buttonStates={props.myAvailability}
                    setButtonStates={props.setMyAvailability}
                />
            </DialogContent>
        </>
    )
}