import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MessageSquare, LogOut, ChevronRight, ChevronLeft } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

const UserProfile = ({ user = "User" }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [age, setAge] = useState("");
  const [selectedLang, setSelectedLang] = useState(null);

  const MIN_AGE = 18;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/me", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        } else if (res.status === 401) {
          setProfile(null);
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };

    fetchProfile();
  }, []);

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

    setSelectedLang(lang);
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const logoutDirect = async (e) => {
    e.preventDefault();
    try {
      toast.success('Logged out successfully!');
      await wait(600);
      window.location.href = "http://localhost:3000/logout";
    } catch (error) {
      console.log(error);
    }
  };

  const langs = [
    { label: "Chinese", value: "chinese" },
    { label: "Toronto", value: "toronto" },
    { label: "Indian", value: "indian" },
  ];

  return (
    <div className="flex items-start justify-center min-h-screen bg-white px-6 pt-10">
      {/* Added pt-20 for top gap */}
      <Toaster />
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
            className="text-3xl font-bold text-black mb-6"
          >
            Hey!{" "}
            {profile?.name || profile?.nickname || profile?.given_name || user}
          </motion.h1>

          {/* Prompt */}
          <p className="text-gray-600 mb-6">
            {profile
              ? "Please enter your age and select your Slanguage:"
              : "You are not logged in. Log in to personalize your Slanguage experience, then enter your age and pick a Slanguage:"}
          </p>
          {/* Age input row */}
          <div className="flex justify-center items-center gap-3 mb-6">
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

          {/* Language Options */}
          <div className="flex flex-col items-center gap-3 mb-8 ">
            {langs.map((lang) => (
              <motion.div
                key={lang.value}
                whileHover={{ scale: 1.05 }}
                onClick={() => handleSelect(lang.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition 
                  ${
                    selectedLang === lang.value
                      ? "bg-[#2983CC] text-white"
                      : "bg-gray-100 text-black hover:bg-gray-200"
                  }`}
              >
                <MessageSquare size={18} />
                <span className="font-medium">{lang.label} Slang</span>
              </motion.div>
            ))}
          </div>

          {/* Buttons row: Logout (left) + Next (right) */}
          <div className="flex justify-between items-center mt-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logoutDirect}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md font-semibold hover:bg-[#2983CC] transition"
            >
              <ChevronLeft size={18} />
              Logout
            </motion.button>

            <motion.button
              whileHover={{ scale: selectedLang ? 1.05 : 1 }}
              whileTap={{ scale: selectedLang ? 0.95 : 1 }}
              disabled={!selectedLang}
              onClick={logoutDirect}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold transition 
                ${
                  selectedLang
                    ? "bg-black text-white hover:bg-[#2983CC]"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
            >
              Next <ChevronRight size={18} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserProfile;
