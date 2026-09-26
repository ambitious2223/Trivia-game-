// src/animations/podiumAnimations.js

export const podiumItemAnim = (rank) => {
  // FIXED: Specific staggered delays for the suspenseful reveal
  // 3rd place at 0.5s, 2nd place at 1.5s, 1st place at 2.5s
  const delays = { 3: 0.5, 2: 1.5, 1: 2.5 };
  
  return {
    hidden: { opacity: 0, y: 150, scale: 0.8 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: delays[rank] || 0,
        type: "spring",
        stiffness: 120,
        damping: 14,
        mass: 1
      }
    }
  };
};