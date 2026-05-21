import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 5000),
      setTimeout(() => setPhase(4), 9000),
      setTimeout(() => setPhase(5), 13000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-light)]"
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: "0%" }}
      exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      
      <motion.h2 
        className="text-[4vw] font-bold text-[var(--color-secondary)] mb-12 tracking-tight"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      >
        Everything you need.
      </motion.h2>

      <div className="relative w-[80vw] h-[50vh] flex items-center justify-center">
        
        {/* Feature A: Stage Tracker */}
        <motion.div 
          className="absolute inset-0 bg-white rounded-3xl shadow-xl border border-[var(--color-bg-muted)] p-12 flex flex-col justify-center"
          initial={{ opacity: 0, x: 100, rotateY: -10 }}
          animate={{ 
            opacity: phase >= 2 && phase < 3 ? 1 : 0, 
            x: phase >= 2 && phase < 3 ? 0 : phase >= 3 ? -100 : 100,
            scale: phase >= 2 && phase < 3 ? 1 : 0.9 
          }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          style={{ pointerEvents: phase >= 2 && phase < 3 ? 'auto' : 'none' }}
        >
          <div className="text-[var(--color-primary)] font-bold text-xl mb-8 uppercase tracking-widest">STAGE TRACKER</div>
          
          <div className="relative h-2 bg-gray-100 rounded-full mt-10 w-full">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-[var(--color-success)] rounded-full"
              initial={{ width: "0%" }}
              animate={phase >= 2 ? { width: "66%" } : { width: "0%" }}
              transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
            />
            
            {/* Dots */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-6 h-6 bg-[var(--color-success)] rounded-full border-4 border-white shadow"></div>
            <div className="absolute top-1/2 -translate-y-1/2 left-[33%] w-6 h-6 bg-[var(--color-success)] rounded-full border-4 border-white shadow"></div>
            <div className="absolute top-1/2 -translate-y-1/2 left-[66%] w-8 h-8 bg-[var(--color-success)] rounded-full border-4 border-white shadow flex items-center justify-center">
              <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-0 w-6 h-6 bg-gray-200 rounded-full border-4 border-white shadow"></div>

            {/* Labels */}
            <div className="absolute top-8 left-0 -translate-x-1/2 text-gray-500 font-medium">Quote</div>
            <div className="absolute top-8 left-[33%] -translate-x-1/2 text-gray-500 font-medium">Sample</div>
            <div className="absolute top-8 left-[66%] -translate-x-1/2 text-[var(--color-success)] font-bold">Production</div>
            <div className="absolute top-8 right-0 translate-x-1/2 text-gray-400 font-medium">Ex-Factory</div>
          </div>
        </motion.div>

        {/* Feature B: AI Reply */}
        <motion.div 
          className="absolute inset-0 bg-[var(--color-bg-dark)] rounded-3xl shadow-2xl p-12 flex flex-col justify-center overflow-hidden"
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ 
            opacity: phase >= 3 && phase < 4 ? 1 : 0, 
            x: phase >= 3 && phase < 4 ? 0 : phase >= 4 ? -100 : 100,
            scale: phase >= 3 && phase < 4 ? 1 : 0.9 
          }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          style={{ pointerEvents: phase >= 3 && phase < 4 ? 'auto' : 'none' }}
        >
          <div className="text-[var(--color-primary)] font-bold text-xl mb-8 uppercase tracking-widest relative z-10">AI CO-PILOT</div>
          
          <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl rounded-bl-none p-6 self-start w-3/4 text-white">
              Supplier: "Materials delayed by 4 days. Can we push ex-factory date?"
            </div>
            
            <motion.div 
              className="bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/50 backdrop-blur-md rounded-2xl rounded-br-none p-6 self-end w-3/4 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="absolute -top-3 right-4 bg-[var(--color-primary)] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                AI Draft
              </div>
              <div className="text-[var(--color-primary-light)] text-white/90">
                "We can accept a 4-day delay, but penalty clause in section 3.2 of the PO will apply if delayed further. Please confirm revised date."
              </div>
              <div className="mt-4 flex gap-3">
                <div className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-bold w-max">Send Draft</div>
                <div className="bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium w-max">Edit</div>
              </div>
            </motion.div>
          </div>
          
          {/* AI glow effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-primary)]/10 rounded-full blur-[100px] pointer-events-none"></div>
        </motion.div>

        {/* Feature C: Payments */}
        <motion.div 
          className="absolute inset-0 bg-white rounded-3xl shadow-xl border border-[var(--color-bg-muted)] p-12 flex flex-col justify-center"
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ 
            opacity: phase >= 4 ? 1 : 0, 
            x: phase >= 4 ? 0 : 100,
            scale: phase >= 4 ? 1 : 0.9 
          }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          style={{ pointerEvents: phase >= 4 ? 'auto' : 'none' }}
        >
          <div className="text-[var(--color-primary)] font-bold text-xl mb-12 uppercase tracking-widest text-center">PAYMENT ORCHESTRATION</div>
          
          <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
            <h3 className="text-4xl font-bold text-[var(--color-secondary)] mb-2">$142,500.00</h3>
            <p className="text-gray-500 mb-12 font-medium">Total PO Value</p>
            
            <div className="w-full h-16 bg-gray-100 rounded-2xl flex overflow-hidden shadow-inner relative">
              <motion.div 
                className="h-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold"
                initial={{ width: "0%" }}
                animate={phase >= 4 ? { width: "30%" } : { width: "0%" }}
                transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
              >
                30% Paid
              </motion.div>
              <div className="h-full flex-1 flex items-center justify-center text-gray-500 font-bold">
                70% Pending Balance
              </div>
            </div>
            
            <div className="w-full flex justify-between mt-6 px-4">
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">Deposit</span>
                <span className="text-lg font-bold text-[var(--color-secondary)]">$42,750.00</span>
                <span className="text-sm text-[var(--color-success)] flex items-center gap-1 mt-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Cleared
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm text-gray-500 font-bold uppercase tracking-wider">Balance due</span>
                <span className="text-lg font-bold text-[var(--color-secondary)]">$99,750.00</span>
                <span className="text-sm text-[var(--color-warning)] mt-1 font-medium">Due upon BOL</span>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}