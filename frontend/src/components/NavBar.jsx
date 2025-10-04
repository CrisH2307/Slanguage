import React, { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const directLogin = async (e) => {
    e.preventDefault();
    console.log("login clicked")
    try {
      window.location.href = "http://localhost:4000/login";
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div className="w-full fixed top-0 left-0 z-20">
      <div className="backdrop-blur-md bg-black/60 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo with gradient text */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent"
          >
            Slanguage
          </motion.div>

          {/* Menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-md hover:bg-white/10 transition"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Slide-down menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 space-y-2 px-6"
          >
            <a href="login" className="block hover:text-pink-400"
            onClick={directLogin}>
              Login
            </a>
            <a href="#about" className="block hover:text-pink-400">
              About
            </a>
            <a href="#contact" className="block hover:text-pink-400">
              Contact
            </a>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NavBar;
