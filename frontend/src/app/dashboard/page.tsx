'use client';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/navbar";
import NotesPage from "../components/note";
import Footer from "../components/footer";
import io from "socket.io-client";
import { usePathname } from "next/navigation";
import Popup from "../components/popup";

const socket = io(API_BASE_URL); 

interface User {
  email: string;
  affiliation: string;
  job_des: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const [progress, setProgress] = useState<string>("jobdes"); 
  const pathname = usePathname(); 
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await response.json();

        if (response.ok) {
          setUser(userData);
        } else {
          setUser(null);
          router.push("/"); 
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/"); 
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user && user.email) {
      socket.emit("studentOnline", { studentId: user.email }); 

      socket.emit("studentPageChanged", { studentId: user.email, currentPage: pathname });

      const updateCurrentPage = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/update-currentpage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ page: 'dashboard', user_email: user.email }),
          });
        } catch (error) {
          console.error("Error updating current page:", error);
        }
      };

      updateCurrentPage(); 
    }
  }, [user, pathname]);


  useEffect(() => {
    socket.on("jobUpdated", ({ job }) => {
      setPopup({ headline: "You have been assigned a new job!", 
        message: `You are an employer for ${job}!` });
      const refreshUser = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
          const userData = await response.json();
          
          if (response.ok) {
            setUser(userData);
            if (userData.job_des && (!user?.job_des || progress === "jobdes")) {
              setProgress("jobdes");
              localStorage.setItem("progress", "jobdes");
            }
          }
        } catch (error) {
          console.error("Error refreshing user data:", error);
        }
      };
      
      refreshUser();
    });

    socket.on("receivePopup", ({ headline, message }) => {
      setPopup({ headline, message });
    });

    return () => {
      socket.off("receivePopup");
    };
  }, []);

 
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedProgress = localStorage.getItem("progress") || "jobdes";
      setProgress(storedProgress);
    }
  }, []);

  const handleCompleteSimulation = () => {
    localStorage.setItem("progress", "jobdes");
    setProgress("jobdes"); 
    localStorage.setItem("pdf-comments", "");
    router.push("/dashboard")
  }

 
  const steps = [
    { key: "jobdes", label: "Job Description", path: "/jobdes" },
    { key: "res-review", label: "Resume Review", path: "/res-review" },
    { key: "res-review-group", label: "Resume Review Group", path: "/res-review-group" },
    { key: "interview-stage", label: "Interview Stage", path: "/interview-stage" },
    { key: "makeOffer", label: "Make an Offer", path: "/makeOffer" },
    { key: "employerPannel", label: "Employer Panel", path: "/employerPannel" },
  ];

  const isStepUnlocked = (stepKey: string) => {
    if (!user?.job_des) {
      return false;
    }
    const stepIndex = steps.findIndex(step => step.key === stepKey);
    const progressIndex = steps.findIndex(step => step.key === progress);
    return stepIndex <= progressIndex;
  };

  if (loading) return <div>Loading...</div>;
  if (!user || user.affiliation !== "student") return null;

  return (
    <div className="bg-sand font-rubik">
      <Navbar />
      <div className="flex items-right justify-end">
        <NotesPage />
      </div>
        <div className="flex font-extrabold text-3xl font-rubik text-redHeader justify-center items-center text-center p-6">
          <h3> Progress Bar</h3>
        </div>


        <div className="flex font-rubik flex-wrap gap-4 justify-center">
          {steps.map((step) => (
            <button
              key={step.key}
              onClick={() => window.location.replace(step.path)}
              disabled={!isStepUnlocked(step.key)}
              title={
                !user?.job_des && step.key !== "jobdes"
                  ? "You need to be assigned a job description first."
                  : step.key === "jobdes" && !user?.job_des
                  ? "You have not been assigned a job description yet."
                  : !isStepUnlocked(step.key)
                  ? "Complete previous steps to unlock this stage."
                  : ""
              }
              className={`px-4 py-2 text-lg rounded-md transition-all mb-10
                ${isStepUnlocked(step.key) ? "bg-[#455763] text-white cursor-pointer hover:bg-[#142050]" : "bg-gray-300 text-gray-600 cursor-not-allowed opacity-60"}`}
            >
              {step.label}
            </button>
          ))}
        </div>

        {progress === "employerPannel" && (
          <button 
          onClick={handleCompleteSimulation}
          className="px-6 py-3 font-semibold bg-navy text-white rounded-md shadow-lg hover:bg-redHeader mt-6 items-center transition duration-300 mx-auto"
          >
            Complete Simulation
          </button>
        )}

      {popup && (
        <Popup
        headline = {popup.headline}
        message={popup.message}
        onDismiss={() => setPopup(null)} 
        />
      )}
      <Footer />
    </div>
  );
};

export default Dashboard;