import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 4000),
      setTimeout(() => setPhase(4), 6000),
      setTimeout(() => setPhase(5), 8500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const items = [
    { text: "Port delay??", type: "whatsapp", rotate: -12, x: "-30vw", y: "-20vh", delay: 0.2 },
    { text: "Where's my PO?", type: "email", rotate: 8, x: "20vw", y: "30vh", delay: 0.5 },
    { text: "Updated costing v7_FINAL", type: "spreadsheet", rotate: -5, x: "35vw", y: "-15vh", delay: 1.2 },
    { text: "Invoice_revised.pdf", type: "pdf", rotate: 15, x: "-25vw", y: "25vh", delay: 2.1 },
    { text: "Customs hold up", type: "email", rotate: -8, x: "5vw", y: "-35vh", delay: 3.5 },
    { text: "Need approval ASAP", type: "whatsapp", rotate: 12, x: "-10vw", y: "40vh", delay: 4.2 },
    { text: "Factory issues", type: "email", rotate: 20, x: "40vw", y: "10vh", delay: 5.0 },
    { text: "Shipping schedule.xls", type: "spreadsheet", rotate: -15, x: "-40vw", y: "5vh", delay: 5.5 },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>

      {items.map((item, i) => (
        <motion.div
          key={i}
          className="absolute bg-white px-6 py-4 rounded-xl shadow-xl border border-gray-200 flex items-center gap-3 z-10"
          initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
          animate={phase >= 1 ? { 
            opacity: 1, 
            scale: 1, 
            x: item.x, 
            y: item.y, 
            rotate: item.rotate 
          } : {}}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 20, 
            delay: item.delay,
            mass: 0.8
          }}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            item.type === 'whatsapp' ? 'bg-green-100 text-green-600' :
            item.type === 'email' ? 'bg-blue-100 text-blue-600' :
            item.type === 'spreadsheet' ? 'bg-green-100 text-green-600' :
            'bg-red-100 text-red-600'
          }`}>
            {/* SVG icons */}
            {item.type === 'whatsapp' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>}
            {item.type === 'email' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
            {item.type === 'spreadsheet' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
            {item.type === 'pdf' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13l-2 2 2 2M14 13l2 2-2 2"/></svg>}
          </div>
          <span className="font-medium text-lg text-gray-800">{item.text}</span>
        </motion.div>
      ))}

      {/* Deep overlay as chaos increases */}
      <motion.div 
        className="absolute inset-0 bg-red-900/10 mix-blend-multiply z-20 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 3 ? 0.6 : 0 }}
        transition={{ duration: 3 }}
      />

      <div className="z-30 text-center">
        <motion.h1 
          className="text-[8vw] font-black tracking-tighter text-gray-900 leading-none drop-shadow-2xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {'CHAOS'.split('').map((char, i) => (
            <motion.span key={i} style={{ display: 'inline-block' }}
              initial={{ opacity: 0, y: 100, rotateX: -90 }}
              animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 100, rotateX: -90 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: phase >= 2 ? 1.5 + (i * 0.1) : 0 }}>
              {char}
            </motion.span>
          ))}
        </motion.h1>
      </div>
      
      {/* Blurry motion objects to simulate burying */}
      {phase >= 4 && (
        <motion.div 
          className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
        >
          <motion.div className="bg-white/80 p-8 rounded-2xl shadow-2xl"
            initial={{ scale: 2, opacity: 0, y: -200 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
          >
            <h2 className="text-3xl font-bold text-red-600 mb-2">SYSTEM OVERLOAD</h2>
            <div className="h-2 w-full bg-gray-200 rounded overflow-hidden">
              <motion.div className="h-full bg-red-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5 }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}