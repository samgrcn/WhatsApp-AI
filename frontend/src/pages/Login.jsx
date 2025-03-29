import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import frame2 from "../assets/frame-2.svg";
import group from "../assets/group.svg";
import image from "../assets/image.svg";

export const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        localStorage.setItem("isAuthenticated", "true");
        navigate("/");
      } else {
        // Handle error
        console.error("Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-[448px] bg-white rounded-xl shadow-[0px_10px_15px_#0000001a,0px_4px_6px_#0000001a] p-8">
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <svg className="w-12 h-12 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <h1 className="font-poppins font-bold text-gray-900 text-3xl text-center mb-2">
            WhatsApp AI
          </h1>
          <p className="font-poppins text-gray-600 text-sm text-center">
            Sign in to your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label className="block font-poppins font-medium text-gray-700 text-sm mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-[42px] px-10 font-poppins text-base border border-gray-300 rounded-lg shadow-[0px_1px_2px_#0000000d] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter your username"
                />
                <div className="absolute left-3 top-[13px]">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-poppins font-medium text-gray-700 text-sm mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[42px] px-10 font-poppins text-base border border-gray-300 rounded-lg shadow-[0px_1px_2px_#0000000d] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter your password"
                />
                <div className="absolute left-3 top-[13px]">
                  <img className="w-4 h-4" alt="Group" src={group} />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-[50px] bg-[#25D366] text-white font-poppins rounded-lg hover:bg-[#128C7E] transition-colors flex items-center justify-center relative"
            >
              <span>Sign in</span>
              <div className="absolute left-3">
                <img className="w-4 h-4" alt="Frame" src={image} />
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 