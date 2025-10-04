import React from "react";
import { useNavigate } from "react-router-dom";

const UserProfile = () => {
  const navigate = useNavigate();

  const toForums = () => {
    navigate("/forums");
  };

  const logoutDirect = async (e) => {
    e.preventDefault();
    try {
      window.location.href = "http://localhost:4000/logout";
    } catch (error) {
      console.log(error)
    }
  }
  return (
    <div className="text-black mt-24">
      <h1>User Profile Page</h1>
      <button onClick={logoutDirect}>Logout</button>
      <p>USER: {}</p>
      <button onClick={toForums}>Next</button>
    </div>
  );
};

export default UserProfile;
