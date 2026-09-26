// src/animations/BoardAnimations.js

export const boardContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Delay between each card flying in
      delayChildren: 0.1,    // Wait a moment before starting
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    transition: { duration: 0.2 } 
  }
};

export const cardEntry = {
  hidden: { 
    y: 50, 
    opacity: 0, 
    rotateX: -90 // Starts flipped backward in 3D space
  }, 
  show: { 
    y: 0, 
    opacity: 1, 
    rotateX: 0, // Flips to flat
    transition: { type: "spring", stiffness: 220, damping: 20 } 
  },
  tap: { scale: 0.95 },
  hover: { 
    scale: 1.02, 
    boxShadow: "0px 15px 25px rgba(0,0,0,0.5)",
    transition: { duration: 0.2 }
  }
};

// 👇 This is the specific part the error was looking for!
export const questionTextAnim = {
  hidden: { opacity: 0, y: -20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export const cardFlip = {
  hidden: { rotateY: 90, opacity: 0 },
  show: { rotateY: 0, opacity: 1, transition: { duration: 0.4 } },
  exit: { rotateY: -90, opacity: 0 }
};