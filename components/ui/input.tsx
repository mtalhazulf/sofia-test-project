import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink",
        "placeholder:text-ink-faint",
        "transition-colors duration-150",
        "hover:border-line-strong",
        "focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/15",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-elevated",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
