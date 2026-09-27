import React from "react";
import Link from "next/link";

export interface LogoIconProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "auto" | "indigo" | "dark" | "light";
  theme?: "dark" | "light";
}

/**
 * WebQuiz Shield Mark Logo Icon
 * - Authentic academic & integrity shield with verified checkmark
 * - Auto-adapts to ANY background:
 *   - On dark backdrops: Renders a vibrant Indigo shield with crisp highlight border and pure white checkmark
 *   - On light backdrops: Renders the sleek deep slate shield with pure white checkmark
 */
export function LogoIcon({
  size = "md",
  className = "",
  variant = "auto",
  theme = "light",
}: LogoIconProps) {
  const sizeMap = {
    xs: "w-5 h-5",
    sm: "w-6 h-6 sm:w-7 sm:h-7",
    md: "w-8 h-8 sm:w-9 sm:h-9",
    lg: "w-10 h-10 sm:w-11 sm:h-11",
    xl: "w-12 h-12 sm:w-14 sm:h-14",
  };

  const isDark =
    variant === "dark" || (variant === "auto" && theme === "light");
  const isIndigo =
    variant === "indigo" || (variant === "auto" && theme === "dark");
  const isLight = variant === "light";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeMap[size]} ${className} shrink-0 select-none`}
      aria-label="WebQuiz Shield Mark"
    >
      {/* Shield Geometry */}
      {isLight ? (
        <path
          d="M 16 3 L 26.5 6.5 C 26.5 17 19.5 24.5 16 28.5 C 12.5 24.5 5.5 17 5.5 6.5 Z"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />
      ) : isIndigo ? (
        <path
          d="M 16 3 L 26.5 6.5 C 26.5 17 19.5 24.5 16 28.5 C 12.5 24.5 5.5 17 5.5 6.5 Z"
          fill="#4F46E5"
          stroke="#818CF8"
          strokeWidth="1.2"
        />
      ) : (
        <path
          d="M 16 3 L 26.5 6.5 C 26.5 17 19.5 24.5 16 28.5 C 12.5 24.5 5.5 17 5.5 6.5 Z"
          fill="#0F172A"
          stroke="#334155"
          strokeWidth="1"
        />
      )}

      {/* Bold Verified Checkmark */}
      <path
        d="M 11 16 L 14.5 19.5 L 21.5 12"
        stroke={isLight ? "#4F46E5" : "#FFFFFF"}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "auto" | "indigo" | "dark" | "light";
  theme?: "dark" | "light"; // Text color context
  showText?: boolean;
  subtitle?: string;
  badge?: React.ReactNode;
  className?: string;
  href?: string;
}

export default function Logo({
  size = "md",
  variant = "auto",
  theme = "light",
  showText = true,
  subtitle,
  badge,
  className = "",
  href,
}: LogoProps) {
  const isDarkTheme = theme === "dark";

  const content = (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      <LogoIcon size={size} variant={variant} theme={theme} />

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-tight">
            <span
              className={`font-black tracking-tight ${
                size === "xs"
                  ? "text-xs"
                  : size === "sm"
                  ? "text-sm sm:text-base"
                  : size === "lg"
                  ? "text-lg sm:text-xl"
                  : size === "xl"
                  ? "text-xl sm:text-2xl"
                  : "text-base sm:text-lg"
              } ${isDarkTheme ? "text-white" : "text-slate-900"}`}
            >
              Web<span className={isDarkTheme ? "text-indigo-400" : "text-indigo-600"}>Quiz</span>
            </span>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>

          {subtitle && (
            <span
              className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate ${
                isDarkTheme ? "text-indigo-300" : "text-indigo-600"
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center group transition-opacity hover:opacity-95">
        {content}
      </Link>
    );
  }

  return content;
}
