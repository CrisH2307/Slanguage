import React from 'react'
import { useParams, useNavigate } from "react-router-dom";
import { testThreads } from "./data";

const Thread = () => {
     const { id } = useParams();
    const thread = testThreads.find((t) => t.id === id);
    const navigate = useNavigate();
    const navigateBack = () =>  {navigate("/forums")};
    if (!thread) return <p>Thread not found</p>;

    return (
        <div className="mt-24 p-4">
        <button onClick={navigateBack}>Back</button>
        <h2 className="font-bold text-xl">{thread.title}</h2>
        <p className="border-1 border-gray-400 p-3 mb-4 mt-2 text-slate-400"> translation </p>
        <p className="text-sm">by {thread.user}</p>
        {thread.comments.map((c, index) => (
            <div key={index} className="border-t border-gray-300 mt-2 pt-2">
            <p>{c.text}</p>
            <p className="border-1 border-gray-400 p-3 mb-4 mt-2 text-slate-400"> translation </p>
            <p className="text-xs text-gray-500">by {c.user}</p>
            </div>
        ))}
        <h2 className="mt-5"> Comment</h2>
        <input className="border-1 rounded-2xl p-2 border-black"></input>
    </div>
  );
};

export default Thread;
