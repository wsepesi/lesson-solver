"use client";

/* eslint-disable @typescript-eslint/no-misused-promises */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

// check if we are on the dev env or prod, and assign BASE accordingly
const BASE = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "TODO"; //FIXME:
console.log(BASE);

const validEmail = (email: string): boolean => {
    const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regex.test(email);
};

export default function LoginPage() {
    const supabaseClient = useSupabaseClient();
    const router = useRouter();
    const { toast } = useToast();

    const [sent, setSent] = useState(false);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    };

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
                type: 'email',
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
                    title: "Login successful!",
                    description: "Redirecting to your dashboard..."
                });
                router.push("/studios");
            }
        } catch {
            toast({
                variant: "destructive",
                title: "Login failed",
                description: "An unexpected error occurred. Please try again."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClick = async () => {
        try {
            if (email === "") {
                toast({
                    variant: "destructive",
                    title: "Email required",
                    description: "Please enter your email address."
                });
                return;
            }
            if (!validEmail(email)) {
                toast({
                    variant: "destructive",
                    title: "Invalid email",
                    description: "Please enter a valid email address."
                });
                return;
            }
            setLoading(true);
            const { error } = await supabaseClient.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: false
                }
            });
            if (error) {
                switch (error.message) {
                    case "Signups not allowed for otp":
                        toast({
                            variant: "destructive",
                            title: "Account not found",
                            description: "No account exists with this email. Please sign up first."
                        });
                        break;
                    default:
                        toast({
                            variant: "destructive",
                            title: "Error sending code",
                            description: "Please check your email and try again."
                        });
                        break;
                }
                setLoading(false);
                setEmail("");
                return;
            }
            setLoading(false);
            setSent(true);
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
                <h1 className="text-3xl font-bold">Log In</h1>
                <p className="text-zinc-500 dark:text-zinc-400">
                {sent ? "Enter the one-time code sent to your email" : "Enter your email to log in"}
                </p>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">{sent ? "One-Time Code" : "Email"}</Label>
                    <div className="flex flex-row">
                        {sent ? 
                            <>
                                <Input 
                                    id="code" 
                                    placeholder={"123456"} 
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
                            </> :
                        <>
                            <Input 
                                id="email" 
                                placeholder={"m@example.com"} 
                                required 
                                type="email" 
                                value={email} 
                                onChange={handleChange} 
                                disabled={loading}
                                onKeyDown={(e) => e.key === "Enter" && !loading && handleClick()}
                            />
                            <Button 
                                className="mx-2 min-w-[80px]" 
                                onClick={handleClick}
                                disabled={loading}
                            >
                                {loading ? <LoadingSpinner size="sm" /> : "Send Code"}
                            </Button>
                        </>}
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
}