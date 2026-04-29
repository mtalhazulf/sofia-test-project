import { cn } from "@/lib/utils";

export function Monogram({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("text-brand", className)}
    >
      <rect x="0" y="0" width="32" height="32" rx="6" fill="currentColor" />
      <path
        d="M8 9 L11.4 22 L14 13 L16 22 L18.5 13 L20.5 22 L24 9"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
