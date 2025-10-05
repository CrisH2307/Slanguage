import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  MessageSquare,
  LogOut,
  PlusCircle,
  UserCircle,
} from "lucide-react";

const Forums = () => {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState("forums");
  const [threads, setThreads] = useState([]);
  const [newThread, setNewThread] = useState("");

  // 🔹 Get user's selected forum/language
  useEffect(() => {
    const savedLang = localStorage.getItem("selectedSlanguage");
    if (savedLang) setSelectedLanguage(savedLang);
  }, []);

  // 🔹 Fetch threads from backend
  useEffect(() => {
    const getThreads = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/getthreads", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const data = await res.json();
        setThreads(data);
      } catch (error) {
        console.error("Error fetching threads:", error);
      }
    };
    getThreads();
  }, []);

  // 🔹 Create new thread
  const submitThread = async () => {
    if (!newThread.trim()) return;

    try {
      const res = await fetch("http://localhost:3000/api/createthreads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: newThread }),
      });
      const data = await res.json();
      console.log("Posted:", data);
      setNewThread("");
      window.location.reload(); // refresh to show new thread
    } catch (error) {
      console.error("Error creating thread:", error);
    }
  };

  // 🔹 Navigate helpers
  const navigateToThread = (threadId) => navigate(`/forums/${threadId}`);
  const goToForums = () => {
    if (selectedLanguage) navigate(`/forums/${selectedLanguage}`);
    else navigate("/forums");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-black">
      {/* ===== Left Sidebar ===== */}
      <aside className="md:w-1/4 w-full bg-gray-50 p-6 flex flex-col gap-6">
        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-md border border-[#2983CC]/30 p-6 flex flex-col items-center text-center">
          <UserCircle size={64} className="text-[#2983CC] mb-3" />
          <h2 className="text-lg font-semibold">Hey, User!</h2>
          <p className="text-sm text-gray-500">Welcome to Slanguage Forums</p>
        </div>

        {/* Navigation Card */}
        <div className="bg-white rounded-2xl shadow-md border border-[#2983CC]/30 p-6 flex flex-col gap-5">
          <h2 className="text-lg font-semibold mb-2 text-[#2983CC]">
            Quick Links
          </h2>
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 hover:text-[#2983CC] transition"
          >
            <User size={18} /> Profile
          </button>

          <button
            onClick={() => {
              window.location.href = "http://localhost:3000/logout";
            }}
            className="flex items-center gap-2 text-red-500 hover:text-red-600 transition"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* ===== Center Content (Threads) ===== */}
      <main className="md:w-3/4 w-full p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#2983CC]">
          {selectedLanguage
            ? `${
                selectedLanguage.charAt(0).toUpperCase() +
                selectedLanguage.slice(1)
              } `
            : "Forum Threads"}
        </h1>

        {/* Threads */}
        {threads.length > 0 ? (
          threads.map((item) => (
            <div
              key={item._id}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6 hover:shadow-md transition"
            >
              <h2 className="font-bold text-xl mb-1">
                {item.title || "Untitled Thread"}
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                by {item.user || "Anonymous"}
              </p>

              <div className="space-y-2">
                {item.comments?.slice(0, 2).map((comment, cIndex) => (
                  <div key={cIndex} className="border-t border-gray-200 pt-2">
                    <p className="text-gray-800">{comment.text}</p>
                    <p className="text-xs text-gray-500">by {comment.user}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigateToThread(item._id)}
                className="mt-4 flex items-center gap-2 text-[#2983CC] hover:underline font-medium"
              >
                <MessageSquare size={16} /> See Thread
              </button>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">
            No threads yet. Be the first to post!
          </p>
        )}

        {/* ===== Create New Thread ===== */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PlusCircle size={20} className="text-[#2983CC]" /> Create New
            Thread
          </h2>
          <input
            type="text"
            value={newThread}
            onChange={(e) => setNewThread(e.target.value)}
            placeholder="Enter your thread title..."
            className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#2983CC]"
          />
          <button
            onClick={submitThread}
            className="mt-4 bg-[#2983CC] text-white px-4 py-2 rounded-lg font-semibold hover:bg-black transition"
          >
            Post Thread
          </button>
        </div>
      </main>
    </div>
  );
};

export default Forums;
