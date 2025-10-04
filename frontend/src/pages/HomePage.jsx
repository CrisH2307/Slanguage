import React from "react";
import NavBar from "../components/NavBar";
import { motion } from "framer-motion";

const HomePage = () => {
  return (
    <div className="min-h-screen relative bg-gradient-to-b from-black via-gray-900 to-black text-white overflow-hidden">
      <NavBar />

      {/* Hero Section */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-2xl">
          {/* Animated heading */}
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl font-extrabold mb-6 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent"
          >
            Welcome to Slanguage
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-2xl mb-4 italic opacity-90"
          >
            Understand every culture. Speak every language.
          </motion.p>

          {/* Supporting text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-lg mb-8 opacity-80"
          >
            Break down language barriers and connect with people worldwide.
            Learn slang, idioms, and cultural expressions that make
            communication authentic.
          </motion.p>

          {/* Call-to-action button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-purple-500 to-pink-600 px-8 py-3 rounded-full font-semibold shadow-lg hover:opacity-90 transition"
          >
            Get Started
          </motion.button>
        </div>
      </div>

      {/* Floating background orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-pink-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
    </div>
  );
};

export default HomePage;
