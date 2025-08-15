"use client";

import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
    first_name: z.string().min(2).max(50),
    last_name: z.string().min(2).max(50),
    email: z.string().email(),
});

type FormSchema = z.infer<typeof formSchema>;

export default function SignupPage() {
    const supabaseClient = useSupabaseClient();
    const router = useRouter();
    const { toast } = useToast();

    const [sent, setSent] = useState(false);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

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
            toast({
                variant: "destructive",
                title: "Code required",
                description: "Please enter the verification code."
            });
            return;
        }
        setLoading(true);
        
        try {
            const { 
                data: { session },
                error
            } = await supabaseClient.auth.verifyOtp({
                email,
                token: code,
                type: 'signup',
            });

            if (error) {
                toast({
                    variant: "destructive",
                    title: "Verification failed",
                    description: "Invalid code. Please check and try again."
                });
                setLoading(false);
                return;
            }
            
            if (session) {
                await supabaseClient.auth.setSession(session);
                toast({
                    title: "Account created!",
                    description: "Welcome! Redirecting to your dashboard..."
                });
                router.push("/studios");
            }
        } catch {
            toast({
                variant: "destructive",
                title: "Signup failed",
                description: "An unexpected error occurred. Please try again."
            });
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (values: FormSchema) => {
        setLoading(true);
        
        try {
            const { data, error } = await supabaseClient.auth.signInWithOtp({
                email: values.email,
                options: {
                    data: {
                        first_name: values.first_name,
                        last_name: values.last_name,
                    }
                }
            });
            if (error) {
                toast({
                    variant: "destructive",
                    title: "Signup failed", 
                    description: "Unable to create account. Please try again."
                });
                console.log(data, error);
                setLoading(false);
                return;
            }
            setLoading(false);
            setSent(true);
            setEmail(values.email);
            toast({
                title: "Code sent!",
                description: "Check your email for the verification code."
            });
        } catch {
            toast({
                variant: "destructive",
                title: "Unexpected error",
                description: "Please try again later."
            });
            setLoading(false);
        }
    };

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
                    {sent ? (
                        <>
                            <Label htmlFor="code">One-Time Code</Label>
                            <div className="flex flex-row">
                                <Input 
                                    id="code" 
                                    placeholder="123456" 
                                    required 
                                    type="text" 
                                    value={code} 
                                    onChange={(e) => setCode(e.target.value)}
                                    disabled={loading}
                                    onKeyDown={(e) => e.key === "Enter" && !loading && handleCodeSubmit()}
                                />
                                <Button 
                                    className="mx-2 min-w-[80px]" 
                                    onClick={handleCodeSubmit}
                                    disabled={loading}
                                >
                                    {loading ? <LoadingSpinner size="sm" /> : "Verify"}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <Form {...form}>
                            <form className="space-y-4 w-full" onSubmit={form.handleSubmit(onSubmit)}>
                                <FormField
                                    control={form.control}
                                    name="first_name"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="First" disabled={loading} {...field} />
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
                                            <Input placeholder="Last" disabled={loading} {...field} />
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
                                                <Input placeholder="m@example.com" disabled={loading} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full min-h-[40px]" disabled={loading}>
                                    {loading ? <LoadingSpinner size="sm" /> : "Create Account"}
                                </Button>
                            </form>
                        </Form>
                    )}
                </div>
            </div>
        </div>
    </div>
    );
}