import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftCircle } from "lucide-react";

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
  const [commentError, setCommentError] = useState(null);
  const [viewer] = useState(getViewer());
  const [titleTr, setTitleTr] = useState(null);
  const [commentTranslations, setCommentTranslations] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const translationsRef = useRef({});

  const getCommentKey = (comment, index) => comment?._id || `idx-${index}`;

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
    let cancelled = false;
    const getComments = async () => {
      try {
        const res = await fetch(`${API}/api/getcomments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error(`Failed to load comments: ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setComments(data);
          translationsRef.current = {};
          setCommentTranslations({});
          setCommentError(null);
        }
      } catch (e) {
        if (!cancelled) setCommentError("Failed to load comments.");
      }
    };
    if (id) getComments();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // ---- Submit Comment ----
  const submitComments = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/createcomments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, text }),
      });
      if (!res.ok) throw new Error("Failed to create comment");
      const created = await res.json();
      setComments((prev) => [...prev, created]);
      setText("");
      setCommentError(null);
    } catch (e) {
      console.error(e);
      setCommentError("Unable to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Translate Thread ----
  useEffect(() => {
    let cancelled = false;
    const translateThread = async () => {
      if (!thread) return;
      try {
        const mainText = thread.title || thread.text || "";
        const result = await translateText(mainText, viewer);
        if (!cancelled) setTitleTr(result);
      } catch (e) {
        console.error(e);
      }
    };
    translateThread();
    return () => {
      cancelled = true;
    };
  }, [thread, viewer.generation, viewer.regionPref]);

  // ---- Translate Comments (only new ones) ----
  useEffect(() => {
    let cancelled = false;
    const translateMissing = async () => {
      const pending = comments
        .map((comment, index) => ({ comment, key: getCommentKey(comment, index) }))
        .filter(({ key }) => !translationsRef.current[key]);
      if (!pending.length) return;
      try {
        const translated = await Promise.all(pending.map(({ comment }) => translateText(comment.text, viewer)));
        if (cancelled) return;
        setCommentTranslations((prev) => {
          const next = { ...prev };
          pending.forEach(({ key }, idx) => {
            next[key] = translated[idx];
            translationsRef.current[key] = translated[idx];
          });
          return next;
        });
      } catch (e) {
        console.error(e);
      }
    };
    translateMissing();
    return () => {
      cancelled = true;
    };
  }, [comments, viewer.generation, viewer.regionPref]);

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
          comments.map((c, i) => {
            const translationKey = getCommentKey(c, i);
            return (
              <div
                key={translationKey}
                className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4"
              >
                <p className="text-gray-800">{c.text}</p>
                <TranslationBox tr={commentTranslations[translationKey]} />
                <p className="text-xs text-gray-500 mt-1">by {c.user}</p>
              </div>
            );
          })
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
            onChange={(e) => {
              setText(e.target.value);
              if (commentError) setCommentError(null);
            }}
            placeholder="Write your comment..."
            className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#2983CC]"
          />
          {commentError && (
            <p className="text-sm text-red-500 mb-2">{commentError}</p>
          )}
          <button
            onClick={submitComments}
            disabled={submitting}
            className={`bg-[#2983CC] text-white px-4 py-2 rounded-lg font-semibold transition ${
              submitting ? "opacity-50 cursor-not-allowed" : "hover:bg-black"
            }`}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Thread;
