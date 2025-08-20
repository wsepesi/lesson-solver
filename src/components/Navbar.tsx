"use client";

import Link from "next/link";
import { ProfileDropdown } from "./ProfileDropdown";

export default function Navbar() {
    return (
        <header className="bg-landing-blue text-white border-b border-landing-blue">
            <div className="container mx-auto px-4 py-2 flex justify-between items-center">
                <Link href="/studios" className="text-lg font-medium hover:opacity-80 transition-opacity">
                    Lesson Solver
                </Link>
                <div className="flex items-center">
                    <ProfileDropdown />
                </div>
            </div>
        </header>
    )
}