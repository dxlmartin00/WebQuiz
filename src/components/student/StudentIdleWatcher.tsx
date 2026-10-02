"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// 30 minutes idle timeout
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export default function StudentIdleWatcher() {
  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());
  const isTerminatedRef = useRef<boolean>(false);

  useEffect(() => {
    // Record user interaction timestamps
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const handleSessionTermination = (reason: "idle" | "duplicate") => {
      if (isTerminatedRef.current) return;
      isTerminatedRef.current = true;

      // Silently clear local cookie
      fetch("/api/student/logout", { method: "POST" }).catch(() => {});

      if (reason === "idle") {
        alert("Your session has expired due to 30 minutes of inactivity. Please log in again.");
      } else {
        alert("Your student account was accessed from another device or session. You have been signed out.");
      }

      router.push(`/student/login?reason=${reason}`);
    };

    // User activity listeners
    const activityEvents = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];
    activityEvents.forEach((ev) => {
      window.addEventListener(ev, updateActivity, { passive: true });
    });

    // 1. Periodic Idle Checker (Runs every 15 seconds)
    const idleCheckInterval = setInterval(() => {
      if (isTerminatedRef.current) return;

      const idleDuration = Date.now() - lastActivityRef.current;
      if (idleDuration >= IDLE_TIMEOUT_MS) {
        handleSessionTermination("idle");
      }
    }, 15000);

    // 2. Periodic Session Liveness & Duplication Heartbeat (Runs every 2 minutes)
    const heartbeatInterval = setInterval(async () => {
      if (isTerminatedRef.current) return;

      // Only ping if user was active recently (avoid keeping idle sessions alive)
      const idleDuration = Date.now() - lastActivityRef.current;
      if (idleDuration < IDLE_TIMEOUT_MS) {
        try {
          const res = await fetch("/api/student/heartbeat");
          if (res.status === 401) {
            handleSessionTermination("duplicate");
          }
        } catch {
          // Network errors ignored to prevent accidental logouts
        }
      }
    }, HEARTBEAT_INTERVAL_MS);

    // 3. Tab Visibility check: When user returns to tab after a long time
    const handleVisibilityChange = () => {
      if (!document.hidden && !isTerminatedRef.current) {
        const idleDuration = Date.now() - lastActivityRef.current;
        if (idleDuration >= IDLE_TIMEOUT_MS) {
          handleSessionTermination("idle");
        } else {
          // Immediately verify session validity when returning to tab
          fetch("/api/student/heartbeat").then((res) => {
            if (res.status === 401) {
              handleSessionTermination("duplicate");
            }
          }).catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, updateActivity);
      });
      clearInterval(idleCheckInterval);
      clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
