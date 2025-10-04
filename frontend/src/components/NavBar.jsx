"use client";
import React from "react";
import { motion } from "framer-motion";

const NavBar = () => {
  const directLogin = async (e) => {
    e.preventDefault();
    console.log("login clicked");
    try {
      window.location.href = "http://localhost:4000/login";
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="w-full fixed top-0 left-0 z-20">
      <div className="backdrop-blur-md bg-white text-black p-4 shadow-lg border-b border-[#2983CC]/30">
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-extrabold tracking-wide"
          >
            <a href="/">
              Slanguage
            </a>
          </motion.div>

          {/* Login Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={directLogin}
            className="px-6 py-2 rounded-full font-semibold text-white bg-[#2983CC] hover:bg-black transition"
          >
            Login
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default NavBar;
