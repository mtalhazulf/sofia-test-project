import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[0.75rem] font-medium leading-[1.4] transition-colors",
  {
    variants: {
      variant: {
        default: "bg-ink text-white",
        secondary: "bg-elevated text-ink border border-line",
        destructive: "bg-brand text-white",
        outline: "border border-line text-ink-mute bg-surface",
        success:
          "bg-success-wash text-success border border-success/20 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-success",
        warning:
          "bg-warn-wash text-warn border border-warn/20 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-warn",
        brand:
          "bg-brand-wash text-brand border border-brand/20",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
