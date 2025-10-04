import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogOut, MessageSquare, ChevronRight } from "lucide-react"; // <-- Added ChevronRight

const UserProfile = ({ user = "User" }) => {
  const navigate = useNavigate();
  const [age, setAge] = useState("");

  const MIN_AGE = 18;

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
        <div className="rounded-2xl shadow-xl border border-[#2983CC]/30 bg-white p-8 text-center">
          {/* Welcome */}
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-black mb-4"
          >
            Hey! {user}
          </motion.h1>

          {/* Age input row */}
          <div className="flex items-center gap-3 mb-6">
            <p className="text-gray-600">Please enter your age:</p>
            <input
              type="number"
              min="1"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age"
              className="w-24 px-3 py-1 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-[#2983CC]"
            />
          </div>
          <p className="text-gray-600 mb-4">Select your Slanguage:</p>
          {/* Forum Links (text + icon) */}
          <div className="flex flex-col items-start gap-3 text-left mb-6">
            {langs.map((lang) => (
              <motion.div
                key={lang.value}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelect(lang.value)}
                className="flex items-center gap-2 text-black cursor-pointer hover:text-[#2983CC] transition"
              >
                <MessageSquare size={18} />
                <span className="font-medium">{lang.label} Slang</span>
              </motion.div>
            ))}
          </div>
          {/* Next button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md font-semibold hover:bg-[#2983CC] transition"
            onClick={() => navigate("/")}
          >
            <ChevronRight size={18} />
            Next
          </motion.button>
        </div>
        {/* Logout button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md font-semibold hover:bg-[#2983CC] transition mt-4"
          onClick={() => navigate("/")}
        >
          <LogOut size={18} />
          Logout
        </motion.button>
      </motion.div>
    </div>
  );
};

export default UserProfile;
