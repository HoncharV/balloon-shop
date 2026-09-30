import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full min-w-0 rounded-md border-2 border-input bg-white px-4 py-2 text-base text-foreground outline-none transition-colors duration-200",
        "placeholder:text-muted-foreground",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/25",
        "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-primary",
        "md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
