import { useEffect, useState } from "react";
import { motion, useSpring } from "motion/react";

export function CursorGlow() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Smooth springs for the cursor
  const cursorX = useSpring(0, { stiffness: 500, damping: 28, mass: 0.5 });
  const cursorY = useSpring(0, { stiffness: 500, damping: 28, mass: 0.5 });
  const ringX = useSpring(0, { stiffness: 250, damping: 20, mass: 0.8 });
  const ringY = useSpring(0, { stiffness: 250, damping: 20, mass: 0.8 });

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      cursorX.set(e.clientX - 8);
      cursorY.set(e.clientY - 8);
      ringX.set(e.clientX - 16);
      ringY.set(e.clientY - 16);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName?.toLowerCase() === "a" ||
        target.tagName?.toLowerCase() === "button" ||
        target.closest("a") ||
        target.closest("button")
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", updateMousePosition);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, [cursorX, cursorY, ringX, ringY]);

  // Only show custom cursor on desktop
  if (typeof window !== "undefined" && window.innerWidth < 768) return null;

  return (
    <div className="hidden md:block">
      {/* Ambient background glow */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        animate={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(228, 255, 0, 0.05), transparent 40%)`,
        }}
      />
      
      {/* Solid inner dot */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[100] w-4 h-4 bg-primary mix-blend-difference clip-path-zentry"
        style={{ x: cursorX, y: cursorY }}
        animate={{
          scale: isHovering ? 3 : 1,
          opacity: isHovering ? 0.8 : 1,
          rotate: isHovering ? 45 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />
      
      {/* Outer trailing ring */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[100] w-8 h-8 border border-primary/50 mix-blend-difference clip-path-zentry"
        style={{ x: ringX, y: ringY }}
        animate={{
          scale: isHovering ? 1.5 : 1,
          opacity: isHovering ? 0 : 1,
          rotate: isHovering ? -45 : 0,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      />
    </div>
  );
}
