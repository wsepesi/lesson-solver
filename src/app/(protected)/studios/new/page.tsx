"use client";

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Navbar from "@/components/Navbar"
import type { NewStudioInfo } from "lib/types"
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast"
import { type User } from "@supabase/auth-helpers-nextjs"
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react"
import { useRouter } from "next/navigation"

const generateRandomCode = (len = 5) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""
    for (let i = 0; i < len; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
}

export default function NewStudioPage() {
    const supabaseClient = useSupabaseClient()
    const user: User | null = useUser()
    const router = useRouter()

    const [formData, setFormData] = useState<NewStudioInfo>({
        name: "",
    })
    const { toast } = useToast()

    const handleClick = async() => {
        if (formData.name === "") {
            toast({
                title: "Please fill out all fields",
                description: "Naming the Studio is required",
            })
            return
        }
        try {
            if (user) {
                let success = false

                // try generating a unique code until we get one
                while (!success) {
                    const res = await supabaseClient.from("studios").insert({
                        studio_name: formData.name,
                        user_id: user.id,
                        code: generateRandomCode(),
                    })
                    switch (res.status) {
                        case 201:
                            success = true
                            break
                        case 409:
                            // code already exists, try again
                            break
                        default:
                            console.log(res)
                            alert("error, please try again")
                            return
                    }
                }

                // confirm success with user and redirect
                toast({
                    title: "Studio created!",
                    description: "Redirecting...",
                })
                router.push("/studios")
            }
        } catch (e) {
            console.log(e)
            alert("error, please try again")
        }
    }
    return (
        <div className="h-screen">
        <Navbar />
        <div className="flex justify-center items-center w-full h-full max-h-[90vh]">
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
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    void handleClick()
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
            
        </div>
    )
}