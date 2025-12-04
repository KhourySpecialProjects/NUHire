"use client";
export const dynamic = "force-dynamic";
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useProgress } from "../components/useProgress";
import Navbar from "../components/navbar";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Document, Page, pdfjs } from "react-pdf";
import Footer from "../components/footer";
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
  const [groupSize, setGroupSize] = useState(0);
  const [groupSubmissions, setGroupSubmissions] = useState(0);
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
  const [jobDescNumPages, setJobDescNumPages] = useState<number | null>(null);
  const [jobDescPageNumber, setJobDescPageNumber] = useState(1);
  const [votes, setVotes] = useState<{
    student_id: string;
    group_id: number;
    class: number;
    timespent: number;
    resume_number: number;
    vote: "yes" | "no" | "unanswered";
  }[]>([]);
  const [donePopup, setDonePopup] = useState(false);
  const totalDecisions = accepted + rejected + noResponse;
  const maxDecisions = totalDecisions >= 10;
  const resumeRef = useRef<HTMLDivElement | null>(null);
  const hasUpdatedPageRef = useRef(false);
  const lastLoggedIndexRef = useRef(-1);

  const resumeInstructions = [
    "Review the resume and decide whether to accept, reject, or mark as no-response.",
    "You may accept as many as you like out of the 10.",
    "You have to wait for the rest of your group to finish before moving on.",
    "The decisions you make here will not affect the candidate's overall application.",
    "They will just be another factor your group considers when making a final decision.",
  ];  

  const fetchResumes = useCallback(async (userClass: number) => {
    try {
      console.log("📄 [FETCH] Fetching resumes for class:", userClass);
      console.log("📄 [FETCH] Request URL:", `${API_BASE_URL}/resume_pdf?class_id=${userClass}`);
      
      const response = await fetch(`${API_BASE_URL}/resume_pdf?class_id=${userClass}`, { credentials: "include" });
      
      console.log("📄 [FETCH] Response status:", response.status, response.statusText);
      console.log("📄 [FETCH] Response headers:", response.headers);
      
      const data = await response.json();
      console.log("📄 [FETCH] Raw response data:", JSON.stringify(data, null, 2));
      console.log("📄 [FETCH] Number of resumes:", data.length);
      
      data.forEach((resume: any, index: number) => {
        console.log(`📄 [FETCH] Resume ${index}:`, JSON.stringify(resume, null, 2));
      });
      
      const missingPaths = data.filter((r: any) => !r.file_path);
      if (missingPaths.length > 0) {
        console.warn(`⚠️ [FETCH] ${missingPaths.length} resumes are missing file_path!`);
        console.warn("⚠️ [FETCH] Resumes missing file_path:", missingPaths);
      }
      
      setResumesList(data);
    } catch (error) {
      console.error("❌ [FETCH] Error fetching resumes:", error);
    }
  }, []);

  const fetchGroupSize = async () => {
    console.log("🔍 [FETCH-GROUP-SIZE] Starting fetchGroupSize...");
    console.log("🔍 [FETCH-GROUP-SIZE] Current groupSize:", groupSize);
    
    try {
      const response = await fetch(`${API_BASE_URL}/interview/group-size/${user?.group_id}/${user?.class}`, { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          console.log("🔍 [FETCH-GROUP-SIZE] Response received - new size:", data.count);
          setGroupSize(data.count);
          console.log("🔍 [FETCH-GROUP-SIZE] State updated - groupSize:", data.count);
        }
    } catch (err) {
      console.error("❌ [FETCH-GROUP-SIZE] Failed to fetch group size:", err);
    }
  };

  const fetchFinished = async () => {
    console.log("🔍 [FETCH-FINISHED] Starting fetchFinished...");
    console.log("🔍 [FETCH-FINISHED] Current state - groupSubmissions:", groupSubmissions, "groupSize:", groupSize);
    
    try {
      const response = await fetch(`${API_BASE_URL}/resume/finished-count/${user?.group_id}/${user?.class}`, { 
        credentials: "include" 
      });
      
      if (response.ok) {
        const data = await response.json();
        const newGroupSubmissions = data.finishedCount;
        console.log("🔍 [FETCH-FINISHED] Response received - finishedCount:", newGroupSubmissions);
        
        setGroupSubmissions(newGroupSubmissions);
      
        
        console.log("🔍 [FETCH-FINISHED] State updated - groupSubmissions:", newGroupSubmissions);
      }
    } catch (err) {
      console.error("❌ [FETCH-FINISHED] Failed to fetch finished count:", err);
    }
  };

  useEffect(() => {
    const fetchJobDescription = async () => {
      if (!user?.group_id || !user?.class) return;
      
      try {
        const assignmentResponse = await fetch(
          `${API_BASE_URL}/jobs/assignment/${user.group_id}/${user.class}`,
          { credentials: "include" }
        );
        const assignmentData = await assignmentResponse.json();
        
        if (assignmentData.job) {
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
  }, [user?.group_id, user?.class]); 
  
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

    const roomId = `group_${user.group_id}_class_${user.class}`;
    console.log("Joining room:", roomId);
    socket.emit("joinGroup", roomId);

    socket.emit("studentPageChanged", {
      studentId: user.email,
      currentPage: pathname,
    });

    if (!hasUpdatedPageRef.current) {
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
          hasUpdatedPageRef.current = true;
        } catch (error) {
          console.error("Error updating current page:", error);
        }
      };

      updateCurrentPage();
    }
  }, [socket, user?.email, pathname]);

  useEffect(() => {
    if (!socket || !user) return;

    console.log("🔌 [SOCKET-SETUP] Setting up socket listeners for user:", user.email, "group:", user.group_id, "class:", user.class);

    const roomId = `group_${user.group_id}_class_${user.class}`;
    console.log("🚪 [JOIN-ROOM] Joining socket room:", roomId);
    socket.emit("joinGroup", roomId);
    socket.emit("studentOnline", { studentId: user.email });
    socket.emit("studentPageChanged", { studentId: user.email, currentPage: pathname });

    const handleReceivePopup = ({ headline, message }: { headline: string; message: string }) => {
      setPopup({ headline, message });
    };

    const handleMoveGroup = ({ groupId, classId, targetPage }: { groupId: number; classId: number; targetPage: string }) => {
      if (groupId === user.group_id && classId === user.class && targetPage === "/res-review-group") {
        updateProgress(user, "res_2");
        localStorage.setItem("progress", "res_2");
        window.location.href = targetPage;
      }
    };

    const handleUserCompletedResReview = ({ groupId }: { groupId: number }) => {
      if (groupId === user.group_id) {
        console.log("📡 [USER-COMPLETED] Another group member finished - refreshing count");
        fetchFinished();
      }
    };

    const handleStudentRemoved = ({ groupId, classId }: { groupId: number; classId: number }) => {
      console.log("📡 [STUDENT-REMOVED] Event received - groupId:", groupId, "classId:", classId);
      console.log("📡 [STUDENT-REMOVED] User check - user.group_id:", user?.group_id, "user.class:", user?.class);
      
      if (user && groupId === user.group_id && classId == user.class) {
        console.log("📡 [STUDENT-REMOVED] ✅ Event is for this user's group");
        console.log("📡 [STUDENT-REMOVED] Current state - totalDecisions:", totalDecisions, "groupSize:", groupSize, "groupSubmissions:", groupSubmissions);
        console.log("📡 [STUDENT-REMOVED] Refreshing group size and finished count...");
        
        fetchGroupSize();
        fetchFinished();
        
        console.log("📡 [STUDENT-REMOVED] Fetch calls completed");
      } else {
        console.log("📡 [STUDENT-REMOVED] ❌ Event ignored - not for this group/class");
      }
    };

    const handleStudentAdded = ({ groupId, classId }: { groupId: number; classId: number }) => {
      console.log("📡 [STUDENT-ADDED] Event received - groupId:", groupId, "classId:", classId);
      console.log("📡 [STUDENT-ADDED] User check - user.group_id:", user?.group_id, "user.class:", user?.class);
      
      if (user && groupId === user.group_id && classId == user.class) {
        console.log("📡 [STUDENT-ADDED] ✅ Event is for this user's group");
        console.log("📡 [STUDENT-ADDED] Current state - totalDecisions:", totalDecisions, "groupSize:", groupSize, "groupSubmissions:", groupSubmissions);
        console.log("📡 [STUDENT-ADDED] Refreshing group size and finished count...");
        
        fetchGroupSize();
        fetchFinished();
        
        console.log("📡 [STUDENT-ADDED] Fetch calls completed");
      } else {
        console.log("📡 [STUDENT-ADDED] ❌ Event ignored - not for this group/class");
      }
    };

    socket.on("userCompletedResReview", handleUserCompletedResReview);
    socket.on("receivePopup", handleReceivePopup);
    socket.on("moveGroup", handleMoveGroup);
    socket.on("studentRemovedFromGroup", handleStudentRemoved);
    socket.on("studentAddedToGroup", handleStudentAdded);

    return () => {
      socket.off("receivePopup", handleReceivePopup);
      socket.off("userCompletedResReview", handleUserCompletedResReview);
      socket.off("moveGroup", handleMoveGroup);
      socket.off("studentRemovedFromGroup", handleStudentRemoved);
      socket.off("studentAddedToGroup", handleStudentAdded);
    };
  }, [socket, user]);

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

  useEffect(() => {
    console.log("🔄 [AUTO-PROGRESS] useEffect triggered");
    console.log("🔄 [AUTO-PROGRESS] Dependencies - totalDecisions:", totalDecisions, "groupSize:", groupSize, "groupSubmissions:", groupSubmissions);
    console.log("🔄 [AUTO-PROGRESS] Condition check - totalDecisions === 10 && groupSize > 0 && groupSubmissions >= groupSize:", 
      totalDecisions === 10 && groupSize > 0 && groupSubmissions >= groupSize);
    
    if (totalDecisions === 10 && groupSize > 0 && groupSubmissions >= groupSize) {
      console.log("✅ [AUTO-PROGRESS] All conditions met - enabling progression");
      setDisabled(false);
    } else {
      console.log("⏸️ [AUTO-PROGRESS] Conditions not met - waiting");
      if (totalDecisions < 10) console.log("   - User has not finished yet (decisions:", totalDecisions, "/10)");
      if (groupSize <= 0) console.log("   - Group size is 0 or invalid");
      if (groupSubmissions < groupSize) console.log(`   - Waiting for more submissions (${groupSubmissions}/${groupSize})`);
    }
  }, [groupSize, groupSubmissions, totalDecisions]);

  useEffect(() => {
    if (!user?.group_id) return;
    
    fetchGroupSize();
    fetchFinished();
  }, [user?.group_id]);

  const completeResumes = async () => {
    if (!socket || !user) {
      console.error('Socket or user not available');
      return;
    }

    // Votes are already submitted when the 10th vote was cast
    // Just update progress and navigate
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

  useEffect(() => {
    if (user?.class) {
      fetchResumes(user.class);
    }
  }, [user?.class, fetchResumes]);

  useEffect(() => {
    if (resumesList.length > 0 && 
        resumesList[currentResumeIndex] && 
        lastLoggedIndexRef.current !== currentResumeIndex) {
      const currentResume = resumesList[currentResumeIndex];
      console.log("📋 [CURRENT RESUME] Index:", currentResumeIndex);
      console.log("📋 [CURRENT RESUME] Data:", currentResume);
      console.log("📋 [CURRENT RESUME] ID:", currentResume.id);
      console.log("📋 [CURRENT RESUME] File Path:", currentResume.file_path);
      console.log("📋 [CURRENT RESUME] Full URL:", `${API_BASE_URL}/${currentResume.file_path}`);
      console.log("📋 [CURRENT RESUME] Name:", `${currentResume.first_name} ${currentResume.last_name}`);
      console.log("📋 [CURRENT RESUME] Title:", currentResume.title);
      lastLoggedIndexRef.current = currentResumeIndex;
    }
  }, [currentResumeIndex, resumesList]);

  useEffect(() => {
    if (!showInstructions) {
      const timer = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentResumeIndex, showInstructions]);

  const sendVoteToBackend = async (vote: "yes" | "no" | "unanswered") => {
    console.log("🗳️ [VOTE] Adding vote to queue");
    console.log("🗳️ [VOTE] Current resume index:", currentResumeIndex);
    console.log("🗳️ [VOTE] Resume at index:", resumesList[currentResumeIndex]);
    console.log("🗳️ [VOTE] Vote type:", vote);
    
    if (!user || !user.id || !user.group_id || !user.class) {
      console.error("❌ [VOTE] Missing user data");
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

    const voteData: {
      student_id: string;
      group_id: number;
      class: number;
      timespent: number;
      resume_number: number;
      vote: "yes" | "no" | "unanswered";
    } = {
      student_id: String(user.id),
      group_id: user.group_id,
      class: user.class,
      timespent: timeSpent,
      resume_number: resumeId || fallbackId,
      vote: vote,
    };

    console.log("🗳️ [VOTE] Adding vote to array:", voteData);
    const updatedVotes = [...votes, voteData];
    setVotes(updatedVotes);

    // If this is the 10th vote, submit immediately
    if (updatedVotes.length === 10) {
      console.log("📤 [BATCH-VOTE] 10th vote cast - submitting all votes immediately");
      try {
        const response = await fetch(`${API_BASE_URL}/resume/batch-vote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ votes: updatedVotes }),
          credentials: "include"
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ [BATCH-VOTE] Error response from backend:", errorData);
          throw new Error("Failed to save votes");
        }
        
        const responseData = await response.json();
        console.log("✅ [BATCH-VOTE] All 10 votes saved successfully:", responseData);
        
        // Emit socket event that user completed
        if (socket) {
          socket.emit("userCompletedResReview", {
            groupId: user.group_id,
          });
        }
      } catch (error) {
        console.error("❌ [BATCH-VOTE] Error sending votes to backend:", error);
        setPopup({
          headline: "Error Saving Votes",
          message: "Failed to save your resume decisions. Please try again."
        });
      }
    }
  };

  const nextResume = () => {
    if (currentResumeIndex < resumesList.length - 1) {
      setFadingEffect(true);
      setResumeLoading(true);
      setShowJobDescription(false);
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

  const currentResumeFile = useMemo(() => {
    if (resumesList.length > 0 && resumesList[currentResumeIndex]) {
      return `${API_BASE_URL}/${resumesList[currentResumeIndex].file_path}`;
    }
    return null;
  }, [currentResumeIndex, resumesList]);

  const currentJobDescFile = useMemo(() => {
    if (jobDescPath) {
      return `${API_BASE_URL}/${jobDescPath}`;
    }
    return null;
  }, [jobDescPath]);

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

            <button
              className="bg-blue-600 text-white font-rubik px-4 py-2 rounded-lg shadow-md transition duration-300 hover:bg-blue-700"
              onClick={() => {
                setShowJobDescription(!showJobDescription);
                setJobDescPageNumber(1);
              }}
            >
              {showJobDescription ? "← Back to Resume" : "View Job Description →"}
            </button>

            {showJobDescription && jobDescNumPages && jobDescNumPages > 1 && (
              <div className="flex items-center justify-between bg-navy p-2 rounded-lg">
                <button
                  className="px-3 py-1 bg-sand text-navy rounded disabled:opacity-50"
                  onClick={() => setJobDescPageNumber(prev => Math.max(1, prev - 1))}
                  disabled={jobDescPageNumber <= 1}
                >
                  ←
                </button>
                <span className="text-sand text-sm">
                  Page {jobDescPageNumber} / {jobDescNumPages}
                </span>
                <button
                  className="px-3 py-1 bg-sand text-navy rounded disabled:opacity-50"
                  onClick={() => setJobDescPageNumber(prev => Math.min(jobDescNumPages, prev + 1))}
                  disabled={jobDescPageNumber >= jobDescNumPages}
                >
                  →
                </button>
              </div>
            )}

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

          <div className="flex-1 flex justify-center items-start overflow-hidden bg-gray-100">
            <div
              className={`${fadingEffect ? "fade-out" : "fade-in"} h-full w-full overflow-auto flex justify-center`}
              ref={resumeRef}
            >
              {showJobDescription && currentJobDescFile ? (
                <Document
                  file={currentJobDescFile}
                  onLoadError={console.error}
                  onLoadSuccess={({ numPages }) => {
                    console.log("Job description loaded with", numPages, "pages");
                    setJobDescNumPages(numPages);
                  }}
                  loading={
                    <div className="flex justify-center items-center h-96">
                      <div className="text-lg text-gray-600">Loading job description...</div>
                    </div>
                  }
                >
                  <Page
                    pageNumber={jobDescPageNumber}
                    scale={window.innerWidth < 768 ? 0.5 : 1.3}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
              ) : currentResumeFile ? (
                <Document
                  file={currentResumeFile}
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