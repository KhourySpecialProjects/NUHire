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
    socket.on("jobUpdated", ({ job, reset }) => {
      if (reset) {
        console.log("Job updated, resetting progress and clearing localStorage");
        localStorage.removeItem("pdf-comments");
      }
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

      <div className="flex flex-col items-center font-rubik text-navyHeader text-center space-y-7 mb-6">
        <h1 className="text-4xl font-extrabold mb-4">Welcome to NUHire</h1>
        <p className="text-lg text-gray-800">Work in small teams to experience what it’s like to be a hiring manager.</p>
        <p className="text-lg text-gray-800">Review a job description, evaluate resumes, and decide which candidates deserve an interview.</p>
        <p className="text-lg text-gray-800">Then, watch interview clips and choose the top two finalists for the role.</p>
        <p className="text-lg text-gray-800">Who will your group select to be your NUHire?
        </p>
      </div>

        <div className="flex flex-col items-center text-center p-6">
          <p className="text-xl font-rubik mb-4"> An Applicant Tracking System (ATS) is a software that streamlines the hiring process by automating tasks like resume screening and applicant tracking. It helps organizations manage the flow of applications and identify qualified candidates</p>
          <h1 className="text-2xl font-rubik font-bold mb-4">Before you get started on this activity, watch the short video below: </h1>
          
          <div className="w-full max-w-5xl aspect-video border-4 border-[#1c2a63] mb-5 rounded-lg shadow-lg">
            <iframe
              className="w-full h-full rounded-lg shadow-lg"
              src="https://www.youtube.com/embed/fHpVPkIGVyY?si=9L9JBYH8sWTEZYe6"
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        <div className="flex font-extrabold text-3xl font-rubik text-navyHeader justify-center items-center text-center p-6">
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
          className="px-6 py-3 font-semibold bg-navy text-white rounded-md shadow-lg hover:bg-navyHeader mt-6 items-center transition duration-300 mx-auto"
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