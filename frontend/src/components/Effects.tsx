import { motion } from "motion/react";
import { Zap, Flame, Wind, Moon } from "lucide-react";
import { cn } from "../lib/utils";
import { type StandAura } from "../types/jojo";

interface AuraEffectProps {
  type: StandAura;
  className?: string;
}

export const AuraEffect = ({ type, className }: AuraEffectProps) => {
  if (type === "none") return null;

  const effects = {
    electric: {
      color: "rgba(250, 204, 21, 0.4)",
      filter: "drop-shadow(0 0 15px #FACC15)",
      icon: Zap,
    },
    flame: {
      color: "rgba(219, 39, 119, 0.4)",
      filter: "drop-shadow(0 0 15px #DB2777)",
      icon: Flame,
    },
    shimmer: {
      color: "rgba(109, 40, 217, 0.4)",
      filter: "drop-shadow(0 0 15px #6D28D9)",
      icon: Wind,
    },
    darkness: {
      color: "rgba(31, 41, 55, 0.4)",
      filter: "drop-shadow(0 0 20px #000)",
      icon: Moon,
    },
  };

  const current = effects[type as keyof typeof effects] || effects.shimmer;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("absolute inset-0 pointer-events-none z-10", className)}
    >
      <div 
        className="absolute inset-0 opacity-40 animate-pulse"
        style={{
          boxShadow: `inset 0 0 100px ${current.color}`,
          filter: current.filter
        }}
      />
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: "100%", x: Math.random() * 100 + "%", opacity: 0 }}
            animate={{ 
              y: "-20%", 
              opacity: [0, 1, 0],
              scale: [1, 1.5, 0.8]
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
            className="absolute"
            style={{ color: current.color.replace("0.4", "1") }}
          >
            <current.icon size={24 + Math.random() * 24} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export const SoundEffectOverlay = ({ text, rotation = -15 }: { text: string; rotation?: number }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    whileHover={{ scale: 1.1, rotate: rotation + 5 }}
    className="absolute z-20 cursor-move"
    style={{ rotate: rotation }}
  >
    <div className="relative">
      <span className="font-comic text-6xl text-jojo-pink drop-shadow-[4px_4px_0_rgba(0,0,0,1)] uppercase tracking-tighter">
        {text}
      </span>
      <div className="absolute -inset-1 bg-white/20 blur-xl -z-10 rounded-full" />
    </div>
  </motion.div>
);
