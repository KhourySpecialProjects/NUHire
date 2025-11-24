'use client'; //Declares that this page is a client component
export const dynamic = "force-dynamic";
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com"; // API base URL from environment variables
import React, { useState, useEffect } from "react"; // Importing React and hooks for state and effect management
import { useRouter } from "next/navigation"; // Importing useRouter for navigation
import Link from "next/link"; // Importing Link for client-side navigation
import NavbarAdmin from "../components/navbar-admin"; // Importing the admin navbar component
import Slideshow from "../components/slideshow"; // Importing slideshow component for background
import { useSocket } from "../components/socketContext"; // Importing custom hook to use socket context
import { useAuth } from "../components/AuthContext"; // Importing custom hook to use authentication context

const Dashboard = () => {

  // Define the User interface to match the expected user data structure
  interface User {
    id: number;
    name: string;
    email: string;
    affiliation: string;
  }

  // State variables to manage user data and loading state
  const router = useRouter();
  const socket = useSocket();
  const { user, loading: userloading } = useAuth();

  // Socket connection - only run when both socket AND user are ready
  useEffect(() => {
    if (!socket || !user?.email) return; // ✅ Check both socket and user

    console.log('Admin coming online:', user.email); // Debug log
    socket.emit("adminOnline", { adminEmail: user.email });

    return () => {
      console.log('Admin going offline:', user.email); // Debug log
      socket.emit("adminOffline", { adminEmail: user.email });
    };
  }, [socket, user?.email]);

  if (userloading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sand">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          <div className="w-16 h-16 border-t-4 border-navy border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }  

  if (!user || user.affiliation !== "admin") {
    // If the user is not an admin, redirect to the home page
    router.push("/");
    return null; // Return null to avoid rendering anything else
  }

  // Render the dashboard if the user is an admin
  return (
    <div className="flex flex-col min-h-screen bg-northeasternWhite font-rubik">
      <div className="fixed inset-0 z-0">
          <Slideshow />
      </div>        
      <div className="fixed inset-0 bg-sand/80 z-5" />
      <NavbarAdmin />
      <div className="mt-6"/>
      <div className="flex justify-center items-center py-1 z-10">
        <h1 className="text-4xl font-bold text-northeasternBlack text-center drop-shadow-lg">
          Advisor Dashboard
        </h1>
      </div>

      <main className="flex flex-col items-center justify-center flex-grow z-10">
        <div className="mt-6 gap-6 flex flex-row justify-center items-center">
            <Link
              href="/grouping"
              className="px-8 py-8 bg-northeasternWhite text-northeasternRed border-4 border-northeasternRed font-semibold rounded-2xl shadow-xl hover:bg-northeasternRed hover:text-northeasternWhite transition flex flex-col items-center justify-center text-center text-lg w-72 h-72"
            >
              <span className="text-4xl mb-2">👥</span>
              <span>Manage Groups</span>
            </Link>
            <Link 
              href="/new-pdf" 
              className="px-8 py-8 bg-northeasternWhite text-northeasternRed border-4 border-northeasternRed font-semibold rounded-2xl shadow-xl hover:bg-northeasternRed hover:text-northeasternWhite transition flex flex-col items-center justify-center text-center text-lg w-72 h-72"
            >
              <span className="text-4xl mb-2">📤</span>
              <span>Upload Job and Resumes</span>
            </Link>
            <Link 
              href="/adminFacts" 
              className="px-8 py-8 bg-northeasternWhite text-northeasternRed border-4 border-northeasternRed font-semibold rounded-2xl shadow-xl hover:bg-northeasternRed hover:text-northeasternWhite transition flex flex-col items-center justify-center text-center text-lg w-72 h-72"
            >
              <span className="text-4xl mb-2">🔍</span>
              <span>Waiting Facts</span>
            </Link>
          </div>
      </main>
    </div>
  );
};

export default Dashboard;