import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  mobileLabel?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  mobileView?: (item: T) => React.ReactNode;
  breakpoint?: number;
  className?: string;
}

export function ResponsiveTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  mobileView,
  breakpoint = 768,
  className = "",
}: ResponsiveTableProps<T>) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  if (isMobile) {
    if (mobileView) {
      return (
        <div className={`space-y-4 ${className}`}>
          {data.map((item) => (
            <div key={item.id}>{mobileView(item)}</div>
          ))}
        </div>
      );
    }

    return (
      <div className={`space-y-4 ${className}`}>
        {data.map((item) => (
          <Card 
            key={item.id} 
            className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {columns.map((column) => (
                  <div key={column.key} className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">
                      {column.mobileLabel || column.label}:
                    </span>
                    <span className="text-sm text-right flex-1 ml-4">
                      {column.render
                        ? column.render(item)
                        : (item as any)[column.key]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? "cursor-pointer" : ""}
            >
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render
                    ? column.render(item)
                    : (item as any)[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

