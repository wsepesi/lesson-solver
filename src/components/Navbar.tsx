"use client";

import Link from "next/link";
// import { usePathname } from "next/navigation";
import { ProfileDropdown } from "./ProfileDropdown";

export default function Navbar() {
    // const pathname = usePathname();
    
    return (
        <header className="bg-landing-blue text-white border-b border-landing-blue">
            <div className="container mx-auto px-4 py-2 flex justify-between items-center">
                <Link href="/" className="text-lg font-medium hover:opacity-80 transition-opacity">
                    Cadenza
                </Link>
                <nav className="flex items-center gap-6">
                    <Link 
                        href="/studios" 
                        className={`text-sm font-medium transition-colors hover:text-white/80 text-white`}
                    >
                        Studios
                    </Link>
                    <ProfileDropdown />
                </nav>
            </div>
        </header>
    )
}