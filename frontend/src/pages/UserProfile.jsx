import React from "react";

const UserProfile = () => {
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
    </div>
  );
};

export default UserProfile;
