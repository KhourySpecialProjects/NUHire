'use client'; //Declares that this page is a client component
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; // API base URL from environment variables
import React, { useState, useEffect } from "react"; // Importing React and hooks for state and effect management
import { useRouter } from "next/navigation"; // Importing useRouter for navigation
import Link from "next/link"; // Importing Link for client-side navigation
import NavbarAdmin from "../components/navbar-admin"; // Importing the admin navbar component
import { io } from "socket.io-client"; // Importing Socket.IO for real-time communication
import AdminReactionPopup from "../components/adminReactionPopup"; // Importing popup component for offers

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
  const [pendingOffers, setPendingOffers] = useState<
    { classId: number; groupId: number; candidateId: number }[]
  >([]);
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

  // Set up Socket.IO event listeners after component mounts
  useEffect(() => {
    const onRequest = (data: { classId: number; groupId: number; candidateId: number }) => {
      const { classId, groupId, candidateId } = data;
      setPendingOffers((prev) => [...prev, {classId, groupId, candidateId }]);
    };
  
    socket.on("makeOfferRequest", onRequest);
    return () => {
      socket.off("makeOfferRequest", onRequest);
    };
  }, []);

  // If loading, show a loading message
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-xl">Loading...</div>;
  }

  if (!user || user.affiliation !== "admin") {
    // If the user is not an admin, redirect to the home page
    router.push("/");
    return null; // Return null to avoid rendering anything else
  }

  const respondToOffer = (
    classId: number,
    groupId: number,
    candidateId: number,
    accepted: boolean
  ) => {
    socket.emit("makeOfferResponse", {
      classId,
      groupId,
      candidateId,
      accepted,
    });
    setPendingOffers((prev) =>
      prev.filter((o) => o.classId != classId || o.groupId !== groupId || o.candidateId !== candidateId)
    );
  };

  // Render the dashboard if the user is an admin
  return (
    <div className="flex flex-col min-h-screen bg-northeasternWhite font-rubik">
      <NavbarAdmin />

      <div className="flex justify-center items-center py-10">
        <h1 className="text-4xl font-bold text-northeasternBlack text-center drop-shadow-lg">
          Advisor Dashboard
        </h1>
      </div>

      <main className="flex flex-col items-center justify-center flex-grow">
        <div className="mt-6 gap-5 flex flex-row justify-center items-center">
          <Link
            href="/grouping"
            className="px-10 py-10 bg-northeasternWhite text-northeasternRed border-4 border-northeasternRed font-semibold rounded-lg shadow-md hover:bg-northeasternRed hover:text-northeasternWhite transition"
          >
            Create and View Groups
          </Link>
          <Link 
            href="/new-pdf" 
            className="px-10 py-10 bg-northeasternWhite text-northeasternRed border-4 border-northeasternRed font-semibold rounded-lg shadow-md hover:bg-northeasternRed hover:text-northeasternWhite transition"
          >
            Upload Job Descriptions and Resumes
          </Link>

          <Link
            href="/sendpopups"
            className="px-10 py-10 bg-northeasternWhite text-northeasternRed border-4 border-northeasternRed font-semibold rounded-lg shadow-md hover:bg-northeasternRed hover:text-northeasternWhite transition"
          >
            Send Popups
          </Link>
        </div>

        {/* Render pending offers as popups */}
        {pendingOffers.map(({classId, groupId, candidateId }) => (
          <div
            key={`offer-${classId}-${groupId}-${candidateId}`}
            className="fixed inset-0 bg-northeasternBlack bg-opacity-70 flex justify-center items-center z-50"
          >
            <div className="bg-northeasternWhite p-6 rounded-lg shadow-lg max-w-md mx-auto border-2 border-northeasternRed">
              <AdminReactionPopup
                headline={`Group ${groupId} from Class ${classId} wants to offer Candidate ${candidateId}`}
                message="Do you approve?"
                onAccept={() => 
                  respondToOffer(classId, groupId, candidateId, true)
                }
                onReject={() => 
                  respondToOffer(classId, groupId, candidateId, false)
                }
              />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default Dashboard;