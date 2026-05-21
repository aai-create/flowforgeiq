import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 4500),
      setTimeout(() => setPhase(4), 7000),
      setTimeout(() => setPhase(5), 9500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ scale: 1.2, opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* We utilize the dark background image globally, but overlay specific elements here */}
      
      <div className="relative w-[70vw] h-[60vh] flex flex-col items-center">
        <motion.h2 
          className="text-[4vw] font-bold text-white mb-12 tracking-tight text-center"
          initial={{ opacity: 0, y: -30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          The Cost of Chaos
        </motion.h2>

        <div className="w-full flex justify-between gap-8 relative z-10">
          
          {/* Pain Point 1: Overdue Payment */}
          <motion.div 
            className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden"
            initial={{ opacity: 0, y: 40, rotateY: 30 }}
            animate={phase >= 2 ? { opacity: 1, y: 0, rotateY: 0 } : { opacity: 0, y: 40, rotateY: 30 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <motion.div 
                className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
              >
                OVERDUE
              </motion.div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Invoice #INV-2049</h3>
            <p className="text-gray-400">Payment missed. Shipment delayed.</p>
          </motion.div>

          {/* Pain Point 2: Stuck Shipment */}
          <motion.div 
            className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden"
            initial={{ opacity: 0, y: 40, rotateY: 30 }}
            animate={phase >= 3 ? { opacity: 1, y: 0, rotateY: 0 } : { opacity: 0, y: 40, rotateY: 30 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <div className="bg-amber-500/20 text-amber-500 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
                STUCK
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">PO #8841-A</h3>
            <p className="text-gray-400">14 days in "Production". No update.</p>
          </motion.div>

          {/* Pain Point 3: Message Thread */}
          <motion.div 
            className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 relative overflow-hidden"
            initial={{ opacity: 0, y: 40, rotateY: 30 }}
            animate={phase >= 4 ? { opacity: 1, y: 0, rotateY: 0 } : { opacity: 0, y: 40, rotateY: 30 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-gray-500 border border-gray-800"></div>
                <div className="w-6 h-6 rounded-full bg-gray-600 border border-gray-800"></div>
                <div className="w-6 h-6 rounded-full bg-gray-700 border border-gray-800 flex items-center justify-center text-[8px] text-white">+4</div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Thread: "Specs?"</h3>
            <p className="text-gray-400">47 messages deep. Truth is lost.</p>
          </motion.div>

        </div>

        {/* Aggregated conclusion */}
        {phase >= 5 && (
          <motion.div 
            className="absolute bottom-[-10vh] left-0 right-0 text-center"
            initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <div className="inline-block px-8 py-3 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-medium text-lg backdrop-blur-sm">
              Missed Deadlines. Payment Confusion. No Single View.
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}