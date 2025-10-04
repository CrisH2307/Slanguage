import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "../components/NavBar";

export default function Hero() {
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setCursor({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative flex items-center justify-center h-screen px-6 md:px-8 overflow-hidden">
      <Navbar />
      {/* Cursor-follow glowing background */}
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

      {/* Hero Section Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl font-extrabold mb-6"
        >
          Welcome to Slanguage
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

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-black text-white px-6 md:px-8 py-3 rounded-full font-semibold hover:bg-[#2983CC] transition"
        >
          Get Started
        </motion.button>
      </div>
    </div>
  );
}
