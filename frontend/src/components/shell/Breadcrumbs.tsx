"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // If at root /hr, hide breadcrumb
  if (segments.length <= 1) return null;

  const breadcrumbs = segments.map((seg, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = seg.replace(/-/g, " ");
    const isLast = index === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
      <Link href="/hr" className="hover:text-indigo-600 transition-colors flex items-center">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {breadcrumbs.map((b, i) => (
        <React.Fragment key={b.href}>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          {b.isLast ? (
            <span className="font-semibold text-slate-900 capitalize">{b.label}</span>
          ) : (
            <Link href={b.href} className="hover:text-indigo-600 transition-colors capitalize">
              {b.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
