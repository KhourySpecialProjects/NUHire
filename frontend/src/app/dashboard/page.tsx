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
  const steps = [
    {
      key: "jobdes",
      label: "Job Description",
      path: "/jobdes",
      emoji: "📝",
      desc: "Review your assigned job description."
    },
    {
      key: "res-review",
      label: "Resume Review",
      path: "/res-review",
      emoji: "📄",
      desc: "Individually review candidate resumes."
    },
    {
      key: "res-review-group",
      label: "Resume Review Group",
      path: "/res-review-group",
      emoji: "👥",
      desc: "Discuss resumes with your group."
    },
    {
      key: "interview-stage",
      label: "Interview Stage",
      path: "/interview-stage",
      emoji: "🎤",
      desc: "Interview selected candidates."
    },
    {
      key: "makeOffer",
      label: "Make an Offer",
      path: "/makeOffer",
      emoji: "💼",
      desc: "Decide which candidate to hire."
    },
    {
      key: "employerPannel",
      label: "Employer Panel",
      path: "/employerPannel",
      emoji: "🏢",
      desc: "View employer dashboard."
    },
  ];

  // Function to refresh user, progress bar, and menu bar
  const refreshDashboardUI = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
      const userData = await response.json();
      if (response.ok) {
        setUser(userData);
        const storedProgress = localStorage.getItem("progress") || "jobdes";
        setProgress(storedProgress);
        setFlipped(Array(steps.length).fill(false));
      }
    } catch (error) {
      console.error("Error refreshing dashboard UI:", error);
    }
  };
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
    socket.on("jobUpdated", async ({ job }) => {
      localStorage.removeItem("pdf-comments");
      setPopup({ 
        headline: "You have been assigned a new job!", 
        message: `You are an employer for ${job}!` 
      });
      localStorage.setItem("progress", "jobdes");
      setProgress("jobdes");
      
      // Force refresh the user data to unlock cards
      await refreshDashboardUI();
      
      // Force re-render by updating flipped state
      setFlipped(Array(steps.length).fill(false));
    });

    socket.on("receivePopup", ({ headline, message }) => {
      setPopup({ headline, message });
    });

    return () => {
      socket.off("jobUpdated");
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

  const isStepUnlocked = (stepKey: string) => {
    if (!user?.job_des) {
      return false;
    }
    const stepIndex = steps.findIndex(step => step.key === stepKey);
    const progressIndex = steps.findIndex(step => step.key === progress);
    return stepIndex <= progressIndex;
  };

  const [flipped, setFlipped] = useState(Array(steps.length).fill(false));

  const handleFlip = (idx: number) => {
    if (!isStepUnlocked(steps[idx].key)) return;
    setFlipped((prev) => {
      const newArr = [...prev];
      newArr[idx] = !newArr[idx];
      return newArr;
    });
  };

  if (loading) return <div>Loading...</div>;
  if (!user || user.affiliation !== "student") return null;

  return (
    <div className="bg-sand font-rubik min-h-screen flex flex-col">
      <Navbar />
      
      {/* Main content area that fills remaining space */}
      <div className="flex-1 flex flex-col px-4 py-8">
        {/* Header */}
        <div className="font-extrabold text-3xl font-rubik text-redHeader mb-6 text-center">
          <h3>Progress Steps</h3>
        </div>
        
        {/* Grid container that grows to fill available space */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
            {steps.map((step, idx) => {
              const unlocked = isStepUnlocked(step.key);
              return (
                <div
                  key={step.key}
                  className={`flip-card w-full aspect-[4/3] min-h-[200px] max-h-[280px] max-w-[500px] mx-auto perspective cursor-pointer ${!unlocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  onClick={() => handleFlip(idx)}
                  title={
                    !user?.job_des && step.key !== "jobdes"
                      ? "You need to be assigned a job description first."
                      : step.key === "jobdes" && !user?.job_des
                      ? "You have not been assigned a job description yet."
                      : !unlocked
                      ? "Complete previous steps to unlock this stage."
                      : "Click to flip"
                  }
                  style={{ pointerEvents: unlocked ? "auto" : "none" }}
                >
                  <div className={`relative w-full h-full transition-transform duration-500 ${flipped[idx] ? "rotate-y-180" : ""}`}
                    style={{ transformStyle: "preserve-3d" }}>
                    {/* Front Side */}
                    <div className={`absolute w-full h-full ${!unlocked ? "bg-gray-300" : "bg-northeasternWhite"} border-2 border-northeasternRed text-white rounded-xl shadow-lg flex flex-col justify-center items-center font-semibold text-lg backface-hidden p-4`}>
                      <span className="mb-2 text-northeasternRed text-center">{step.desc}</span>
                      <span className="text-2xl">{step.emoji}</span>
                      {!unlocked && (
                        <span className="text-4xl mt-4" title="Locked">
                          🔒
                        </span>
                      )}
                    </div>
                    {/* Back Side */}
                    <div className="absolute w-full h-full bg-northeasternWhite text-northeasternRed border-2 border-northeasternRed bg-opacity-50 rounded-xl shadow-lg flex flex-col justify-center items-center font-extrabold text-xl rotate-y-180 backface-hidden p-4">
                      <span className="text-center">{step.label}</span>
                      <span className="text-3xl mt-2">{step.emoji}</span>
                      <a
                        href={unlocked ? step.path : undefined}
                        className={`mt-4 underline ${unlocked ? "text-northeasternBlack" : "text-gray-400 pointer-events-none"}`}
                        style={{ pointerEvents: unlocked ? "auto" : "none" }}
                      >
                        Go to Step
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Footer />

      {popup && (
        <Popup
          headline={popup.headline}
          message={popup.message}
          onDismiss={() => setPopup(null)} 
        />
      )}

      <style jsx>{`
        .flip-card {
          perspective: 1000px;
        }
        .flip-card > div {
          transform-style: preserve-3d;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .flip-card .rotate-y-180 .backface-hidden {
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;