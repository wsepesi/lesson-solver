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
import { createClient } from "@/utils/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

const formSchema = z.object({
    first_name: z.string().min(2).max(50),
    last_name: z.string().min(2).max(50),
    email: z.string().email(),
});

type FormSchema = z.infer<typeof formSchema>;

export default function SignupPage() {
    const supabaseClient = createClient();
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
    <div className="min-h-screen bg-landing-background font-arimo flex flex-col">
        {/* Header */}
        <header className="bg-landing-blue text-white border-b border-landing-blue">
            <div className="container mx-auto px-4 py-2 flex justify-between items-center">
                <Link href="/" className="text-lg font-medium hover:opacity-80 transition-opacity">
                    Lesson Solver
                </Link>
                <nav className="flex items-center gap-3">
                    <span className="text-white/60 text-sm">Already have an account?</span>
                    <Link href="/login">
                        <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-landing-blue text-sm px-3 py-1">
                            Log In
                        </Button>
                    </Link>
                </nav>
            </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white border border-landing-blue/20 p-8 space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold text-landing-blue">Sign Up</h1>
                        <p className="text-landing-blue/70">
                        {sent ? "Enter the one-time code sent to your email" : "Sign up with your name and email"}
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            {sent ? (
                                <>
                                    <Label htmlFor="code" className="text-landing-blue font-medium">One-Time Code</Label>
                                    <div className="flex flex-row gap-2">
                                        <Input 
                                            id="code" 
                                            placeholder="123456" 
                                            required 
                                            type="text" 
                                            value={code} 
                                            onChange={(e) => setCode(e.target.value)}
                                            disabled={loading}
                                            onKeyDown={(e) => e.key === "Enter" && !loading && handleCodeSubmit()}
                                            className="border-landing-blue/20 focus:border-landing-blue"
                                        />
                                        <Button 
                                            className="bg-landing-blue text-white hover:bg-landing-blue-hover min-w-[80px]" 
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
                                                <FormLabel className="text-landing-blue font-medium">First Name</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="First" 
                                                        disabled={loading} 
                                                        {...field}
                                                        className="border-landing-blue/20 focus:border-landing-blue"
                                                    />
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
                                                <FormLabel className="text-landing-blue font-medium">Last Name</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="Last" 
                                                        disabled={loading} 
                                                        {...field}
                                                        className="border-landing-blue/20 focus:border-landing-blue"
                                                    />
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
                                                    <FormLabel className="text-landing-blue font-medium">Email</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            placeholder="m@example.com" 
                                                            disabled={loading} 
                                                            {...field}
                                                            className="border-landing-blue/20 focus:border-landing-blue"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button 
                                            type="submit" 
                                            className="w-full min-h-[40px] bg-landing-blue text-white hover:bg-landing-blue-hover" 
                                            disabled={loading}
                                        >
                                            {loading ? <LoadingSpinner size="sm" /> : "Create Account"}
                                        </Button>
                                    </form>
                                </Form>
                            )}
                        </div>
                        <div className="text-center text-sm">
                            <span className="text-landing-blue/60">Already have an account? </span>
                            <Link href="/login" className="text-landing-blue hover:text-landing-blue-hover font-medium">
                                Log in here
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
}