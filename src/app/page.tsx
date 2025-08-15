import Link from "next/link";
import { Toaster } from "@/components/ui/toaster";

export default function HomePage() {
  return (
    <div className="flex flex-col w-full h-[100vh] justify-center items-center">
      <p className="font-mono py-3 text-lg">Many-to-one scheduling made easy</p>
      <p className="font-mono"><Link href="/login" className="border-2 hover:italic p-1">Log in</Link> or <Link href="/signup" className="border-2 hover:italic p-1">Sign up</Link></p>
      <Toaster />
    </div>
  );
}