import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-white hover:bg-ink-soft",
        primary:
          "bg-brand text-white hover:bg-brand-deep",
        outline:
          "bg-surface text-ink border border-line hover:border-line-strong hover:bg-elevated",
        ghost:
          "text-ink hover:bg-elevated",
        link:
          "h-auto px-0 text-brand hover:underline underline-offset-2",
        destructive:
          "bg-brand text-white hover:bg-brand-deep",
        secondary:
          "bg-elevated text-ink border border-line hover:bg-line-soft",
      },
      size: {
        default: "h-9 px-3.5 gap-2",
        sm: "h-8 px-3 text-[0.8125rem] gap-1.5",
        lg: "h-10 px-4 gap-2",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
