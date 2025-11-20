"use client";
export const dynamic = "force-dynamic";
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import React, { useState, useEffect } from "react";
import Instructions from "../components/instructions";
import Navbar from "../components/navbar";
import { usePathname, useRouter } from "next/navigation";
import { useProgress } from "../components/useProgress";
import Footer from "../components/footer";
import Popup from "../components/popup";
import { useProgressManager } from "../components/progress";
import { useSocket } from "../components/socketContext";


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
    first_name: string;
    last_name: string;
    vote: "yes" | "no" | "unanswered";
  }

  const {updateProgress, fetchProgress} = useProgressManager();
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
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
  const socket = useSocket();

  // Team confirmation state
  const [teamConfirmations, setTeamConfirmations] = useState<string[]>([]);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [groupSize, setGroupSize] = useState(4);
  const [confirmedSelection, setConfirmedSelection] = useState<number[]>([]);

  
  const resumeInstructions = [
    "Review the resumes and decide as a group which 4 candidates continue.",
    "You will then watch the interviews of the candidates selected."
  ];  

  // Fetch group size
  useEffect(() => {
    const fetchGroupSize = async () => {
      if (!user?.group_id) return;
      try {
        const response = await fetch(`${API_BASE_URL}/interview/group-size/${user.group_id}/${user.class}`, { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setGroupSize(data.count);
        }
      } catch (err) {
        console.error("Failed to fetch group size:", err);
      }
    };

    if (user?.group_id) {
      fetchGroupSize();
    }
  }, [user]);
             
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await response.json();
        
        if (response.ok) {
          setUser(userData);
          updateProgress(userData, "res_2");
        } else {
          setUser(null);
          router.push("/"); // Redirect to login if unauthorized
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        router.push("/"); // Redirect on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [router]);
    
  useEffect(() => {
    console.log("Resumes has changes:", resumes)
  }, [resumes]);

  useEffect(() => {
    if (!socket || !user) return;

    console.log("Socket connected:", socket.id);
    setIsConnected(true);
    
    const roomId = `group_${user.group_id}_class_${user.class}`;
    console.log("Joining room:", roomId);
    socket.emit("joinGroup", roomId);

    const handleCheckboxUpdated = ({ resume_number, checked }: { resume_number: number; checked: boolean }) => {
      console.log(`Received checkbox update: Resume ${resume_number}, Checked: ${checked}`);
      setCheckedState((prev) => ({
        ...prev,
        [resume_number]: checked,
      }));
    };

    const handleTeamConfirmSelection = ({ studentId, groupId, classId }: { 
      studentId: string; 
      groupId: number; 
      classId: number 
    }) => {
      if (groupId === user.group_id && classId === user.class) {
        setTeamConfirmations(prev => {
          if (!prev.includes(studentId)) {
            return [...prev, studentId];
          }
          return prev;
        });
      }
    };

    // NEW: Handle team unconfirm event
    const handleTeamUnconfirmSelection = ({ studentId, groupId, classId }: { 
      studentId: string; 
      groupId: number; 
      classId: number 
    }) => {
      if (groupId === user.group_id && classId === user.class) {
        setTeamConfirmations(prev => prev.filter(id => id !== studentId));
      }
    };

    const handleMoveGroup = ({ groupId, classId, targetPage }: { 
      groupId: number; 
      classId: number; 
      targetPage: string 
    }) => {
      if (groupId === user.group_id && classId === user.class) {
        console.log(`Group navigation triggered: moving to ${targetPage}`);
        updateProgress(user, "interview");
        localStorage.setItem("progress", "interview");
        window.location.href = targetPage; 
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnect = () => {
      console.log("Socket reconnected:", socket.id);
      setIsConnected(true);
      const roomId = `group_${user.group_id}_class_${user.class}`;
      socket.emit("joinGroup", roomId);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("checkboxUpdated", handleCheckboxUpdated);
    socket.on("teamConfirmSelection", handleTeamConfirmSelection);
    socket.on("teamUnconfirmSelection", handleTeamUnconfirmSelection); // NEW
    socket.on("moveGroup", handleMoveGroup);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("checkboxUpdated", handleCheckboxUpdated);
      socket.off("teamConfirmSelection", handleTeamConfirmSelection);
      socket.off("teamUnconfirmSelection", handleTeamUnconfirmSelection); // NEW
      socket.off("moveGroup", handleMoveGroup);
    };
  }, [socket, user]);

  // Student online and page change
  useEffect(() => {
    if (!socket || !user || !user.email) return;

    socket.emit("studentOnline", { studentId: user.email }); 
    
    socket.emit("studentPageChanged", { studentId: user.email, currentPage: pathname });
    
    const updateCurrentPage = async () => {
      try {
        await fetch(`${API_BASE_URL}/users/update-currentpage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 'resumepage2', user_email: user.email }),
          credentials: "include"
        });
      } catch (error) {
        console.error("Error updating current page:", error);
      }
    };
    
    updateCurrentPage(); 
  }, [socket, user, pathname]);

  // Complete resumes function
  const completeResumes = () => {
    if (!socket || !user) {
      console.error('Socket or user not available');
      return;
    }

    const selectedCount = Object.values(checkedState).filter((checked) => checked).length;
    if (selectedCount !== 4) {
      setPopup({ headline: "Selection Error", message: "Please select exactly 4 resumes to proceed." });
      return;
    }

    // Check if all team members have confirmed
    if (teamConfirmations.length < groupSize) {
      setPopup({ 
        headline: "Team Confirmation Required", 
        message: `All ${groupSize} team members must confirm the selection before proceeding to interviews.` 
      });
      return;
    }

    localStorage.setItem("progress", "interview");
    updateProgress(user, "interview");
    window.location.href = "/interview-stage"; 
    
    socket.emit("moveGroup", {
      groupId: user.group_id, 
      classId: user.class, 
      targetPage: "/interview-stage"
    });
  };

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

  const fetchResumes = async (userClass: number) => {
    try {
      console.log("📄 [FETCH-RESUMES] Fetching resumes for class:", userClass);
      const response = await fetch(`${API_BASE_URL}/resume_pdf?class_id=${userClass}`, { credentials: "include" });
      const data: { file_path: string; id: number; title: string, first_name: string, last_name: string }[] = await response.json();

      console.log("📄 [FETCH-RESUMES] Raw resume data from API:", data);
      console.log("📄 [FETCH-RESUMES] Number of resumes:", data.length);
      
      data.forEach((resume, index) => {
        console.log(`📄 [FETCH-RESUMES] Resume ${index}:`, {
          id: resume.id,
          title: resume.title,
          first_name: resume.first_name,
          last_name: resume.last_name,
          file_path: resume.file_path
        });
      });
    
      const formatted: Resume[] = data.map(item => ({
        resume_number: item.id,
        file_path: item.file_path,
        checked: checkedState[item.id] || false,
        vote: voteCounts[item.id]
          ? voteCounts[item.id].yes > voteCounts[item.id].no
            ? "yes"
            : "no"
          : "unanswered",
        first_name: item.first_name,
        last_name: item.last_name
      }));

      console.log("📄 [FETCH-RESUMES] Formatted resumes:", formatted);
      setResumes(formatted);
    } catch (error) {
      console.error("❌ [FETCH-RESUMES] Error fetching resumes:", error);
    }
  };

  const getResumeUrl = (filePath: string) => {
    const fileName = filePath.split('/').pop()!;
    return `${API_BASE_URL}/resume_pdf/resumes/${encodeURIComponent(fileName)}`;
  };

  useEffect(() => {
    if (user?.class) {
      fetchResumes(user.class);
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user || !user.class) {
          console.log("⚠️ [FETCH-VOTES] User or class not available yet");
          return;
        }

        console.log("📊 [FETCH-VOTES] Fetching vote data for group:", user.group_id, "class:", user.class);
        
        const response = await fetch(`${API_BASE_URL}/resume/group/${user.group_id}?class=${user.class}`, {  credentials: "include"});
        const data: ResumeData[] = await response.json();

        console.log("📊 [FETCH-VOTES] Raw data from backend:", data);
        console.log("📊 [FETCH-VOTES] Number of vote records:", data.length);

        const voteData: { [key: number]: VoteData } = {};
        const checkboxData: { [key: number]: boolean } = {};

        data.forEach((resume, index) => {
          const { resume_number, vote, checked } = resume;
          
          console.log(`📊 [FETCH-VOTES] Processing record ${index}:`, {
            resume_number,
            vote,
            checked
          });

          if (!voteData[resume_number]) {
            voteData[resume_number] = { yes: 0, no: 0, undecided: 0 };
          }

          if (vote === "yes") {
            voteData[resume_number].yes += 1;
            console.log(`✅ [FETCH-VOTES] Resume ${resume_number}: Added YES vote (total: ${voteData[resume_number].yes})`);
          } else if (vote === "no") {
            voteData[resume_number].no += 1;
            console.log(`❌ [FETCH-VOTES] Resume ${resume_number}: Added NO vote (total: ${voteData[resume_number].no})`);
          } else if (vote === "unanswered") {
            voteData[resume_number].undecided += 1;
            console.log(`⏭️ [FETCH-VOTES] Resume ${resume_number}: Added UNANSWERED vote (total: ${voteData[resume_number].undecided})`);
          }

          checkboxData[resume_number] = checked;
        });

        console.log("📊 [FETCH-VOTES] Final vote counts:", voteData);
        console.log("📊 [FETCH-VOTES] Final checkbox states:", checkboxData);

        setVoteCounts(voteData);
        setCheckedState(checkboxData);
      } catch (error) {
        console.error("❌ [FETCH-VOTES] Error fetching resume data:", error);
      }
    };
    
    if (user) {
      fetchData();
    }
  }, [user]);
  const handleCheckboxChange = (resumeNumber: number) => {
    if (!socket || !isConnected) {
      console.warn("Socket not connected. Checkbox state not sent.");
      return;
    }

    const newCheckedState = !checkedState[resumeNumber];
    const roomId = `group_${user!.group_id}_class_${user!.class}`;

    console.log(`Sending checkbox update to room ${roomId}:`);
    console.log(`Resume ${resumeNumber}, Checked: ${newCheckedState}`);

    // If user has confirmed and they're changing the selection, unconfirm them
    if (hasConfirmed) {
      // Check if this change would alter the confirmed selection
      const currentSelected = Object.entries(checkedState)
        .filter(([_, isChecked]) => isChecked)
        .map(([num, _]) => parseInt(num));
      
      let newSelection: number[];
      if (newCheckedState) {
        newSelection = [...currentSelected, resumeNumber];
      } else {
        newSelection = currentSelected.filter(num => num !== resumeNumber);
      }

      // If the selection has changed from what was confirmed, unconfirm
      const selectionChanged = JSON.stringify(newSelection.sort()) !== JSON.stringify(confirmedSelection.sort());
      
      if (selectionChanged) {
        setHasConfirmed(false);
        
        // Remove user from team confirmations
        setTeamConfirmations(prev => prev.filter(id => id !== user!.id.toString()));
        
        // Emit unconfirm event to other team members
        socket.emit("teamUnconfirmSelection", {
          groupId: user!.group_id,
          classId: user!.class,
          studentId: user!.id.toString(),
          roomId: roomId
        });
      }
    }

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

  // Team confirmation handler
  const handleTeamConfirm = () => {
    if (!socket || !user || hasConfirmed) return;
    
    setHasConfirmed(true);
    setTeamConfirmations(prev => {
      if (!prev.includes(user.id.toString())) {
        return [...prev, user.id.toString()];
      }
      return prev;
    });

    socket.emit("teamConfirmSelection", {
      groupId: user.group_id,
      classId: user.class,
      studentId: user.id.toString(),
      roomId: `group_${user.group_id}_class_${user.class}`
    });
  };

  const selectedResume = resumes.find(r => r.resume_number === selectedResumeNumber);

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
        {/* LEFT: Resume viewer section */}
        <div className="w-1/2 flex flex-col">
          {/* Instructions for resume viewer */}
          <div className="mb-4 p-4 bg-gray-100 border-4 border-northeasternRed rounded-lg">
            <h3 className="font-bold text-navy mb-2">📖 Resume Viewer (Individual)</h3>
            <p className="text-sm text-navy">
              Use the dropdown below to preview individual resumes. This viewer is for your personal use - other group members won't see what you're viewing here.
            </p>
          </div>

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
                 {r.first_name} {r.last_name}
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

        {/* RIGHT: Resume selection section */}
        <div className="w-1/2 flex flex-col">
          {/* Instructions for resume selection */}
          <div className="mb-4 p-4 bg-gray-100 border-4 border-northeasternRed rounded-lg">
            <h3 className="font-bold text-navy mb-2">✅ Group Selection (Shared)</h3>
            <p className="text-sm text-navy">
              Select exactly 4 resumes as a group to advance to interviews. When anyone in your group checks or unchecks a resume, everyone will see the change in real-time.
            </p>
          </div>

          {/* 2 columns × 5 rows of cards */}
          <div className="flex-1 grid grid-cols-2 grid-rows-5 gap-4 overflow-y-auto">
            {resumes.slice(0,10).map((resume) => {
              const n = resume.resume_number;
              const votes = voteCounts[n] || { yes: 0, no: 0, undecided: 0 };
              return (
                <div
                  key={n}
                  className="bg-gray-100 border-4 border-northeasternRed rounded-2xl shadow-xl p-6 flex flex-col justify-between transition"
                >
                  <h3 className="text-xl font-semibold text-navy mb-2">
                    {resume.first_name} {resume.last_name}
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
      </div>

      {/* Enhanced bottom navigation with team confirmation */}
      <div className="flex justify-between items-center px-12 py-6">
        <button
          onClick={() => router.push("/res-review")}
          disabled={true}
          className="px-4 py-2 bg-redHeader text-white rounded-lg shadow hover:bg-blue-400 transition"
        >
          ← Back: Resume Review Pt.1
        </button>

        {/* Team Confirmation Section */}
        <div className="flex flex-col items-center gap-4">
          {/* Selection Status */}
          <div className="text-center">
            <p className={`font-bold ${selectedCount === 4 ? 'text-green-600' : 'text-orange-600'}`}>
              {selectedCount}/4 candidates selected
            </p>
            {selectedCount === 4 && (
              <p className="text-sm text-navy">
                Team Confirmation: {teamConfirmations.length}/{groupSize} members ready
              </p>
            )}
          </div>

          {/* Confirmation and Proceed Buttons */}
          <div className="flex gap-4">
            {/* Team Confirm Button */}
            {selectedCount === 4 && teamConfirmations.length < groupSize && (
              <button
                onClick={handleTeamConfirm}
                disabled={hasConfirmed}
                className={`px-6 py-2 rounded-lg shadow font-bold transition ${
                  hasConfirmed
                    ? "bg-green-500 text-white cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {hasConfirmed 
                  ? `✓ Confirmed (${teamConfirmations.length}/${groupSize})` 
                  : 'Confirm Selection'}
              </button>
            )}

            {/* Proceed Button */}
            <button
              onClick={completeResumes}
              disabled={selectedCount !== 4 || teamConfirmations.length < groupSize}
              className={`px-6 py-2 rounded-lg shadow font-bold transition ${
                selectedCount === 4 && teamConfirmations.length >= groupSize
                  ? "bg-redHeader text-white hover:bg-blue-400"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              }`}
            >
              {teamConfirmations.length >= groupSize 
                ? "Next: Interview Stage →" 
                : `Waiting for team confirmation (${teamConfirmations.length}/${groupSize})`
              }
            </button>
          </div>

          {/* Waiting message */}
          {selectedCount === 4 && teamConfirmations.length > 0 && teamConfirmations.length < groupSize && (
            <p className="text-xs text-orange-600 text-center">
              Waiting for {groupSize - teamConfirmations.length} more team member{groupSize - teamConfirmations.length !== 1 ? 's' : ''} to confirm
            </p>
          )}
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
    </div>
  );
}