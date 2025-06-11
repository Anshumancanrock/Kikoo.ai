"use client";
import { useEffect, useState } from "react";

export default function ThemeBody({ children, className }: { children: React.ReactNode; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className={className}>{mounted ? children : null}</div>
  );
}
