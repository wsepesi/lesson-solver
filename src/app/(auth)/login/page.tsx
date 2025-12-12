"use client";

/* eslint-disable @typescript-eslint/no-misused-promises */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

// check if we are on the dev env or prod, and assign BASE accordingly
const BASE = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "TODO"; //FIXME:
console.log(BASE);

const validEmail = (email: string): boolean => {
    const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regex.test(email);
};

export default function LoginPage() {
    const supabaseClient = createClient();
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
    <div className="min-h-screen bg-landing-background font-arimo flex flex-col">
        {/* Header */}
        <header className="bg-landing-blue text-white border-b border-landing-blue">
            <div className="container mx-auto px-4 py-2 flex justify-between items-center">
                <Link href="/" className="text-lg font-medium hover:opacity-80 transition-opacity">
                    Cadenza
                </Link>
                <nav className="flex items-center gap-3">
                    <span className="text-white/60 text-sm">Already have an account?</span>
                    <Link href="/signup">
                        <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-landing-blue text-sm px-3 py-1">
                            Sign Up
                        </Button>
                    </Link>
                </nav>
            </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                <div className="bg-white border border-landing-blue/20 p-8 space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold text-landing-blue">Log In</h1>
                        <p className="text-landing-blue/70">
                        {sent ? "Enter the one-time code sent to your email" : "Enter your email to log in"}
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-landing-blue font-medium">{sent ? "One-Time Code" : "Email"}</Label>
                            <div className="flex flex-row gap-2">
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
                                            className="border-landing-blue/20 focus:border-landing-blue"
                                        />
                                        <Button 
                                            className="bg-landing-blue text-white hover:bg-landing-blue-hover min-w-[80px]" 
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
                                        className="border-landing-blue/20 focus:border-landing-blue"
                                    />
                                    <Button 
                                        className="bg-landing-blue text-white hover:bg-landing-blue-hover min-w-[80px]" 
                                        onClick={handleClick}
                                        disabled={loading}
                                    >
                                        {loading ? <LoadingSpinner size="sm" /> : "Send Code"}
                                    </Button>
                                </>}
                            </div>
                        </div>
                        <div className="text-center text-sm">
                            <span className="text-landing-blue/60">Don&apos;t have an account? </span>
                            <Link href="/signup" className="text-landing-blue hover:text-landing-blue-hover font-medium">
                                Sign up here
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
}