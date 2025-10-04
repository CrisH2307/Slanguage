"use client";
import React, { useState } from "react";
import NavBar from "../components/NavBar";
import { motion } from "framer-motion";

const HomePage = () => {
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    setCursor({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className="min-h-screen relative bg-white text-black overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <NavBar />

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
            className="text-2xl mb-4 italic text-gray-700"
          >
            Understand every culture. Speak every language.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-lg mb-8 text-gray-600"
          >
            Break down language barriers and connect with people worldwide.
          </motion.p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-black text-white px-8 py-3 rounded-full font-semibold hover:bg-[#2983CC] transition"
          >
            Get Started
          </motion.button>
        </div>
      </div>

      {/* Cursor-follow glowing background */}
      <motion.div
        className="absolute w-96 h-96 bg-[#2983CC] rounded-full blur-3xl opacity-20 pointer-events-none"
        animate={{
          x: cursor.x - 192, // center glow on cursor
          y: cursor.y - 192,
        }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 30,
        }}
      />
    </div>
  );
};

export default HomePage;
