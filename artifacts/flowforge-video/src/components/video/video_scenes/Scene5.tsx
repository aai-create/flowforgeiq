import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 5000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-dark)]"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle animated grid background */}
        <motion.div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            perspective: '1000px'
          }}
          animate={{
            transform: ['translateY(0px)', 'translateY(40px)'],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-[var(--color-primary)]/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="z-10 flex flex-col items-center">
        
        <div className="flex gap-4 mb-16 overflow-hidden">
          <motion.h2 
            className="text-[3.5vw] font-bold text-white tracking-tight"
            initial={{ opacity: 0, y: 50 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            One inbox.
          </motion.h2>
          
          <motion.h2 
            className="text-[3.5vw] font-bold text-white tracking-tight"
            initial={{ opacity: 0, y: 50 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            Every shipment.
          </motion.h2>
          
          <motion.h2 
            className="text-[3.5vw] font-bold text-[var(--color-primary)] tracking-tight"
            initial={{ opacity: 0, y: 50 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            Total control.
          </motion.h2>
        </div>

        <motion.div 
          className="flex items-center gap-6"
          initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
          animate={phase >= 4 ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.8, filter: "blur(10px)" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          {/* Final Logo */}
          <div className="w-24 h-24 bg-[var(--color-primary)] rounded-3xl shadow-[0_0_60px_rgba(144,0,255,0.6)] flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h1 className="text-[7vw] font-black tracking-tighter text-white leading-none" style={{ fontFamily: 'var(--font-display)' }}>
            FlowForge
          </h1>
        </motion.div>
        
      </div>
    </motion.div>
  );
}