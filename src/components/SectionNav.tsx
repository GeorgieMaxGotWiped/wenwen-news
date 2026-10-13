"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

const NAV = [
  { href: "/", label: "头版" },
  ...CATEGORIES.map((category) => ({ href: `/sections/${category.slug}`, label: category.name })),
];

export default function SectionNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="sectionnav" aria-label="栏目">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "is-active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
