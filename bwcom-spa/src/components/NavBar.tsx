import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  TopNavigation,
  type TopNavigationProps,
} from "@cloudscape-design/components";

const NAV_ITEMS = [
  { href: "/", text: "About Me" },
  { href: "/training-log", text: "Training Log" },
  { href: "/race-history", text: "Race History" },
  { href: "/media", text: "Media" },
  { href: "/admin", text: "Admin" },
];

const NavBar: React.FC = () => {
  const navigate = useNavigate();

  const utilities: TopNavigationProps.Utility[] = NAV_ITEMS.map((item) => ({
    type: "button",
    text: item.text,
    onClick: () => navigate(item.href),
  }));

  return (
    <header>
      <div className="navbar-desktop">
        <TopNavigation
          identity={{
            href: "/",
            title: "Brent Woodle",
            onFollow: (event) => {
              event.preventDefault();
              navigate("/");
            },
          }}
          utilities={utilities}
        />
      </div>

      <nav aria-label="Primary" className="navbar-mobile">
        {NAV_ITEMS.slice(0, 3).map((item) => (
          <Link key={item.href} className="navbar-mobile__link" to={item.href}>
            {item.text}
          </Link>
        ))}
      </nav>
    </header>
  );
};

export default NavBar;
