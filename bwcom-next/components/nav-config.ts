export type NavRoute = {
  href: string;
  text: string;
};

export type NavSession = {
  user?: {
    name?: string | null;
    role?: string | null;
  };
} | null;

export type DesktopNavDescriptor =
  | ({ kind: "route" } & NavRoute)
  | { kind: "auth"; text: "Login" }
  | { kind: "user-menu"; text: string };

export const CORE_NAV_ITEMS: NavRoute[] = [
  { href: "/", text: "About Me" },
  { href: "/training-log", text: "Training Log" },
  { href: "/race-history", text: "Race History" },
];

const ADMIN_NAV_ITEMS: NavRoute[] = [
  { href: "/media", text: "Media" },
  { href: "/admin", text: "Admin" },
];

export function getDesktopNavDescriptors(
  session: NavSession,
): DesktopNavDescriptor[] {
  const items: DesktopNavDescriptor[] = CORE_NAV_ITEMS.map((item) => ({
    kind: "route",
    ...item,
  }));

  if (session?.user?.role === "admin") {
    items.push(
      ...ADMIN_NAV_ITEMS.map((item) => ({
        kind: "route" as const,
        ...item,
      })),
    );
  }

  if (session?.user) {
    items.push({
      kind: "user-menu",
      text: session.user.name || "User",
    });

    return items;
  }

  items.push({
    kind: "auth",
    text: "Login",
  });

  return items;
}
