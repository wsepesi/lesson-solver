import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "~/components/ui/card"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import type { NewStudioInfo } from "lib/types"
import { useState } from "react";
import { useToast } from "../../components/ui/use-toast"

export default function NewStudio() {
    const [formData, setFormData] = useState<NewStudioInfo>({
        name: "",
    })
    const { toast } = useToast()
    return (
        <>
        <div className="flex justify-center items-center w-full min-h-screen">
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Create new Studio</CardTitle>
                {/* <CardDescription>Make sure to fill out the calendar before you submit!</CardDescription> */}
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={() => console.log(formData)}
                >
                <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                        id="name" 
                        placeholder="My Spring 2024 Studio" 
                        onChange={(e) => 
                            setFormData({
                                ...formData,
                                name: e.target.value
                            })}
                        value={formData.name}
                    />
                    </div>
                </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button onClick={() => {
                    // check we have a name and email
                    if (formData.name === "") {
                        toast({
                            title: "Please fill out all fields",
                            description: "Naming the Studio is required",
                        })
                        return
                    }
                    toast({
                        title: "Studio created!",
                        description: "Submitting data...",
                    }) // FIXME: not showing up for whatever reason idk
                    // TODO: await send to DB
                    // redirect to studio page

                }
                }>Continue</Button>
            </CardFooter>
        </Card>
        </div>
            
        </>
    )
}