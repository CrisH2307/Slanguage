import React from "react";
import { Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
import NavBar from "./components/NavBar";
function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/navbar" element={<NavBar />} />
      </Routes>
    </div>
  );
}

export default App;
