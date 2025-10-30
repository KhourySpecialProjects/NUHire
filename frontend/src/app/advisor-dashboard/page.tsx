'use client'; //Declares that this page is a client component
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com"; // API base URL from environment variables
import React, { useState, useEffect } from "react"; // Importing React and hooks for state and effect management
import { useRouter } from "next/navigation"; // Importing useRouter for navigation
import Link from "next/link"; // Importing Link for client-side navigation
import NavbarAdmin from "../components/navbar-admin"; // Importing the admin navbar component
import { io } from "socket.io-client"; // Importing Socket.IO for real-time communication
import Slideshow from "../components/slideshow"; // Importing slideshow component for background

const Dashboard = () => {

  // Define the User interface to match the expected user data structure
  interface User {
    id: number;
    name: string;
    email: string;
    affiliation: string;
  }

  // State variables to manage user data and loading state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const socket = io(API_BASE_URL);

  // Fetch user data from the API when the component mounts
  // and handle redirection if the user is not an admin
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/");
          }
          return;
        }
    
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    

    fetchUser();
  }, [router]);

  socket.emit("adminOnline", { adminEmail: user?.email });

  if (loading) {
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
              className="px-8 py-8 bg-northeasternWhite text-northeasternRed border-4 border-northeasternRed font-semibold rounded-2xl shadow-xl hover:bg-northeasternRed hover:text-northeasternWhite transition flex flex-col items-center justify-center text-center text-lg w-48 h-48"
            >
              <span className="text-4xl mb-2">👥</span>
              <span>Groups and Job Assignment</span>
            </Link>
            <Link
              href="/sendpopups"
              className="px-8 py-8 bg-northeasternWhite text-northeasternRed border-4 border-northeasternRed font-semibold rounded-2xl shadow-xl hover:bg-northeasternRed hover:text-northeasternWhite transition flex flex-col items-center justify-center text-center text-lg w-48 h-48"
            >
              <span className="text-4xl mb-2">📢</span>
              <span>Send Popups</span>
            </Link>
            <Link
              href="/pending-offers"
              className="px-8 py-8 bg-northeasternWhite text-northeasternRed border-4 border-northeasternRed font-semibold rounded-2xl shadow-xl hover:bg-northeasternRed hover:text-northeasternWhite transition flex flex-col items-center justify-center text-center text-lg w-48 h-48"
            >
              <span className="text-4xl mb-2">🤝</span>
              <span>Candidate Offers</span>
            </Link>
            <Link 
              href="/new-pdf" 
              className="px-8 py-8 bg-northeasternWhite text-northeasternRed border-4 border-northeasternRed font-semibold rounded-2xl shadow-xl hover:bg-northeasternRed hover:text-northeasternWhite transition flex flex-col items-center justify-center text-center text-lg w-48 h-48"
            >
              <span className="text-4xl mb-2">📤</span>
              <span>Upload Job and Resumes</span>
            </Link>
          </div>
      </main>
    </div>
  );
};

export default Dashboard;