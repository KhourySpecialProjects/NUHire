"use client";
export const dynamic = "force-dynamic";
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import React, { useEffect, useState, useRef } from "react";
import { useProgress } from "../components/useProgress";
import Navbar from "../components/navbar";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Document, Page, pdfjs } from "react-pdf";
import Footer from "../components/footer";
import router from "next/router";
import Popup from "../components/popup";
import { usePathname } from "next/navigation";
import Instructions from "../components/instructions";
import { useProgressManager } from "../components/progress";
import { useSocket } from "../components/socketContext";
import Facts from "../components/facts";
import { useAuth } from "../components/AuthContext";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function ResumesPage() {
  useProgress();
  const socket = useSocket();
  const {updateProgress, fetchProgress} = useProgressManager();
  const [resumes, setResumes] = useState(0);
  const [resumesList, setResumesList] = useState<{ 
    id: number; 
    file_path: string; 
    first_name: string; 
    last_name: string;
    title: string;
    interview: string;
  }[]>([]); 
  const { user , loading: userloading} = useAuth();
  const [accepted, setAccepted] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [noResponse, setNoResponse] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [currentResumeIndex, setCurrentResumeIndex] = useState(0);
  const [fadingEffect, setFadingEffect] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [disabled, setDisabled] = useState(true);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [popup, setPopup] = useState<{
    headline: string;
    message: string;
  } | null>(null);
  const pathname = usePathname();
  const [restricted, setRestricted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showJobDescription, setShowJobDescription] = useState(false);
  const [jobDescPath, setJobDescPath] = useState("");
  interface User {
    id: string;
    group_id: number;
    email: string;
    class: number;
  }
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

  // Fetch job description for the group
  useEffect(() => {
    const fetchJobDescription = async () => {
      if (!user?.group_id || !user?.class) return;
      
      try {
        // First get the job assignment
        const assignmentResponse = await fetch(
          `${API_BASE_URL}/jobs/assignment/${user.group_id}/${user.class}`,
          { credentials: "include" }
        );
        const assignmentData = await assignmentResponse.json();
        
        if (assignmentData.job) {
          // Then get the job description details
          const jobResponse = await fetch(
            `${API_BASE_URL}/jobs/title?title=${encodeURIComponent(assignmentData.job)}&class_id=${user.class}`,
            { credentials: "include" }
          );
          const jobData = await jobResponse.json();
          if (jobData.file_path) {
            setJobDescPath(jobData.file_path);
          }
        }
      } catch (error) {
        console.error("Error fetching job description:", error);
      }
    };

    fetchJobDescription();
  }, [user]);

  useEffect(() => {
    if (totalDecisions === 10) {
      localStorage.removeItem('resumeReviewIndex');
      localStorage.removeItem('resumeReviewAccepted');
      localStorage.removeItem('resumeReviewRejected');
      localStorage.removeItem('resumeReviewNoResponse');
    }
  }, [totalDecisions]);

  useEffect(() => {
    const savedIndex = localStorage.getItem('resumeReviewIndex');
    const savedAccepted = localStorage.getItem('resumeReviewAccepted');
    const savedRejected = localStorage.getItem('resumeReviewRejected');
    const savedNoResponse = localStorage.getItem('resumeReviewNoResponse');
    if (savedIndex !== null) setCurrentResumeIndex(Number(savedIndex));
    if (savedAccepted !== null) setAccepted(Number(savedAccepted));
    if (savedRejected !== null) setRejected(Number(savedRejected));
    if (savedNoResponse !== null) setNoResponse(Number(savedNoResponse));
  }, []);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('resumeReviewIndex', String(currentResumeIndex));
  }, [currentResumeIndex]);

  useEffect(() => {
    localStorage.setItem('resumeReviewAccepted', String(accepted));
  }, [accepted]);

  useEffect(() => {
    localStorage.setItem('resumeReviewRejected', String(rejected));
  }, [rejected]);

  useEffect(() => {
    localStorage.setItem('resumeReviewNoResponse', String(noResponse));
  }, [noResponse]);

  useEffect(() => {
    const handleShowInstructions = () => {
      console.log("Help button clicked - showing instructions");
      setShowInstructions(true);
    };

    window.addEventListener('showInstructions', handleShowInstructions);

    return () => {
      window.removeEventListener('showInstructions', handleShowInstructions);
    };
  }, []);

  useEffect(() => {
    if (!socket || !user || !user.email) return;

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
        await fetch(`${API_BASE_URL}/users/update-currentpage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: "resumepage",
            user_email: user.email,
          }),
          credentials: "include"
        });
      } catch (error) {
        console.error("Error updating current page:", error);
      }
    };

    updateCurrentPage();
  }, [socket, user, pathname]);

  // Popup and group move listeners
  useEffect(() => {
    if (!socket || !user) return;

    const handleReceivePopup = ({ headline, message }: { headline: string; message: string }) => {
      setPopup({ headline, message });

      if (headline === "Internal Referral") {
        setRestricted(true);
      } else {
        setRestricted(false);
      }
    };

    const handleMoveGroup = ({ groupId, classId, targetPage }: { 
      groupId: number; 
      classId: number; 
      targetPage: string 
    }) => {
      if (groupId === user.group_id && classId === user.class && targetPage === "/res-review-group") {
        console.log(`Group navigation triggered: moving to ${targetPage}`);
        localStorage.setItem("progress", "res_2");
        window.location.href = targetPage; 
      }
    };

    socket.on("receivePopup", handleReceivePopup);
    socket.on("moveGroup", handleMoveGroup);

    return () => {
      socket.off("receivePopup", handleReceivePopup);
      socket.off("moveGroup", handleMoveGroup);
    };
  }, [socket, user]);

  // Group completed res review listener
  useEffect(() => {
    if (!socket) return;

    const handleGroupCompletedResReview = (data: any) => {
      setDisabled(false); 
    };

    socket.on("groupCompletedResReview", handleGroupCompletedResReview);

    return () => {
      socket.off("groupCompletedResReview", handleGroupCompletedResReview);
    };
  }, [socket]);

  // Complete resumes function
  const completeResumes = () => {
    if (!socket || !user) {
      console.error('Socket or user not available');
      return;
    }

    updateProgress(user, "res_2");
    localStorage.setItem("progress", "res_2");
    localStorage.removeItem('resumeReviewIndex');
    localStorage.removeItem('resumeReviewAccepted');
    localStorage.removeItem('resumeReviewRejected');
    localStorage.removeItem('resumeReviewNoResponse');
    window.location.href = "/res-review-group";
    
    socket.emit("moveGroup", {
      groupId: user.group_id, 
      classId: user.class, 
      targetPage: "/res-review-group"
    });
  };

  // User completed res review
  useEffect(() => {
    if (!socket || totalDecisions !== 10 || !user || !user.email) return;

    console.log(`User ${user.email} completed res-review with 10 decisions`);
    socket.emit("userCompletedResReview", {
      groupId: user.group_id,
    });
  }, [socket, totalDecisions, user]);


  const fetchResumes = async (userClass: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/resume_pdf?class_id=${userClass}`, { credentials: "include" });
      const data = await response.json();
      setResumesList(data);
    } catch (error) {
      console.error("Error fetching resumes:", error);
    }
  };

  useEffect(() => {
    if (user?.class) {
      fetchResumes(user.class);
    }
  }, [user]);

  useEffect(() => {
    if (!showInstructions) {
      const timer = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentResumeIndex, showInstructions]);

    const sendVoteToBackend = async (vote: "yes" | "no" | "unanswered") => {
      console.log("🗳️ [VOTE] Starting sendVoteToBackend");
      console.log("🗳️ [VOTE] Current resume index:", currentResumeIndex);
      console.log("🗳️ [VOTE] Resume at index:", resumesList[currentResumeIndex]);
      console.log("🗳️ [VOTE] Vote type:", vote);
      
      if (!user || !user.id || !user.group_id || !user.class) {
        console.error("❌ [VOTE] Missing user data:", {
          hasUser: !!user,
          hasId: !!user?.id,
          hasGroupId: !!user?.group_id,
          hasClass: !!user?.class,
          userValue: user
        });
        return;
      }

      if (timeSpent < 0) {
        console.error("❌ [VOTE] Invalid time spent:", timeSpent);
        return;
      }

      if (currentResumeIndex < 0) {
        console.error("❌ [VOTE] Invalid resume index:", currentResumeIndex);
        return;
      }

      const resumeId = resumesList[currentResumeIndex]?.id;
      const fallbackId = currentResumeIndex + 1;
      
      console.log("🗳️ [VOTE] Resume ID from list:", resumeId);
      console.log("🗳️ [VOTE] Fallback ID:", fallbackId);
      console.log("🗳️ [VOTE] Will use ID:", resumeId || fallbackId);

      const voteData = {
        student_id: user.id,
        group_id: user.group_id,
        class: user.class,
        timespent: timeSpent,
        resume_number: resumeId || fallbackId,
        vote: vote,
      };

      console.log("🗳️ [VOTE] Sending vote data to backend:", voteData);

      try {
        const response = await fetch(`${API_BASE_URL}/resume/vote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(voteData),
          credentials: "include"
        });

        console.log("✅ [VOTE] Response status:", response.status, response.statusText);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ [VOTE] Error response from backend:", errorData);
          throw new Error("Failed to save vote");
        }
        
        const responseData = await response.json();
        console.log("✅ [VOTE] Vote saved successfully:", responseData);
      } catch (error) {
        console.error("❌ [VOTE] Error sending vote to backend:", error);
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
    console.log("✅ [ACTION] handleAccept called");
    console.log("✅ [ACTION] maxDecisions:", maxDecisions);
    console.log("✅ [ACTION] resumeLoading:", resumeLoading);
    
    if (maxDecisions) return;
    if (!user || userloading || resumeLoading) {
      console.warn("⚠️ [ACTION] User data not ready or resume still loading, skipping vote");
      return;
    }
    
    console.log("✅ [ACTION] About to call sendVoteToBackend with 'yes'");
    sendVoteToBackend("yes");
    setAccepted((prev) => prev + 1);
    setResumes((prev) => prev + 1);
    nextResume();
  };

  const handleReject = () => {
    console.log("❌ [ACTION] handleReject called");
    if (maxDecisions) return;
    if (!user || userloading || resumeLoading) {
      console.warn("⚠️ [ACTION] User data not ready or resume still loading, skipping vote");
      return;
    }
    console.log("❌ [ACTION] About to call sendVoteToBackend with 'no'");
    sendVoteToBackend("no");
    setRejected((prev) => prev + 1);
    setResumes((prev) => prev + 1);
    nextResume();
  };


  const handleNoResponse = () => {
    console.log("⏭️ [ACTION] handleNoResponse called");
    if (maxDecisions) return;
    if (!user || userloading || resumeLoading) {
      console.warn("⚠️ [ACTION] User data not ready or resume still loading, skipping vote");
      return;
    }
    console.log("⏭️ [ACTION] About to call sendVoteToBackend with 'unanswered'");
    sendVoteToBackend("unanswered");
    setNoResponse((prev) => prev + 1);
    nextResume();
  };

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
  

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-center items-center font-rubik text-redHeader text-2xl font-bold py-2">
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

        <div className="flex-1 flex gap-3 px-4 pb-2 overflow-hidden">
          {/* Left sidebar - compact */}
          <div className="flex flex-col gap-2 w-[280px] min-w-[280px]">
            <div className="bg-navy shadow-lg rounded-lg p-3 text-sand text-center">
              <h2 className="text-sm font-semibold">Time Remaining:</h2>
              <h2 className="text-2xl font-bold">{timeRemaining} sec</h2>
            </div>

            <div className="bg-navy shadow-lg rounded-lg p-3 text-sand text-sm">
              <div className="grid grid-cols-2 gap-1">
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

            {/* Toggle button for job description */}
            <button
              className="bg-blue-600 text-white font-rubik px-4 py-2 rounded-lg shadow-md transition duration-300 hover:bg-blue-700"
              onClick={() => setShowJobDescription(!showJobDescription)}
            >
              {showJobDescription ? "← Back to Resume" : "View Job Description →"}
            </button>

            {/* Action buttons - compact */}
            <div className="flex flex-col gap-2">
              {!restricted && (
                <>
                  <button
                    className={`bg-[#a2384f] text-white font-rubik px-4 py-2 rounded-lg shadow-md transition duration-300 ${
                      resumes > 10 || resumeLoading 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:bg-red-600"
                    }`}
                    onClick={handleReject}
                    disabled={resumes > 10 || resumeLoading}
                  >
                    Reject
                  </button>

                  <button
                    className={`bg-gray-500 text-white font-rubik px-4 py-2 rounded-lg shadow-md transition duration-300 ${
                      resumes > 10 || resumeLoading 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:bg-gray-600"
                    }`}
                    onClick={handleNoResponse}
                    disabled={resumes > 10 || resumeLoading}
                  >
                    Skip
                  </button>
                </>
              )}

              <button
                className={`bg-[#367b62] text-white font-rubik px-4 py-2 rounded-lg shadow-md transition duration-300 ${
                  resumes > 10 || resumeLoading 
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:bg-green-600"
                }`}
                onClick={handleAccept}
                disabled={resumes > 10 || resumeLoading}
              >
                Accept
              </button>
            </div>
          </div>

          {/* PDF viewer - takes remaining space, no extra margins */}
          <div className="flex-1 flex justify-center items-start overflow-hidden bg-gray-100">
            <div
              className={`${fadingEffect ? "fade-out" : "fade-in"} h-full w-full overflow-auto flex justify-center`}
              ref={resumeRef}
            >
              {showJobDescription && jobDescPath ? (
                <Document
                  file={`${API_BASE_URL}/${jobDescPath}`}
                  onLoadError={console.error}
                  loading={
                    <div className="flex justify-center items-center h-96">
                      <div className="text-lg text-gray-600">Loading job description...</div>
                    </div>
                  }
                >
                  <Page
                    pageNumber={1}
                    scale={window.innerWidth < 768 ? 0.5 : 1.3}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
              ) : resumesList.length > 0 && resumesList[currentResumeIndex] ? (
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
                    scale={window.innerWidth < 768 ? 0.5 : 1.3}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    onLoadSuccess={() => {
                      console.log("Page rendered successfully");
                      setResumeLoading(false);
                    }}
                  />
                </Document>
              ) : (
                <p className="mt-10">Loading resumes...</p>
              )}
            </div>
          </div>
        </div>

        {/* Compact footer navigation */}
        <div className="flex justify-between px-4 pb-2 gap-2">
          <button
            onClick={() => (window.location.href = "/jobdes")}
            className="px-4 py-2 bg-redHeader text-white rounded-lg shadow-md hover:bg-blue-400 transition duration-300 font-rubik text-sm"
          >
            ← Back: Job Description
          </button>
          <button
            onClick={completeResumes}
            className={`px-4 py-2 bg-redHeader text-white rounded-lg shadow-md hover:bg-blue-400 transition duration-300 font-rubik text-sm
              ${
                disabled
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-blue-400"
              }`}
            disabled={disabled}
          >
            {disabled && totalDecisions === 10 ? (
              <span className="flex items-center">
                <span className="w-4 h-4 mr-2 border-t-2 border-white border-solid rounded-full animate-spin"></span>
                Waiting for teammates...
              </span>
            ) : (
              "Next: Resume Review Pt. 2 →"
            )}
          </button>
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
        
        {disabled && totalDecisions === 10 && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white border-4 border-navy rounded-lg shadow-lg p-8 text-center max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-navy mb-4">Waiting for Teammates</h2>
              <p className="text-lg text-gray-700 mb-4">
                You have completed your resume decisions.<br />
                Waiting for other group members to finish...
              </p>
              <div className="w-16 h-16 border-t-4 border-navy border-solid rounded-full animate-spin mx-auto mb-4"></div>
              <Facts />
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}