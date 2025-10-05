import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// Point to your backend
const API = (import.meta?.env?.VITE_API) || "http://localhost:3000";

// Read viewer prefs from localStorage (set these on your profile page)
function getViewer() {
  return {
    displayName: localStorage.getItem("displayName") || "Anon",
    generation: localStorage.getItem("generation") || "millennial",
    regionPref: localStorage.getItem("regionPref") || "global",     
  }
}

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

function TranslationBox({ tr }) {
  if (!tr) {
    return (
      <p className="border-1 border-gray-400 p-3 mb-4 mt-2 text-slate-400">
        translating…
      </p>
    );
  }
  return (
    <div className="border-1 border-gray-400 p-3 mb-4 mt-2 rounded">
      <div><strong>{tr.plain}</strong></div>
      <div style={{ marginTop: 6 }}>{tr.audienceRewrite}</div>
      <div style={{ marginTop: 8 }}>
        {(tr.detected || []).map((d, i) => (
          <span
            key={i}
            style={{
              fontSize: 12,
              marginRight: 6,
              padding: "2px 8px",
              border: "1px solid #ddd",
              borderRadius: 999,
            }}
          >
            {d.phrase}
          </span>
        ))}
      </div>
      {tr.safety?.sensitive && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#b33" }}>
          <strong>Sensitive</strong>
        </div>
      )}
    </div>
  );
}

const Thread = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [text, setText] = React.useState("")
  const [comments, setComments] = React.useState([])


  useEffect(() => {
    let abort = false;
    async function fetchThread() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/getthreads/${id}`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
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
    return () => { abort = true; };
  }, [id]);

  const submitComments = async () => {
    console.log(id)
    const res = await fetch('http://localhost:3000/api/createcomments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({ id: id, text: text }),
    });
    const data = await res.json();
    const {message} = data; 
    console.log("postedx2", message);
    window.location.reload(true);
  }
  
  useEffect(() => {
    const getComments = async () => {
      const res = await fetch('http://localhost:3000/api/getcomments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id: id }),
      });
      const data = await res.json();
      console.log("COMMENTS",data)
      setComments(data)
      console.log("data", comments)
    };
    getComments();
    
  }, []);


  const [viewer] = useState(getViewer());
  const [titleTr, setTitleTr] = useState(null);
  const [commentTr, setCommentTr] = useState([]);

  useEffect(() => {
    let cancel = false;
    async function run() {
      if (!thread) return;
      try {
        // Choose what you want to translate for the main post:
        // - thread.title (headline) or thread.text (body) — keep whichever you use
        const mainText = thread.title || thread.text || "";
        const t0 = translateText(mainText, viewer);
        const tCs = Promise.all(
          (thread.comments || []).map((c) => translateText(c.text, viewer))
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
  }, [thread, viewer.generation, viewer.regionPref]);

  console.log("thread", thread);

  if (loading) return <p className="mt-24 p-4">Loading…</p>;
  if (error) return <p className="mt-24 p-4 text-red-400">Error: {error}</p>;

  return (
    <div className="mt-24 p-4">
      <button onClick={() => navigate("/forums")}>Back</button>

      <h2 className="font-bold text-xl">{thread.title}</h2>
      <p className="text-sm">by {thread.user}</p>

      {/* Original post text (if you have a body field) */}
      {thread.text && <p className="mt-2 text-slate-200 italic">{thread.text}</p>}

      {/* Translation for the main post */}
      <TranslationBox tr={titleTr} />

      {/* Comments: original + translation under each */}
      {(thread.comments || []).map((c, index) => (
        <div key={index} className="border-t border-gray-300 mt-2 pt-2">
          <p>{c.text}</p>
          <TranslationBox tr={commentTr[index]} />
          <p className="text-xs text-gray-500">by {c.user}</p>
        </div>
      ))}


        <h2 className="mt-5"> Comment</h2>
        <input value={text} onChange={(e) => {setText(e.target.value)}} className="border-1 rounded-2xl p-2 border-black"></input>
        <button className='m-2 p-2 border-2 border-black hover:bg-black hover:text-white'
        onClick={submitComments}>Submit</button>
    </div>
  );
};

export default Thread;
