import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}

export function ResponsiveTable({ children, className, minWidth = "600px" }: ResponsiveTableProps) {
  return (
    <ScrollArea className={cn("w-full whitespace-nowrap", className)}>
      <div style={{ minWidth }}>
        {children}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}