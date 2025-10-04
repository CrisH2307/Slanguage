import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "../components/NavBar";

export default function Hero() {
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    setCursor({ x: e.clientX, y: e.clientY });
  };
  useEffect(() => {
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      className="min-h-screen relative bg-white text-black overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <Navbar />

      {/* Hero Section */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl font-extrabold mb-6"
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
    </div>
  );
}
