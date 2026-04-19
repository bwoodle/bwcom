"use client";

import React from "react";
import Link from "next/link";
import {
  TopNavigation,
  type TopNavigationProps,
} from "@cloudscape-design/components";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CORE_NAV_ITEMS, getDesktopNavDescriptors } from "./nav-config";

const NavBar: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const desktopUtilities: TopNavigationProps.Utility[] =
    getDesktopNavDescriptors(session).map((item) => {
      if (item.kind === "route") {
        return {
          type: "button",
          text: item.text,
          onClick: () => router.push(item.href),
        };
      }

      if (item.kind === "auth") {
        return {
          type: "button",
          text: item.text,
          onClick: () => signIn("google"),
        };
      }

      return {
        type: "menu-dropdown",
        text: item.text,
        items: [{ id: "signout", text: "Sign Out" }],
        onItemClick: ({ detail }) => {
          if (detail.id === "signout") {
            signOut();
          }
        },
      };
    });

  return (
    <header>
      <div className="navbar-desktop">
        <TopNavigation
          identity={{
            href: "/",
            title: "Brent Woodle",
          }}
          utilities={desktopUtilities}
        />
      </div>

      <nav aria-label="Primary" className="navbar-mobile">
        {CORE_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            className="navbar-mobile__link"
            href={item.href}
          >
            {item.text}
          </Link>
        ))}
      </nav>
    </header>
  );
};

export default NavBar;
