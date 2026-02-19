"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ViewToggle() {
  const pathname = usePathname();

  return (
    <div
      className="flex w-fit rounded-full border border-charcoal/15 p-0.5"
      role="group"
      aria-label="View"
    >
      <Link
        href="/weekly"
        aria-current={pathname === "/weekly" ? "page" : undefined}
        className={[
          "rounded-full px-5 py-2 font-sans text-sm font-medium transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine",
          pathname === "/weekly"
            ? "bg-charcoal text-cream"
            : "text-charcoal/50 hover:text-charcoal",
        ].join(" ")}
      >
        Day
      </Link>
      <Link
        href="/monthly"
        aria-current={pathname === "/monthly" ? "page" : undefined}
        className={[
          "rounded-full px-5 py-2 font-sans text-sm font-medium transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine",
          pathname === "/monthly"
            ? "bg-charcoal text-cream"
            : "text-charcoal/50 hover:text-charcoal",
        ].join(" ")}
      >
        Month
      </Link>
    </div>
  );
}
