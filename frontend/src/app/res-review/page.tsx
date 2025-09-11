"use client";
export const dynamic = "force-dynamic";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
import React, { useEffect, useState, useRef } from "react";
import { useProgress } from "../components/useProgress";
import Navbar from "../components/navbar";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Document, Page, pdfjs } from "react-pdf";
import Footer from "../components/footer";
import router from "next/router";
import Popup from "../components/popup";
import { io } from "socket.io-client";
import { usePathname } from "next/navigation";
import Instructions from "../components/instructions";

const socket = io(API_BASE_URL);

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function ResumesPage() {
  useProgress();

  const [resumes, setResumes] = useState(0);
  const [resumesList, setResumesList] = useState<{ file_path: string }[]>([]);
  const [accepted, setAccepted] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [noResponse, setNoResponse] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [currentResumeIndex, setCurrentResumeIndex] = useState(0);
  const [fadingEffect, setFadingEffect] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(true);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [popup, setPopup] = useState<{
    headline: string;
    message: string;
  } | null>(null);
  const pathname = usePathname();
  const [restricted, setRestricted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  interface User {
    id: string;
    group_id: string;
    email: string;
    class: number;
  }
  const [user, setUser] = useState<User | null>(null);
  const [donePopup, setDonePopup] = useState(false);
  const totalDecisions = accepted + rejected + noResponse;
  const maxDecisions = totalDecisions >= 10;
  const resumeRef = useRef<HTMLDivElement | null>(null);
  const resumeInstructions = [
    "Review the resume and decide whether to accept, reject, or mark as no-response.",
    "You may accept as many as you like out of the 10.",
    "You have to wait for the rest of your group to finish before moving on.",
    "The decisions you make here will not affect the candidate's overall application.",
    "They will just be another factor your group considers when making a final decision.",

  ];  

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, {
          credentials: "include",
        });
        const userData = await response.json();

        if (response.ok) {
          setUser(userData);
        } else {
          setUser(null);
          router.push("/login");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user && user.email) {
      socket.emit("studentOnline", { studentId: user.email });

      // Join the proper room for group coordination
      const roomId = `group_${user.group_id}_class_${user.class}`;
      console.log("Joining room:", roomId);
      socket.emit("joinGroup", roomId);

      socket.emit("studentPageChanged", {
        studentId: user.email,
        currentPage: pathname,
      });

      const updateCurrentPage = async () => {
        try {
          await fetch(`${API_BASE_URL}/update-currentpage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              page: "resumepage",
              user_email: user.email,
            }),
          });
        } catch (error) {
          console.error("Error updating current page:", error);
        }
      };

      updateCurrentPage();
    }
  }, [user, pathname]);

  useEffect(() => {
    socket.on("receivePopup", ({ headline, message }) => {
      setPopup({ headline, message });

      if (headline === "Internal Referral") {
        setRestricted(true);
      } else {
        setRestricted(false);
      }
    });

    socket.on("moveGroup", ({groupId, classId, targetPage}) => {
      if (user && groupId === user.group_id && classId === user.class && targetPage === "/res-review-group") {
        console.log(`Group navigation triggered: moving to ${targetPage}`);
        localStorage.setItem("progress", "res-review-group");
        window.location.href = targetPage; 
      }
  });
  

    return () => {
      socket.off("receivePopup");
      socket.off("groupMove");
    };
  }, [user]);

  useEffect(() => {
    socket.on("groupCompletedResReview", (data) => {
      setDisabled(false); 
    });

    return () => {
      socket.off("groupCompletedResReview");
    };
  }, [disabled]);

  const fetchResumes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/resume_pdf`);
      const data = await response.json();
      setResumesList(data);
    } catch (error) {
      console.error("Error fetching resumes:", error);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  useEffect(() => {
    if (!showInstructions) {
      const timer = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentResumeIndex, showInstructions]);

  const sendVoteToBackend = async (vote: "yes" | "no" | "unanswered") => {
    if (!user || !user.id || !user.group_id || !user.class) {
      console.error("Missing user data:", {
        hasUser: !!user,
        hasId: !!user?.id,
        hasGroupId: !!user?.group_id,
        hasClass: !!user?.class,
        userValue: user
      });
      return;
    }

    if (timeSpent < 0) {
      console.error("Invalid time spent:", timeSpent);
      return;
    }

    if (currentResumeIndex < 0) {
      console.error("Invalid resume index:", currentResumeIndex);
      return;
    }

    const voteData = {
      student_id: user.id,
      group_id: user.group_id,
      class: user.class,
      timespent: timeSpent,
      resume_number: currentResumeIndex + 1,
      vote: vote,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/resume/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(voteData),
      });

      console.log("Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response from backend:", errorData);
        throw new Error("Failed to save vote");
      }
      console.log("Vote saved successfully");
    } catch (error) {
      console.error("Error sending vote to backend:", error);
    }
  };

  const nextResume = () => {
    if (currentResumeIndex < resumesList.length - 1) {
      setFadingEffect(true);
      setResumeLoading(true); // Set resume loading when changing resumes
      setTimeout(() => {
        setCurrentResumeIndex(currentResumeIndex + 1);
        setRestricted(false);
        setTimeRemaining(30);
        setTimeSpent(0);
        setFadingEffect(false);

        if (resumeRef.current) {
          resumeRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 500);
    }
  };

  useEffect(() => {
    if (totalDecisions === 10) {
      setDonePopup(true);
    }
  }, [totalDecisions]);

  useEffect(() => {
    if (!showInstructions) {
      if (timeRemaining > 0 && !maxDecisions) {
        const timer = setInterval(() => {
          setTimeRemaining((prevTime) => prevTime - 1);
        }, 1000);
        return () => clearInterval(timer);
      } else if (timeRemaining === 0 && !maxDecisions && restricted) {
        handleAccept();
      } else if (timeRemaining === 0 && !maxDecisions) {
        handleNoResponse();
      }
    }
  }, [timeRemaining, showInstructions]);

  const handleAccept = () => {
    if (maxDecisions) return;
    if (!user || loading || resumeLoading) {
      console.warn("User data not ready or resume still loading, skipping vote");
      return;
    }
    
    console.log("About to call sendVoteToBackend with 'yes'");
    sendVoteToBackend("yes");
    setAccepted((prev) => prev + 1);
    setResumes((prev) => prev + 1);
    nextResume();
  };

  const handleReject = () => {
    if (maxDecisions) return;
    if (!user || loading || resumeLoading) {
      console.warn("User data not ready or resume still loading, skipping vote");
      return;
    }
    sendVoteToBackend("no");
    setRejected((prev) => prev + 1);
    setResumes((prev) => prev + 1);
    nextResume();
  };

  const handleNoResponse = () => {
    if (maxDecisions) return;
    if (!user || loading || resumeLoading) {
      console.warn("User data not ready or resume still loading, skipping vote");
      return;
    }
    sendVoteToBackend("unanswered");
    setNoResponse((prev) => prev + 1);
    nextResume();
  };

  const completeResumes = () => {
    localStorage.setItem("progress", "res-review-group");
    window.location.href = "/res-review-group";
    socket.emit("moveGroup", {groupId: user!.group_id, classId: user!.class, targetPage: "/res-review-group"});

  };

  // Function to get appropriate tooltip message based on current state
  const getTooltipMessage = () => {
    if (totalDecisions < 10) {
      return `Complete at least 10 resume reviews first (${totalDecisions}/10 completed)`;
    } else if (disabled && user?.group_id) {
      return "Waiting for all group members to complete their individual resume reviews";
    } else if (!user?.group_id) {
      return "You need to be in a group to proceed";
    } else {
      return "Proceed to group resume review";
    }
  };

  useEffect(() => {
    if (totalDecisions === 10 && user && user.email) {
      console.log(`User ${user.email} completed res-review with 10 decisions`);
      socket.emit("userCompletedResReview", {
        groupId: user.group_id,
      });
    }
  }, [totalDecisions, user]);

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
  

  return (
    <div>
      <Navbar />
      <div className="flex-1 flex flex-col px-4 py-8">
        <div className="flex justify-center items-center font-rubik text-redHeader text-3xl font-bold mb-3">
          <h1>Resume Review Part 1</h1>
        </div>

        {showInstructions && (
          <Instructions 
            instructions={resumeInstructions}
            onDismiss={() => setShowInstructions(false)}
            title="Resume Review Instructions"
            progress={1}
          />
        )}

        <div className="flex justify-between w-full p-6">
          <div className="flex flex-col gap-4 w-[350px] min-w-[300px]">
            <div className="bg-navy shadow-lg rounded-lg p-6 text-sand text-lg text-center sticky top-0">
              <h2 className="text-lg">Time Remaining:</h2>
              <h2 className="text-3xl">{timeRemaining} sec</h2>
            </div>

            <div className="bg-navy shadow-lg rounded-lg p-6 text-sand text-lg">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-left">Resume</span>
                <span className="text-right">
                  {Math.min(currentResumeIndex + 1, 10)} / 10
                </span>
                <span className="text-left">Accepted</span>
                <span className="text-right">{accepted} / 10</span>
                <span className="text-left">Rejected</span>
                <span className="text-right">{rejected} / 10</span>
                <span className="text-left">No-response</span>
                <span className="text-right">{noResponse} / 10</span>
              </div>
            </div>

            <div className="flex items-center justify-center text-lg space-x-4 mt-4 sticky top-0">
              {!restricted && (
                <>
                  <button
                    className={`bg-[#a2384f] text-white font-rubik px-6 py-2 rounded-lg shadow-md transition duration-300 ${
                      resumes > 10 || resumeLoading 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:bg-red-600 hover:scale-105"
                    }`}
                    onClick={handleReject}
                    disabled={resumes > 10 || resumeLoading}
                  >
                    Reject
                  </button>

                  <button
                    className={`bg-gray-500 text-white font-rubik px-6 py-2 rounded-lg shadow-md transition duration-300 ${
                      resumes > 10 || resumeLoading 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:bg-gray-600 hover:scale-105"
                    }`}
                    onClick={handleNoResponse}
                    disabled={resumes > 10 || resumeLoading}
                  >
                    Skip
                  </button>
                </>
              )}

              <button
                className={`bg-[#367b62] text-white font-rubik px-6 py-2 rounded-lg shadow-md transition duration-300 ${
                  resumes > 10 || resumeLoading 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:bg-green-600 hover:scale-105"
                }`}
                onClick={handleAccept}
                disabled={resumes > 10 || resumeLoading}
              >
                Accept
              </button>
            </div>
          </div>

          <div className="flex-1 flex justify-center items-center h-screen overflow-auto bg-transparent">
            <div
              className={`display-resumes ${fadingEffect ? "fade-out" : "fade-in"} shadow-lg rounded-lg bg-white flex flex-col justify-center items-center"`}
              ref={resumeRef}
              style={{
                maxWidth: "1000px",
                maxHeight: "100vh"
              }}
            >
              {resumesList.length > 0 && resumesList[currentResumeIndex] ? (
                <div className="flex justify-center items-center w-full">
                  <Document
                    file={`${API_BASE_URL}/${resumesList[currentResumeIndex].file_path}`}
                    onLoadError={console.error}
                    onLoadSuccess={() => {
                      console.log("Resume loaded successfully");
                      setResumeLoading(false);
                    }}
                    loading={
                      <div className="flex justify-center items-center h-96">
                        <div className="text-lg text-gray-600">Loading resume...</div>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={1}
                      scale={
                        window.innerWidth < 768
                          ? 0.5
                          : window.innerHeight < 800
                          ? 1.0
                          : 1.0
                      }
                      onLoadSuccess={() => {
                        console.log("Page rendered successfully");
                        setResumeLoading(false);
                      }}
                    />
                  </Document>
                </div>
              ) : (
                <p>Loading resumes...</p>
              )}
            </div>
          </div>
        </div>

        {popup && (
          <Popup
            headline={popup.headline}
            message={popup.message}
            onDismiss={() => setPopup(null)}
          />
        )}
        {donePopup && (
          <Popup
            headline="Review Complete"
            message="You have made 10 resume decisions."
            onDismiss={() => setDonePopup(false)}
          />
        )}
      </div>
      <footer>
        <div className="flex justify-between mb-4">
          <button
            onClick={() => (window.location.href = "/jobdes")}
            className="px-4 py-2 bg-redHeader text-white rounded-lg ml-4 shadow-md hover:bg-blue-400 transition duration-300 font-rubik"
          >
            ← Back: Job Description
          </button>
          <button
            onClick={completeResumes}
            className={`px-4 py-2 bg-redHeader text-white rounded-lg mr-4 shadow-md hover:bg-blue-400 transition duration-300 font-rubik
              ${
                disabled
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-blue-400"
              }`}
            disabled={disabled}
          >
            {disabled && totalDecisions === 10 ? (
              <span className="flex items-center">
                <span className="w-5 h-5 mr-2 border-t-2 border-white border-solid rounded-full animate-spin"></span>
                Waiting for teammates...
              </span>
            ) : (
              "Next: Resume Review Pt. 2 →"
            )}
          </button>
        </div>
      </footer>
      <Footer />
    </div>
  );
}