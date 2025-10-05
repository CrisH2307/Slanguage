import React from "react";
import { Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
import UserProfile from "./pages/UserProfile";
import ForumPage from "./pages/ForumPage";
import LoggedOut from "./pages/LoggedOut";
import NavBar from "./components/NavBar";
import Forums from "./pages/Forums";
import Threads from "./pages/Thread";

function App() {
  return (
    <div>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/forum" element={<ForumPage />} />
        <Route path="/loggedout" element={<LoggedOut />} />
        <Route path="/forums" element={<Forums />} />
        <Route path="/forums/:id" element={<Threads />} />
      </Routes>
    </div>
  );
}

export default App;
