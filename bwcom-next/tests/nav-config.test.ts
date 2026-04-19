import { describe, expect, it } from "vitest";

import {
  CORE_NAV_ITEMS,
  getDesktopNavDescriptors,
} from "../components/nav-config";

describe("CORE_NAV_ITEMS", () => {
  it("defines the three public links used by mobile navigation", () => {
    expect(CORE_NAV_ITEMS).toEqual([
      { href: "/", text: "About Me" },
      { href: "/training-log", text: "Training Log" },
      { href: "/race-history", text: "Race History" },
    ]);
  });
});

describe("getDesktopNavDescriptors", () => {
  it("returns public links plus login for signed-out users", () => {
    expect(getDesktopNavDescriptors(null)).toEqual([
      { kind: "route", href: "/", text: "About Me" },
      { kind: "route", href: "/training-log", text: "Training Log" },
      { kind: "route", href: "/race-history", text: "Race History" },
      { kind: "auth", text: "Login" },
    ]);
  });

  it("returns the user menu instead of login for signed-in non-admin users", () => {
    expect(
      getDesktopNavDescriptors({
        user: {
          name: "Brent",
          role: "user",
        },
      }),
    ).toEqual([
      { kind: "route", href: "/", text: "About Me" },
      { kind: "route", href: "/training-log", text: "Training Log" },
      { kind: "route", href: "/race-history", text: "Race History" },
      { kind: "user-menu", text: "Brent" },
    ]);
  });

  it("includes admin-only links for admin users", () => {
    expect(
      getDesktopNavDescriptors({
        user: {
          name: "Admin User",
          role: "admin",
        },
      }),
    ).toEqual([
      { kind: "route", href: "/", text: "About Me" },
      { kind: "route", href: "/training-log", text: "Training Log" },
      { kind: "route", href: "/race-history", text: "Race History" },
      { kind: "route", href: "/media", text: "Media" },
      { kind: "route", href: "/admin", text: "Admin" },
      { kind: "user-menu", text: "Admin User" },
    ]);
  });

  it("falls back to a generic user label when the session has no name", () => {
    expect(
      getDesktopNavDescriptors({
        user: {
          role: "user",
        },
      }),
    ).toEqual([
      { kind: "route", href: "/", text: "About Me" },
      { kind: "route", href: "/training-log", text: "Training Log" },
      { kind: "route", href: "/race-history", text: "Race History" },
      { kind: "user-menu", text: "User" },
    ]);
  });
});
