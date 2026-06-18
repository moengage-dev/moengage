"use client";

import React, { useRef, useState, useEffect } from "react";

interface OverflowScrollTextProps {
  children: React.ReactNode;
  className?: string;
}

export function OverflowScrollText({ children, className = "" }: OverflowScrollTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [distance, setDistance] = useState(0);

  const stateRef = useRef({ shouldAnimate, distance });
  useEffect(() => {
    stateRef.current = { shouldAnimate, distance };
  }, [shouldAnimate, distance]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let resetTimeout: NodeJS.Timeout;

    const handleMouseEnterOrFocus = () => {
      // Touch/mobile behavior should be unchanged. Hover doesn't reliably exist on touch,
      // but if focus happens we might still scroll. The prompt says "Mobile/touch behavior must remain unchanged."
      // Since hover/focus scroll is purely visual, it shouldn't hurt, but we can prevent it if primary input is touch.
      // matchMedia("(hover: hover)") is a good way to check if device supports hover.
      const hoverQuery = window.matchMedia("(hover: hover)");
      if (!hoverQuery.matches) return;

      if (mediaQuery.matches) return;
      if (!containerRef.current || !textRef.current) return;
      
      const sw = textRef.current.scrollWidth;
      const cw = containerRef.current.clientWidth;
      
      if (sw > cw) {
        setDistance(sw - cw);
        setShouldAnimate(true);
        setIsResetting(false);
        clearTimeout(resetTimeout);
      }
    };

    const handleMouseLeaveOrBlur = () => {
      if (stateRef.current.shouldAnimate) {
        setShouldAnimate(false);
        setIsResetting(true);
        resetTimeout = setTimeout(() => {
          setIsResetting(false);
          setDistance(0);
        }, 300); // matches the ease-out duration
      }
    };

    // Attach listeners to the closest interactive element (link or button)
    const parent = container.closest('a') || container.closest('button') || container;

    parent.addEventListener("mouseenter", handleMouseEnterOrFocus);
    parent.addEventListener("mouseleave", handleMouseLeaveOrBlur);
    parent.addEventListener("focus", handleMouseEnterOrFocus);
    parent.addEventListener("blur", handleMouseLeaveOrBlur);

    return () => {
      parent.removeEventListener("mouseenter", handleMouseEnterOrFocus);
      parent.removeEventListener("mouseleave", handleMouseLeaveOrBlur);
      parent.removeEventListener("focus", handleMouseEnterOrFocus);
      parent.removeEventListener("blur", handleMouseLeaveOrBlur);
      clearTimeout(resetTimeout);
    };
  }, []);

  const activeState = shouldAnimate || isResetting;

  return (
    <div ref={containerRef} className={`relative overflow-hidden w-full ${className}`}>
      <span
        ref={textRef}
        className="block whitespace-nowrap"
        style={{
          textOverflow: activeState ? 'clip' : 'ellipsis',
          overflow: activeState ? 'visible' : 'hidden',
          width: activeState ? 'max-content' : '100%',
          transform: shouldAnimate ? `translateX(-${distance}px)` : 'translateX(0)',
          // 25ms per pixel translates to 40px per second, a good reading speed
          // plus a small delay before starting
          transition: shouldAnimate 
            ? `transform ${Math.max(distance * 25, 300)}ms linear 150ms` 
            : 'transform 300ms ease-out',
        }}
      >
        {children}
      </span>
    </div>
  );
}
