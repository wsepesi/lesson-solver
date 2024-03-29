import * as z from "zod"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form"

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-misused-promises */
/**
 * v0 by Vercel.
 * @see https://v0.dev/t/XNlTLb7
 */
// import Link from "next/link"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { useForm } from "react-hook-form"
import { useRouter } from "next/router"
import { useState } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { zodResolver } from "@hookform/resolvers/zod"

const formSchema = z.object({
    first_name: z.string().min(2).max(50),
    last_name: z.string().min(2).max(50),
    email: z.string().email(),
});

type FormSchema = z.infer<typeof formSchema>;

export default function Signup() {
    const supabaseClient = useSupabaseClient()
    const router = useRouter()

    const [sent, setSent] = useState(false)
    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)

    const form = useForm<FormSchema>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
        },
      });

    const handleCodeSubmit = async () => {
        if (code === "") {
            alert("Please enter a code.")
            return
        }
        setLoading(true)
        const { 
            data: { session },
            error
        } = await supabaseClient.auth.verifyOtp({
            email,
            token: code,
            type: 'signup',
        })

        if (error) {
            alert("There was an error. Please try again.") // TODO: make better
            setLoading(false)
            return
        }
        setLoading(false)
        if (session) {
            await supabaseClient.auth.setSession(session)
            await router.push("/studios")
        }
    }

    const onSubmit = async (values: FormSchema) => {
        setLoading(true)
        
        const { data, error } = await supabaseClient.auth.signInWithOtp({
            email: values.email,
            options: {
                data: {
                    first_name: values.first_name,
                    last_name: values.last_name,
                }
            }
        })
        if (error) {
            alert("There was an error. Please try again.") // TODO: make better
            console.log(data, error)
            setLoading(false)
            return
        }
        setLoading(false)
        setSent(true)
        setEmail(values.email)
    }

    return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center ">
        <div className="max-w-sm rounded-lg shadow-lg bg-white p-6 space-y-6 border border-gray-200 dark:border-gray-700 w-[40vw]">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold">Sign Up</h1>
                <p className="text-zinc-500 dark:text-zinc-400">
                {sent ? "Enter the one-time code sent to your email" : "Sign up with your name and email"}
                </p>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    {loading ? <p className="text-center">Loading...</p> : <>
                    
                    <div className="flex flex-row">
                        {sent ? 
                        <>
                            <Label>{"One-Time Code"}</Label>
                            <>
                                <Input id="code" placeholder={"123456"} required type="text" value={code} onChange={(e) => setCode(e.target.value)} onSubmit={handleCodeSubmit}/>
                                <Button className="mx-2" onClick={handleCodeSubmit}>Go</Button>
                            </>
                        </> 
                        :
                        <Form {...form}>
                            <form className="space-y-4 w-full" onSubmit={form.handleSubmit(onSubmit)}>
                                <FormField
                                    control={form.control}
                                    name="first_name"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="First" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="last_name"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Last" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField 
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="m@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full">Submit</Button>
                            </form>
                        </Form>
                    }
                    </div>
                    </>}
                </div>
            </div>
        </div>
    </div>
    )
}
