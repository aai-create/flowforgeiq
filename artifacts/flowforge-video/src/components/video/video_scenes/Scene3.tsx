import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 5000),
      setTimeout(() => setPhase(5), 7000),
      setTimeout(() => setPhase(6), 13000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ clipPath: 'inset(100% 0 0 0)' }}
      animate={{ clipPath: 'inset(0% 0 0 0)' }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }} // smooth wipe
    >
      <div className="absolute inset-0 bg-white"></div>
      
      {/* Huge FlowForge Reveal */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
        animate={phase >= 2 ? { y: "-40vh", scale: 0.5 } : { y: 0, scale: 1 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div 
          className="flex items-center gap-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Logo shape */}
          <div className="w-20 h-20 bg-[var(--color-primary)] rounded-2xl shadow-[0_0_40px_rgba(144,0,255,0.4)] flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h1 className="text-[6vw] font-black tracking-tight text-[var(--color-secondary)] leading-none" style={{ fontFamily: 'var(--font-display)' }}>
            FlowForge
          </h1>
        </motion.div>
      </motion.div>

      {/* Unified Inbox UI Mockup */}
      {phase >= 2 && (
        <motion.div 
          className="w-[85vw] h-[75vh] bg-[var(--color-bg-dark)] rounded-2xl shadow-2xl border border-[var(--color-secondary)]/20 overflow-hidden mt-[10vh] flex flex-col relative"
          initial={{ opacity: 0, y: 100, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.5 }}
        >
          {/* Top nav */}
          <div className="h-16 border-b border-white/10 flex items-center px-6 gap-6 bg-white/5">
            <div className="w-32 h-6 bg-white/10 rounded"></div>
            <div className="w-48 h-6 bg-white/5 rounded"></div>
            <div className="ml-auto flex gap-4">
              <div className="w-8 h-8 bg-white/10 rounded-full"></div>
              <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full"></div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-[20%] border-r border-white/10 p-4 flex flex-col gap-2">
              <div className="h-10 rounded-lg bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center px-4">
                <div className="w-4 h-4 rounded bg-[var(--color-primary)] mr-3"></div>
                <div className="w-24 h-3 bg-white/80 rounded"></div>
              </div>
              <div className="h-10 rounded-lg hover:bg-white/5 flex items-center px-4 mt-2">
                <div className="w-4 h-4 rounded bg-white/20 mr-3"></div>
                <div className="w-20 h-3 bg-white/40 rounded"></div>
              </div>
              <div className="h-10 rounded-lg hover:bg-white/5 flex items-center px-4">
                <div className="w-4 h-4 rounded bg-white/20 mr-3"></div>
                <div className="w-28 h-3 bg-white/40 rounded"></div>
              </div>
            </div>

            {/* Main content - Message Thread */}
            <div className="flex-1 p-8 flex flex-col gap-6 relative">
              <motion.div 
                className="w-full flex gap-4 items-end"
                initial={{ opacity: 0, x: -20 }}
                animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex-shrink-0 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl rounded-bl-none max-w-[70%]">
                  <div className="w-48 h-3 bg-white/60 rounded mb-2"></div>
                  <div className="w-32 h-3 bg-white/40 rounded"></div>
                </div>
              </motion.div>

              <motion.div 
                className="w-full flex gap-4 items-end"
                initial={{ opacity: 0, x: -20 }}
                animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex-shrink-0 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl rounded-bl-none max-w-[70%]">
                  <div className="flex gap-3 items-center border border-white/10 p-3 rounded-xl bg-white/5 mb-3">
                    <div className="w-8 h-8 rounded bg-red-500/20 flex items-center justify-center text-red-500 font-bold text-xs">PDF</div>
                    <div>
                      <div className="w-32 h-3 bg-white/80 rounded mb-1"></div>
                      <div className="w-16 h-2 bg-white/40 rounded"></div>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-white/60 rounded mb-2"></div>
                  <div className="w-3/4 h-3 bg-white/40 rounded"></div>
                </div>
              </motion.div>

              <motion.div 
                className="w-full flex gap-4 items-end justify-end mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, type: "spring" }}
              >
                <div className="bg-[var(--color-primary)] p-4 rounded-2xl rounded-br-none max-w-[70%]">
                  <div className="w-56 h-3 bg-white/90 rounded mb-2"></div>
                  <div className="w-40 h-3 bg-white/80 rounded"></div>
                </div>
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/50 flex-shrink-0 border-2 border-[var(--color-primary)]"></div>
              </motion.div>
            </div>
          </div>
          
          {/* Unified overlay label */}
          <motion.div 
            className="absolute bottom-10 right-10 bg-white text-[var(--color-secondary)] px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3"
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={phase >= 5 ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.8, x: 20 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            <span className="w-3 h-3 rounded-full bg-[var(--color-success)] animate-pulse"></span>
            A Clean Unified Inbox
          </motion.div>

        </motion.div>
      )}
    </motion.div>
  );
}