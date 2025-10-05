import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import NavBar from "../components/NavBar";

export default function Hero() {
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [showGlow, setShowGlow] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);

  // Track cursor movement
  useEffect(() => {
    const handleMouseMove = (e) => setCursor({ x: e.clientX, y: e.clientY });
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Delay the cursor glow
  useEffect(() => {
    const timer = setTimeout(() => setShowGlow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Letter images
  const baseLetters = [
    "/letters/arabic.png",
    "/letters/chinese.png",
    "/letters/japanese.png",
    "/letters/korean.png",
    "/letters/tagalog.png",
    "/letters/vietnamese.png",
  ];

  // Create many falling letters
  const letters = Array.from(
    { length: 40 },
    () => baseLetters[Math.floor(Math.random() * baseLetters.length)]
  );

  return (
    <div className="relative flex items-center justify-center h-screen px-6 md:px-8 overflow-hidden bg-white">
      <NavBar />

      {/* Falling Letters Animation */}
      {letters.map((src, index) => (
        <motion.img
          key={index}
          src={src}
          alt={`letter-${index}`}
          className="absolute w-12 md:w-20 top-[-150px] opacity-90"
          initial={{
            x: Math.random() * screenWidth, // random start position across screen
            y: -200,
            opacity: 0,
          }}
          animate={{
            y: [Math.random() * -200, screenHeight + 200],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 4, // varied fall speed
            delay: Math.random() * 3, // random start delay
            repeat: Infinity,
            ease: "easeIn",
          }}
        />
      ))}

      {/* Cursor-follow glowing background */}
      {showGlow && (
        <motion.div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <motion.div
            className="absolute w-80 md:w-96 h-80 md:h-96 bg-[#2983CC] rounded-full blur-3xl opacity-20"
            animate={{
              x: cursor.x - 192,
              y: cursor.y - 192,
            }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 30,
            }}
          />
        </motion.div>
      )}

      {/* Hero Section Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mt-20">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-8xl font-extrabold mb-6"
        >
          Welcome to <span className="text-[#2983CC]">Slanguage</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg md:text-2xl mb-4 italic text-gray-700"
        >
          Understand every culture. Speak every language.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-base md:text-lg mb-8 text-gray-600"
        >
          Break down language barriers and connect with people worldwide.
        </motion.p>
      </div>
    </div>
  );
}
