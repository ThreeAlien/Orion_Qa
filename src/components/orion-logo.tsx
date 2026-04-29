import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  withWordmark?: boolean;
};

/**
 * Orion Belt — 三顆星象徵獵戶座腰帶 (Alnitak / Alnilam / Mintaka)
 */
export function OrionLogo({ size = 32, className, withWordmark = false }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="orion-star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFC107" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFC107" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill="#0a1929" />
        <circle cx="24" cy="24" r="22" stroke="#1976d2" strokeOpacity="0.4" />
        {/* Belt line */}
        <line
          x1="10"
          y1="32"
          x2="38"
          y2="16"
          stroke="#1976d2"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        {/* Three belt stars */}
        <circle cx="12" cy="31" r="6" fill="url(#orion-star-glow)" />
        <circle cx="24" cy="24" r="6" fill="url(#orion-star-glow)" />
        <circle cx="36" cy="17" r="6" fill="url(#orion-star-glow)" />
        <circle cx="12" cy="31" r="2" fill="#FFC107" />
        <circle cx="24" cy="24" r="2.5" fill="#FFFFFF" />
        <circle cx="36" cy="17" r="2" fill="#FFC107" />
      </svg>
      {withWordmark && (
        <span className="font-semibold tracking-tight text-lg">
          Orion <span className="text-primary">QA</span>
        </span>
      )}
    </span>
  );
}
