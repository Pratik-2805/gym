'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell } from 'lucide-react';

export default function TearLoader() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasPlayed = sessionStorage.getItem('fitflow_tear_loader_played');
      if (hasPlayed) {
        setLoading(false);
        return;
      }
    }

    // Prevent body scroll during load
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      setLoading(false);
      document.body.style.overflow = '';
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fitflow_tear_loader_played', 'true');
      }
    }, 1500); // Loader plays for 1.5s total

    return () => {
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, []);

  // Zigzag path coordinates for a realistic torn paper seam
  // ViewBox: 0 0 100 1000
  const leftTearPath = "M0,0 L70,30 L30,80 L80,130 L40,180 L90,230 L50,280 L85,330 L45,380 L80,430 L40,480 L90,530 L50,580 L80,630 L30,680 L75,730 L40,780 L85,830 L45,880 L90,930 L50,1000 L0,1000 Z";
  const rightTearPath = "M100,0 L70,30 L30,80 L80,130 L40,180 L90,230 L50,280 L85,330 L45,380 L80,430 L40,480 L90,530 L50,580 L80,630 L30,680 L75,730 L40,780 L85,830 L45,880 L90,930 L50,1000 L100,1000 Z";

  return (
    <AnimatePresence>
      {loading && (
        <div className="tear-loader-overlay">
          {/* LEFT PANEL */}
          <motion.div
            initial={{ x: 0 }}
            exit={{ 
              x: '-100%',
              transition: { duration: 0.95, ease: [0.76, 0, 0.24, 1], delay: 0.2 } 
            }}
            className="tear-loader-panel justify-end text-right pr-4"
          >
            {/* Torn Edge overlay SVG */}
            <svg 
              className="tear-edge-left" 
              viewBox="0 0 100 1000" 
              preserveAspectRatio="none"
            >
              <path d={leftTearPath} />
            </svg>

            {/* Left Brand Text (Splits on reveal) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50, transition: { duration: 0.5 } }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex items-center gap-2 select-none"
            >
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white border-2 border-indigo-400">
                <Dumbbell className="h-6 w-6" />
              </div>
              <span className="text-3xl font-extrabold tracking-tight text-white">
                Fit
              </span>
            </motion.div>
          </motion.div>

          {/* CENTRAL GLOW SEAM */}
          <motion.div 
            initial={{ scaleY: 0, opacity: 0.5 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ 
              scaleY: 0, 
              opacity: 0,
              transition: { duration: 0.8, ease: 'easeInOut' }
            }}
            className="tear-divider-glow left-1/2 -translate-x-1/2" 
          />

          {/* RIGHT PANEL */}
          <motion.div
            initial={{ x: 0 }}
            exit={{ 
              x: '100%',
              transition: { duration: 0.95, ease: [0.76, 0, 0.24, 1], delay: 0.2 } 
            }}
            className="tear-loader-panel justify-start pl-4"
          >
            {/* Torn Edge overlay SVG */}
            <svg 
              className="tear-edge-right" 
              viewBox="0 0 100 1000" 
              preserveAspectRatio="none"
            >
              <path d={rightTearPath} />
            </svg>

            {/* Right Brand Text (Splits on reveal) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 50, transition: { duration: 0.5 } }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="select-none"
            >
              <span className="text-3xl font-extrabold tracking-tight text-indigo-400">
                Flow
              </span>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
