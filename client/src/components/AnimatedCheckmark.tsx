import { motion } from "framer-motion";

interface AnimatedCheckmarkProps {
  size?: number;
  className?: string;
}

export default function AnimatedCheckmark({
  size = 64,
  className = "",
}: AnimatedCheckmarkProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Subtle green glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="absolute rounded-full bg-emerald-500/10 blur-xl"
        style={{ width: size * 1.5, height: size * 1.5 }}
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        {/* Circle Path */}
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          stroke="#10b981"
          strokeWidth="6"
          strokeLinecap="round"
          fill="transparent"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {/* Checkmark Path */}
        <motion.path
          d="M30 52L45 67L70 35"
          stroke="#10b981"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}
