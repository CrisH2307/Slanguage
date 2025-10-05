import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User,
  MessageSquare,
  LogOut,
  ArrowLeftCircle,
  UserCircle,
} from "lucide-react";

const API = import.meta?.env?.VITE_API || "http://localhost:3000";

// ---- Viewer Info ----
function getViewer() {
  return {
    displayName: localStorage.getItem("displayName") || "Anon",
    generation: localStorage.getItem("generation") || "millennial",
    regionPref: localStorage.getItem("regionPref") || "global",
  };
}

// ---- Translation Helper ----
async function translateText(text, { generation, regionPref }) {
  const res = await fetch(`${API}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      audience: generation,
      context: "chat",
      regionPref,
    }),
  });
  if (!res.ok) throw new Error("translate failed");
  return res.json();
}

// ---- Translation Display ----
function TranslationBox({ tr }) {
  if (!tr) {
    return (
      <p className="border border-gray-300 p-3 mb-4 mt-2 text-gray-400 italic rounded-lg">
        Translating…
      </p>
    );
  }
  return (
    <div className="border border-gray-200 p-4 mb-4 mt-2 rounded-xl bg-white shadow-sm">
      <div className="font-semibold text-[#2983CC]">{tr.plain}</div>
      <div className="mt-2 text-gray-700">{tr.audienceRewrite}</div>
      {tr.detected?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {tr.detected.map((d, i) => (
            <span
              key={i}
              className="text-xs border border-gray-300 px-2 py-1 rounded-full text-gray-600"
            >
              {d.phrase}
            </span>
          ))}
        </div>
      )}
      {tr.safety?.sensitive && (
        <p className="mt-2 text-xs text-red-500 font-medium">⚠ Sensitive</p>
      )}
    </div>
  );
}

// ---- Main Thread Component ----
const Thread = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [thread, setThread] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewer] = useState(getViewer());
  const [titleTr, setTitleTr] = useState(null);
  const [commentTr, setCommentTr] = useState([]);

  // ---- Fetch Thread ----
  useEffect(() => {
    let abort = false;
    async function fetchThread() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/getthreads/${id}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`Failed to load thread: ${res.status}`);
        const data = await res.json();
        if (!abort) setThread(data);
      } catch (e) {
        if (!abort) setError(e.message);
      } finally {
        if (!abort) setLoading(false);
      }
    }
    if (id) fetchThread();
    return () => {
      abort = true;
    };
  }, [id]);

  // ---- Fetch Comments ----
  useEffect(() => {
    const getComments = async () => {
      const res = await fetch(`${API}/api/getcomments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setComments(data);
    };
    getComments();
  }, [id]);

  // ---- Submit Comment ----
  const submitComments = async () => {
    if (!text.trim()) return;
    const res = await fetch(`${API}/api/createcomments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, text }),
    });
    await res.json();
    setText("");
    window.location.reload();
  };

  // ---- Translate Thread + Comments ----
  useEffect(() => {
    let cancel = false;
    async function run() {
      if (!thread) return;
      try {
        const mainText = thread.title || thread.text || "";
        const t0 = translateText(mainText, viewer);
        const tCs = Promise.all(
          comments.map((c) => translateText(c.text, viewer))
        );
        const [trTitle, trComments] = await Promise.all([t0, tCs]);
        if (!cancel) {
          setTitleTr(trTitle);
          setCommentTr(trComments);
        }
      } catch (e) {
        console.error(e);
      }
    }
    run();
    return () => {
      cancel = true;
    };
  }, [thread, comments, viewer.generation, viewer.regionPref]);

  if (loading)
    return (
      <p className="mt-24 p-4 text-center text-[#2983CC] font-semibold">
        Loading…
      </p>
    );
  if (error)
    return (
      <p className="mt-24 p-4 text-center text-red-500 font-semibold">
        Error: {error}
      </p>
    );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-black">
      {/* ===== Sidebar ===== */}
      <aside className="md:w-1/4 w-full bg-gray-50 p-6 flex flex-col gap-6">
        <div className="bg-white rounded-2xl shadow-md border border-[#2983CC]/30 p-6 flex flex-col gap-4">
          <button
            onClick={() => navigate("/forums")}
            className="flex items-center gap-2 hover:text-[#2983CC] transition"
          >
            <ArrowLeftCircle size={18} /> Back to Forums
          </button>
        </div>
      </aside>

      {/* ===== Main Thread Content ===== */}
      <main className="md:w-3/4 w-full p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-4 text-[#2983CC]">
          {thread.title}
        </h1>
        <p className="text-sm text-gray-500 mb-6">by {thread.user}</p>

        {thread.text && (
          <p className="text-gray-700 italic mb-4">{thread.text}</p>
        )}
        <TranslationBox tr={titleTr} />

        {/* Comments Section */}
        <h2 className="text-xl font-semibold mt-8 mb-4 text-[#2983CC]">
          Comments
        </h2>

        {comments.length > 0 ? (
          comments.map((c, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4"
            >
              <p className="text-gray-800">{c.text}</p>
              <TranslationBox tr={commentTr[i]} />
              <p className="text-xs text-gray-500 mt-1">by {c.user}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No comments yet. Be the first!</p>
        )}

        {/* Comment Form */}
        <div className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-3 text-[#2983CC]">
            Add a Comment
          </h3>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your comment..."
            className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#2983CC]"
          />
          <button
            onClick={submitComments}
            className="bg-[#2983CC] text-white px-4 py-2 rounded-lg font-semibold hover:bg-black transition"
          >
            Submit
          </button>
        </div>
      </main>
    </div>
  );
};

export default Thread;
