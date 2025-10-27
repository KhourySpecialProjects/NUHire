'use client';
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import io from "socket.io-client";
import { usePathname } from "next/navigation";
import Popup from "../components/popup";
import Slideshow from "../components/slideshow";
import { useProgressManager } from "../components/progress";

const socket = io(API_BASE_URL); 

interface User {
  email: string;
  affiliation: string;
  job_des: string;
  class: number;
  group_id: number;
}

const Dashboard = () => {
  const {updateProgress, fetchProgress} = useProgressManager();
  const steps = [
    {
      key: "job_description",
      label: "Job Description",
      path: "/jobdes",
      emoji: "📝",
      desc: "Review your assigned job description."
    },
    {
      key: "res_1",
      label: "Resume Review",
      path: "/res-review",
      emoji: "📄",
      desc: "Individually review candidate resumes."
    },
    {
      key: "res_2",
      label: "Resume Review Group",
      path: "/res-review-group",
      emoji: "👥",
      desc: "Discuss resumes with your group."
    },
    {
      key: "interview",
      label: "Interview Stage",
      path: "/interview-stage",
      emoji: "🎤",
      desc: "Interview selected candidates."
    },
    {
      key: "offer",
      label: "Make an Offer",
      path: "/makeOffer",
      emoji: "💼",
      desc: "Decide which candidate to hire."
    },
    {
      key: "employer",
      label: "Employer Panel",
      path: "/employerPannel",
      emoji: "🚧",
      desc: "Coming Soon..."
    },
  ];

  // Function to refresh user, progress bar, and menu bar
  const refreshDashboardUI = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
      const userData = await response.json();
      if (response.ok) {
        setUser(userData);
        
        // Refresh job description
        await fetchJobDescription(userData);
        
        // Fetch current progress from server instead of localStorage
        const currentProgress = await fetchProgress(userData);
        
        setProgress(currentProgress);
        localStorage.setItem("progress", currentProgress);
        
        setFlipped(Array(steps.length).fill(false));
      }
      else {
        console.error("Error refreshing dashboard UI:");
      }
    } catch (error) {
      console.error("Error refreshing dashboard UI:", error);
    }
  };
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const [progress, setProgress] = useState<string>("none"); 
  const pathname = usePathname(); 
  const router = useRouter();

  const [jobDescription, setJobDescription] = useState<string | null>(null);
  const [jobLoading, setJobLoading] = useState(true);

  const fetchJobDescription = async (user: User) => {
    if (!user?.group_id || !user?.class) {
      setJobDescription(null);
      setJobLoading(false);
      return;
    }

    try {
      setJobLoading(true);
      const response = await fetch(`${API_BASE_URL}/jobs/assignment/${user.group_id}/${user.class}`);
      
      if (response.ok) {
        const data = await response.json();
        setJobDescription(data.job);
      } else if (response.status === 404) {
        // No job assignment found
        setJobDescription(null);
      } else {
        console.error("Error fetching job description:", response.statusText);
        setJobDescription(null);
      }
    } catch (error) {
      console.error("Error fetching job description:", error);
      setJobDescription(null);
    } finally {
      setJobLoading(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await response.json();

        if (response.ok) {
          setUser(userData);
          
          // Fetch job description for this user
          await fetchJobDescription(userData);
          
          // Fetch actual progress from database instead of assuming "none"
          const currentProgress = await fetchProgress(userData);
          
          // Set progress to what's actually in the database
          setProgress(currentProgress);
          localStorage.setItem("progress", currentProgress);
          
          
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
  }, [router, fetchJobDescription, fetchProgress]);

  useEffect(()  => {
  }, [user]);

  useEffect(() => {
    if (user && user.email) {
      socket.emit("studentOnline", { studentId: user.email }); 

      socket.emit("studentPageChanged", { studentId: user.email, currentPage: pathname });

      const updateCurrentPage = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/users/pdate-currentpage`, {
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
    
    // Update progress on server
    await updateProgress(user!, "job_description");
    
    // Update local progress state - ADD THIS LINE
    setProgress("job_description");
    
    // Store in localStorage
    localStorage.setItem("progress", "job_description");
    
    await refreshDashboardUI();
    setFlipped(Array(steps.length).fill(false));
    
    // Refresh job description after job update
    if (user) {
      await fetchJobDescription(user);
    }
  });

  socket.on("receivePopup", ({ headline, message }) => {
    setPopup({ headline, message });
  });

  return () => {
    socket.off("jobUpdated");
    socket.off("receivePopup");
  };
}, [user, updateProgress, refreshDashboardUI]);

  const isStepUnlocked = (stepKey: string) => {
    
    // If no job description assigned, block all steps except job_description
    if (!jobDescription && stepKey !== "job_description") {
      return false;
    }
    
    // If it's the job_description step but no job assigned, block it
    if (stepKey === "job_description" && !jobDescription) {
      return false;
    }
    
    // If progress is "none", only allow job_description step if job is assigned
    if (progress === "none") {
      return stepKey === "job_description" && jobDescription;
    }
    
    const stepIndex = steps.findIndex(step => step.key === stepKey);
    const progressIndex = steps.findIndex(step => step.key === progress);
    
    
    const unlocked = stepIndex <= progressIndex;
    return unlocked;
  };

  const [flipped, setFlipped] = useState(Array(steps.length).fill(false));

  const handleFlip = (idx: number) => {
    if (!isStepUnlocked(steps[idx].key)) return;
    if (steps[idx].key === "employer") return;
    setFlipped((prev) => {
      const newArr = [...prev];
      newArr[idx] = !newArr[idx];
      return newArr;
    });
  };

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
  
  if (!user || user.affiliation !== "student") return null;

  return (
    <div className="bg-sand font-rubik min-h-screen flex flex-col">
      <div className="fixed inset-0 z-0">
        <Slideshow />
      </div>
                  
      <div className="fixed inset-0 bg-sand/80 z-5" />
      <Navbar />
      <div className="flex-1 flex flex-col px-4 py-8 relative z-10">
        <div className="font-extrabold text-3xl font-rubik text-northeasternBlack mb-6 text-center">
          <h3>Progress Steps</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
            {steps.map((step, idx) => {
              const unlocked = isStepUnlocked(step.key);
              const isEmployerPanel = step.key === "employer";
              return (
                <div
                  key={step.key}
                  className={`flip-card w-full aspect-[4/3] min-h-[200px] max-h-[280px] max-w-[500px] mx-auto perspective cursor-pointer ${(!unlocked || isEmployerPanel) ? "opacity-60 cursor-not-allowed" : ""}`}
                  onClick={() => handleFlip(idx)}
                  title={
                    isEmployerPanel
                      ? "Coming Soon"
                      : !jobDescription && step.key !== "job_description"
                      ? "You need to be assigned a job description first."
                      : step.key === "job_description" && !jobDescription
                      ? "You have not been assigned a job description yet."
                      : !unlocked
                      ? "Complete previous steps to unlock this stage."
                      : "Click to flip"
                  }
                  style={{ pointerEvents: (unlocked) ? "auto" : "none" }}
                >
                  <div className={`relative w-full h-full transition-transform duration-500 ${flipped[idx] ? "rotate-y-180" : ""}`}
                    style={{ transformStyle: "preserve-3d" }}>
                    {/* Front Side */}
                    <div className={`absolute w-full h-full ${!unlocked ? "bg-gray-300" : "bg-northeasternWhite"} border-2 border-northeasternRed text-white rounded-xl shadow-lg flex flex-col justify-center items-center font-semibold text-lg backface-hidden p-4`}>
                      <span className="mb-2 text-northeasternRed text-center">{step.desc}</span>
                      <span className="text-2xl">{step.emoji}</span>
                      {(!unlocked || isEmployerPanel) && (
                        <span className="text-4xl mt-4" title="Locked">
                          🔒
                        </span>
                      )}
                    </div>
                    {/* Back Side */}
                    <div className="absolute w-full h-full bg-northeasternWhite text-northeasternRed border-2 border-northeasternRed bg-opacity-50 rounded-xl shadow-lg flex flex-col justify-center items-center font-extrabold text-xl rotate-y-180 backface-hidden p-4">
                      <a
                        href={unlocked ? step.path : undefined}
                        className={`mt-2 underline ${unlocked ? "text-northeasternBlack" : "text-gray-400 pointer-events-none"}`}
                        style={{ pointerEvents: unlocked ? "auto" : "none" }}
                        onClick={(e) => {
                          e.stopPropagation(); 
                        }}
                      >
                        <div className="mb-2 text-northeasternRed text-center">Go To</div>
                        <div className="mb-2 text-northeasternRed text-center">{step.emoji}</div>
                        <div className="mb-2 text-northeasternRed text-center">{step.label}</div>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="relative z-10">
        <Footer />
      </div>
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