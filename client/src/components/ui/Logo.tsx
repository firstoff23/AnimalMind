import * as React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.ComponentPropsWithoutRef<"svg"> {
  size?: number | string;
}

export function Logo({ className, size = 24, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("text-current select-none shrink-0", className)}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Stylized Toes */}
      <circle cx="6.5" cy="7.5" r="2.1" />
      <circle cx="10.2" cy="5.4" r="2.4" />
      <circle cx="14.8" cy="5.7" r="2.4" />
      <circle cx="18.2" cy="8.1" r="2.1" />
      
      {/* Audio Wave representation of the pad: 5 rounded bars */}
      <rect x="6" y="11" width="1.6" height="5.5" rx="0.8" />
      <rect x="8.5" y="10" width="1.6" height="8.5" rx="0.8" />
      <rect x="11" y="9.5" width="1.6" height="10.5" rx="0.8" />
      <rect x="13.5" y="10" width="1.6" height="8.5" rx="0.8" />
      <rect x="16" y="11" width="1.6" height="5.5" rx="0.8" />
      
      {/* Connector base curve */}
      <path
        d="M 6.5 17.5 C 8 18.5, 16 18.5, 17.5 17.5"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
