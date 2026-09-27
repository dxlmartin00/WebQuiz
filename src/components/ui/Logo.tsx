import React from "react";
import Link from "next/link";

export interface LogoIconProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "indigo" | "dark" | "light";
}

/**
 * Geometric, emoji-free SVG Emblem for WebQuiz
 * Features:
 * - Flat academic card frame with crisp border
 * - Assessment document guidelines
 * - Stylized "W" monogram where the right wing transforms into an upward verified checkmark
 * - Academic excellence spark / diamond at the peak
 */
export function LogoIcon({
  size = "md",
  className = "",
  variant = "indigo",
}: LogoIconProps) {
  const sizeMap = {
    xs: "w-5 h-5",
    sm: "w-6 h-6 sm:w-7 sm:h-7",
    md: "w-8 h-8 sm:w-9 sm:h-9",
    lg: "w-10 h-10 sm:w-11 sm:h-11",
    xl: "w-12 h-12 sm:w-14 sm:h-14",
  };

  const isLight = variant === "light";
  const isDark = variant === "dark";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeMap[size]} ${className} shrink-0 select-none`}
      aria-label="WebQuiz Logo"
    >
      <defs>
        {/* Indigo Variant Gradient */}
        <linearGradient
          id="wq-indigo-bg"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>

        {/* Dark Variant Gradient */}
        <linearGradient
          id="wq-dark-bg"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Dynamic Verification Wing Gradient */}
        <linearGradient
          id="wq-accent-grad"
          x1="14"
          y1="23"
          x2="26"
          y2="9"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>

        {/* Gold Diamond Gradient */}
        <linearGradient
          id="wq-spark-grad"
          x1="24"
          y1="5"
          x2="28"
          y2="11"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* Emblem Frame */}
      {isLight ? (
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="5"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />
      ) : isDark ? (
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="5"
          fill="url(#wq-dark-bg)"
          stroke="#334155"
          strokeWidth="1.5"
        />
      ) : (
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="5"
          fill="url(#wq-indigo-bg)"
          stroke="#6366F1"
          strokeWidth="1.5"
        />
      )}

      {/* Subtle Background Assessment Paper Guidelines */}
      <line
        x1="6.5"
        y1="7.5"
        x2="14"
        y2="7.5"
        stroke={isLight ? "#CBD5E1" : isDark ? "#475569" : "#818CF8"}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity={isLight ? 0.8 : 0.4}
      />
      <line
        x1="6.5"
        y1="10.5"
        x2="11.5"
        y2="10.5"
        stroke={isLight ? "#CBD5E1" : isDark ? "#475569" : "#818CF8"}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity={isLight ? 0.8 : 0.4}
      />

      {/* Geometric "W" monogram with verified checkmark wing */}
      {/* Left stroke of W */}
      <path
        d="M6.5 13.5L11 23L15.5 14"
        stroke={isLight ? "#1E293B" : "#FFFFFF"}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right stroke of W transforming into a checkmark accent */}
      <path
        d="M14.5 14L19 23L25.5 9.5"
        stroke={isLight ? "#4F46E5" : "url(#wq-accent-grad)"}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Verification Sparkle / Academic Diamond */}
      <path
        d="M26 4.5L26.9 7.2L29.5 8L26.9 8.8L26 11.5L25.1 8.8L22.5 8L25.1 7.2L26 4.5Z"
        fill="url(#wq-spark-grad)"
      />
    </svg>
  );
}

export interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "indigo" | "dark" | "light";
  theme?: "dark" | "light"; // Text color context (light text on dark background or vice versa)
  showText?: boolean;
  subtitle?: string;
  badge?: React.ReactNode;
  className?: string;
  href?: string;
}

export default function Logo({
  size = "md",
  variant = "indigo",
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
      <LogoIcon size={size} variant={variant} />

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
