"use client";
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import React, { useState, useEffect } from "react";
import Instructions from "../components/instructions";
import { io, Socket } from "socket.io-client";
import Navbar from "../components/navbar";
import { usePathname, useRouter } from "next/navigation";
import { useProgress } from "../components/useProgress";
import Footer from "../components/footer";

const SOCKET_URL = `${API_BASE_URL}`; 
let socket: Socket; // Define socket with correct type

export default function ResReviewGroup() {
  useProgress();

  interface VoteData {
    yes: number;
    no: number;
    undecided: number;
  }

  interface User {
    id: number;
    name: string;
    email: string;
    affiliation: string;
    group_id: number;
    class: number;
  }

  interface ResumeData {
    resume_number: number;
    vote: "yes" | "no" | "unanswered";
    checked: boolean;
  }

  interface Resume {
    resume_number: number;
    file_path: string;
    checked: boolean;
    vote: "yes" | "no" | "unanswered";
  }

  const [checkedState, setCheckedState] = useState<{ [key: number]: boolean }>({});
  const [voteCounts, setVoteCounts] = useState<{ [key: number]: VoteData }>({});
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const [selectedResumeNumber, setSelectedResumeNumber] = useState<number | "">("");
  const resumeInstructions = [
    "Review the resumes and decide as a group which 4 candidates continue.",
    "You will then watch the interviews of the candidates selected."
  ];  
             
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await response.json();
        
        if (response.ok) {
          setUser(userData);
        } else {
          setUser(null);
          router.push("/login"); // Redirect to login if unauthorized
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/login"); // Redirect on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [router]);
    
  useEffect(() => {
    if (!user) return; // Only check for user, not socket

    // If socket exists but is not connected, close it
    if (socket && !socket.connected) {
      socket.close();
    }
    
    // Initialize new socket
    socket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      timeout: 5000,
    });
    
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);
      
      // Join the proper room format
      const roomId = `group_${user.group_id}_class_${user.class}`;
      console.log("Joining room:", roomId);
      socket.emit("joinGroup", roomId);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Handle checkbox updates from other group members
    socket.on("checkboxUpdated", ({ resume_number, checked }: { resume_number: number; checked: boolean }) => {
      console.log(`Received checkbox update: Resume ${resume_number}, Checked: ${checked}`);
      setCheckedState((prev) => ({
        ...prev,
        [resume_number]: checked,
      }));
    });

    socket.on("moveGroup", ({groupId, classId, targetPage}) => {
      if (user && groupId === user.group_id && classId === user.class) {
        console.log(`Group navigation triggered: moving to ${targetPage}`);
        localStorage.setItem("progress", "interview-stage");
        window.location.href = targetPage; 
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });

    socket.on("reconnect_failed", () => {
      console.error("Socket reconnection failed.");
    });

    return () => {
      if (socket) {
        console.log("Cleaning up socket connection");
        socket.off("connect");
        socket.off("disconnect");
        socket.off("checkboxUpdated");
        socket.off("connect_error");
        socket.off("reconnect_failed");
        socket.off("moveGroup");
        socket.close();
      }
    };
  }, [user]);
  useEffect(() => {
    if (user && user.email) {
      socket.emit("studentOnline", { studentId: user.email }); 
      
      socket.emit("studentPageChanged", { studentId: user.email, currentPage: pathname });
      
      const updateCurrentPage = async () => {
        try {
          await fetch(`${API_BASE_URL}/update-currentpage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ page: 'resumepage2', user_email: user.email }),
          });
        } catch (error) {
          console.error("Error updating current page:", error);
        }
      };
      
      updateCurrentPage(); 
    }
  }, [user, pathname]);

  const fetchResumes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/resume_pdf`);
      const data: { file_path: string; id: number; title: string; uploaded_at: string }[] = await response.json();
      const formatted: Resume[] = data.map(item => ({
      resume_number: item.id,
      file_path: item.file_path,
      checked: checkedState[item.id] || false,
      vote: voteCounts[item.id]
        ? voteCounts[item.id].yes > voteCounts[item.id].no
          ? "yes"
          : "no"
        : "unanswered",
    }));

      setResumes(formatted);
    } catch (error) {
      console.error("Error fetching resumes:", error);
    }
  };

  const getResumeUrl = (filePath: string) => {
    const fileName = filePath.split('/').pop()!;
    return `${API_BASE_URL}/resume_pdf/resumes/${encodeURIComponent(fileName)}`;
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user || !user.class) return;

        // Update the endpoint to include class filtering
        const response = await fetch(`${API_BASE_URL}/resume/group/${user.group_id}?class=${user.class}`);
        const data: ResumeData[] = await response.json();

        const voteData: { [key: number]: VoteData } = {};
        const checkboxData: { [key: number]: boolean } = {};  // New state tracking checkboxes

        data.forEach((resume) => {
          const { resume_number, vote, checked } = resume;

          if (!voteData[resume_number]) {
            voteData[resume_number] = { yes: 0, no: 0, undecided: 0 };
          }

          if (vote === "yes") {
            voteData[resume_number].yes += 1;
          } else if (vote === "no") {
            voteData[resume_number].no += 1;
          } else if (vote === "unanswered") {
            voteData[resume_number].undecided += 1;
          }

          checkboxData[resume_number] = checked;  // Store checkbox state
        });

        setVoteCounts(voteData);
        setCheckedState(checkboxData);  // Load checkboxes
      } catch (error) {
        console.error("Error fetching resume data:", error);
      }
    };
    
    if (user) {
      fetchData();
    }
  }, [user]);

  // Handle checkbox toggle
  const handleCheckboxChange = (resumeNumber: number) => {
    if (!socket || !isConnected) {
      console.warn("Socket not connected. Checkbox state not sent.");
      return;
    }
  
    const newCheckedState = !checkedState[resumeNumber];
    const roomId = `group_${user!.group_id}_class_${user!.class}`;
  
    console.log(`Sending checkbox update to room ${roomId}:`);
    console.log(`Resume ${resumeNumber}, Checked: ${newCheckedState}`);
  
    // Don't update local state immediately - wait for server confirmation
    // This ensures all group members see the same state
    socket.emit("check", {
      group_id: roomId,
      resume_number: resumeNumber,
      checked: newCheckedState,
    });
  };

  const handleSelectPreview = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const num = parseInt(e.target.value, 10);
    setSelectedResumeNumber(isNaN(num) ? '' : num);
    const resume = resumes.find(r => r.resume_number === num);
    if (resume) console.log('Selected file path:', resume.file_path);
  };

  const selectedResume = resumes.find(r => r.resume_number === selectedResumeNumber);

  const completeResumes = () => {
    const selectedCount = Object.values(checkedState).filter((checked) => checked).length;
    if (selectedCount !== 4) {
      alert("You must select exactly 4 resumes before proceeding.");
      return;
    }
    localStorage.setItem("progress", "interview-stage")
    window.location.href = "/interview-stage"; 
    socket.emit("moveGroup", {groupId: user!.group_id, classId: user!.class, targetPage: "/interview-stage"});
  };

  // Calculate selected resume count
  const selectedCount = Object.values(checkedState).filter((checked) => checked).length;

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
  

  if (!user || user.affiliation !== "student") {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand font-rubik">
      {showInstructions && (
        <Instructions 
          instructions={resumeInstructions}
          onDismiss={() => setShowInstructions(false)}
          title="Resume Review Pt.2 Instructions"
          progress={2}
        />
      )}
      <Navbar />

      <div className="flex flex-1 px-12 py-8 gap-8">
        {/* LEFT: select & preview box */}
        <div className="w-1/2 flex flex-col">
          <div className="mb-4 p-4 bg-white border-4 border-northeasternRed rounded-lg">
            <label className="block mb-2 font-semibold text-navy">
              Select a resume to preview
            </label>
            <select
              className="w-full p-2 border border-wood bg-springWater rounded-md"
              value={selectedResumeNumber}
              onChange={handleSelectPreview}
            >
              <option value="">— choose resume —</option>
              {resumes.slice(0,10).map(r => (
                <option key={r.resume_number} value={r.resume_number}>
                  Resume {r.resume_number}
                </option>
              ))}
            </select>
          </div>
          {selectedResume && (
            <div className="flex-1 border-4 border-northeasternBlack rounded-lg overflow-hidden">
              <iframe
                src={`${getResumeUrl(selectedResume.file_path)}#toolbar=0&navpanes=0&statusbar=0&messages=0`}
                title={`Resume Preview ${selectedResume.resume_number}`}
                className="w-full h-full rounded border-none"
              />
            </div>
          )}
        </div>

        {/* RIGHT: 2 columns × 5 rows of cards */}
        <div className="w-1/2 grid grid-cols-2 grid-rows-5 gap-4 overflow-y-auto">
          {resumes.slice(0,10).map((resume) => {
            const n = resume.resume_number;
            const votes = voteCounts[n] || { yes: 0, no: 0, undecided: 0 };
            return (
              <div
                key={n}
                className="bg-gray-100 border-4 border-northeasternRed rounded-2xl shadow-xl p-6 flex flex-col justify-between transition"
              >
                <h3 className="text-xl font-semibold text-navy mb-2">
                  Resume {n}
                </h3>
                <a
                  href={`${API_BASE_URL}/${resume.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-northeasternRed font-bold underline mb-4"
                >
                  View Full
                </a>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✔ Yes</span>
                    <span className="font-semibold">{votes.yes}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded">✖ No</span>
                    <span className="font-semibold">{votes.no}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">? Skip</span>
                    <span className="font-semibold">{votes.undecided}</span>
                  </div>
                </div>
                <label className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    checked={checkedState[n] || false}
                    onChange={() => handleCheckboxChange(n)}
                  />
                  <span className="ml-2 text-navy">Select</span>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between px-12 py-6">
        <button
          onClick={() => router.push("/res-review")}
          disabled={true}
          className="px-4 py-2 bg-redHeader text-white rounded-lg shadow hover:bg-blue-400 transition"
        >
          ← Back: Resume Review Pt.1
        </button>
        <button
          onClick={completeResumes}
          disabled={selectedCount !== 4}
          className={`px-4 py-2 rounded-lg shadow font-bold transition ${
            selectedCount === 4
              ? "bg-redHeader text-white hover:bg-blue-400"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
        >
          Next: Interview Stage →
        </button>
      </div>

      <Footer />
    </div>
  );
}