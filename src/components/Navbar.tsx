import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from "./ui/navigation-menu";

import { Button } from "./ui/button";
import Link from "next/link";
import { ProfileDropdown } from "./ProfileDropdown";

export default function Navbar() {
    return (
        <div className="flex flex-row justify-between items-center w-full h-16 bg-white border-b border-gray-200">
            <div className="flex flex-row items-center">
                <div className="flex flex-row items-center ml-4">
                    {/* <img className="h-8 w-8 mr-2" src="/images/logo.svg" alt="logo" /> */}
                    <Link href="/studios">
                        <div className="text-2xl font-bold ml-4">T</div>
                    </Link>
                </div>
            </div>
            {/* <NavigationMenu>
                <NavigationMenuList>
                    <NavigationMenuItem>
                        <Link href="/" legacyBehavior passHref>
                            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                                Dashboard
                            </NavigationMenuLink>
                        </Link>
                    </NavigationMenuItem>
                </NavigationMenuList>
            </NavigationMenu> */}
            <div className="flex flex-row items-center">
                <div className="flex flex-row items-center mr-4">
                    <ProfileDropdown />
                </div>
            </div>
        </div>
    )
}