import React from "react";
import { Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
import UserProfile from "./pages/UserProfile";
function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<UserProfile />} />
      </Routes>
    </div>
  );
}

export default App;
