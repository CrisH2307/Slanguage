import React from "react";
import { Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
import UserProfile from "./pages/UserProfile";
import ForumPage from "./pages/ForumPage";
function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/forum" element={<ForumPage />} />
      </Routes>
    </div>
  );
}

export default App;
