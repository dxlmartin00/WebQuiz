import React from "react";
import Link from "next/link";

export interface LogoIconProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "indigo" | "dark" | "light";
}

/**
 * Universal High-Contrast WebQuiz Emblem
 * - Self-contained high-luminance tile that fits with high contrast on ANY background (dark, light, gray, or black)
 * - Single-path solid-white geometric "W" that is 100% visible and never disappears or appears as a "V"
 * - Dynamic checkmark sweep with radiant golden achievement diamond at the crest
 * - Zero fragile gradient IDs to ensure flawless rendering across all browsers and SSR environments
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
      {/* Outer Brand Tile - High-contrast on both dark and light backdrops */}
      {isLight ? (
        <rect
          width="32"
          height="32"
          rx="7"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />
      ) : isDark ? (
        <rect
          width="32"
          height="32"
          rx="7"
          fill="#0F172A"
          stroke="#334155"
          strokeWidth="1.5"
        />
      ) : (
        <rect
          width="32"
          height="32"
          rx="7"
          fill="#4F46E5"
          stroke="#6366F1"
          strokeWidth="1.5"
        />
      )}

      {/* Subtle Academic Assessment Paper Clip / Grid Notch */}
      <rect
        x="13.5"
        y="2"
        width="5"
        height="2"
        rx="1"
        fill={isLight ? "#CBD5E1" : isDark ? "#334155" : "#818CF8"}
        fillOpacity="0.8"
      />

      {/* Unified Bold Geometric "W" Monogram with Checkmark Finish */}
      <path
        d="M 6 11 L 11 23 L 16 13.5 L 21 23 L 26.5 9.5"
        stroke={isLight ? "#4F46E5" : "#FFFFFF"}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Radiant Golden Achievement Star / Academic Diamond */}
      <polygon
        points="26.5,3.5 27.5,5.5 29.5,6.5 27.5,7.5 26.5,9.5 25.5,7.5 23.5,6.5 25.5,5.5"
        fill="#FBBF24"
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
