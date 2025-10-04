import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const UserProfile = ({ user = "User" }) => {
  const navigate = useNavigate();
  const [age, setAge] = useState("");

  const MIN_AGE = 18; // 👈 change this if you want a different restriction

  const handleSelect = (lang) => {
    const ageNum = parseInt(age, 10);

    if (!age || isNaN(ageNum) || ageNum <= 0) {
      alert("Please enter a valid positive age!");
      return;
    }

    if (ageNum < MIN_AGE) {
      alert(`Sorry, you must be at least ${MIN_AGE} years old to continue.`);
      return;
    }

    navigate(`/forum?lang=${lang}&age=${ageNum}`);
  };

  const langs = [
    { label: "Chinese", value: "chinese" },
    { label: "Toronto", value: "toronto" },
    { label: "Indian", value: "indian" },
  ];

  return (
    <div className="flex items-center justify-center min-h-screen bg-white px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-2xl shadow-xl border border-[#2983CC]/30 bg-white p-8 text-center">
          {/* Welcome */}
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-black mb-6"
          >
            Hey! {user}
          </motion.h1>

          {/* Prompt */}
          <p className="text-gray-600 mb-6">
            Please enter your age and select your Slanguage:
          </p>

          {/* Age input */}
          <input
            type="number"
            min="1"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Enter your age"
            className="mb-6 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2983CC]"
          />

          {/* Language options */}
          <div className="flex flex-col gap-4">
            {langs.map((lang) => (
              <motion.button
                key={lang.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                onClick={() => handleSelect(lang.value)}
                className="px-6 py-3 rounded-full bg-black text-white font-semibold hover:bg-[#2983CC] transition"
              >
                {lang.label}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserProfile;
