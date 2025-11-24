"use client";
export const dynamic = "force-dynamic";
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import React, { useState, useEffect, useRef } from "react";
import Instructions from "../components/instructions";
import Navbar from "../components/navbar";
import { usePathname, useRouter } from "next/navigation";
import { useProgress } from "../components/useProgress";
import Footer from "../components/footer";
import Popup from "../components/popup";
import { useProgressManager } from "../components/progress";
import { useSocket } from "../components/socketContext";
import { useAuth } from "../components/AuthContext";


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
  const [showInstructions, setShowInstructions] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const [selectedResumeNumber, setSelectedResumeNumber] = useState<number | "">("");
  const socket = useSocket();
  const initialFetchDone = useRef(false);
  const { user, loading: userloading } = useAuth();

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
  }, [user?.group_id]);

  // OPTIMIZED: Fetch resumes and votes ONCE on page load
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.class || initialFetchDone.current) return;
      initialFetchDone.current = true;

      try {
        // Fetch resumes
        console.log("📄 [INITIAL-FETCH] Fetching resumes for class:", user.class);
        const resumeResponse = await fetch(`${API_BASE_URL}/resume_pdf?class_id=${user.class}`, { credentials: "include" });
        const resumeData: { file_path: string; id: number; title: string, first_name: string, last_name: string }[] = await resumeResponse.json();

        // Fetch votes
        console.log("📊 [INITIAL-FETCH] Fetching votes for group:", user.group_id, "class:", user.class);
        const voteResponse = await fetch(`${API_BASE_URL}/resume/group/${user.group_id}?class=${user.class}`, {credentials: "include"});
        const voteData: ResumeData[] = await voteResponse.json();

        // Process vote data
        const voteCounts: { [key: number]: VoteData } = {};
        const checkboxData: { [key: number]: boolean } = {};

        voteData.forEach((resume) => {
          const { resume_number, vote, checked } = resume;
          
          if (!voteCounts[resume_number]) {
            voteCounts[resume_number] = { yes: 0, no: 0, undecided: 0 };
          }

          if (vote === "yes") voteCounts[resume_number].yes += 1;
          else if (vote === "no") voteCounts[resume_number].no += 1;
          else if (vote === "unanswered") voteCounts[resume_number].undecided += 1;

          checkboxData[resume_number] = checked;
        });

        console.log("📊 [INITIAL-FETCH] Processed vote counts:", voteCounts);
        console.log("📊 [INITIAL-FETCH] Processed checkbox states:", checkboxData);

        setVoteCounts(voteCounts);
        setCheckedState(checkboxData);

        // Format resumes
        const formatted: Resume[] = resumeData.map(item => ({
          resume_number: item.id,
          file_path: item.file_path,
          checked: checkboxData[item.id] || false,
          vote: voteCounts[item.id]
            ? voteCounts[item.id].yes > voteCounts[item.id].no
              ? "yes"
              : "no"
            : "unanswered",
          first_name: item.first_name,
          last_name: item.last_name
        }));

        console.log("📄 [INITIAL-FETCH] Formatted resumes:", formatted);
        setResumes(formatted);

      } catch (error) {
        console.error("❌ [INITIAL-FETCH] Error:", error);
      }
    };

    fetchInitialData();
  }, [user?.group_id, user?.class]);

  // OPTIMIZED: Socket listeners with live updates (NO REFETCHING)
  useEffect(() => {
    if (!socket || !user) return;

    console.log("Socket connected:", socket.id);
    setIsConnected(true);
    
    const roomId = `group_${user.group_id}_class_${user.class}`;
    console.log("Joining room:", roomId);
    socket.emit("joinGroup", roomId);

    // Update checkbox state live
    const handleCheckboxUpdated = ({ resume_number, checked }: { resume_number: number; checked: boolean }) => {
      console.log(`Received checkbox update: Resume ${resume_number}, Checked: ${checked}`);
      setCheckedState((prev) => ({
        ...prev,
        [resume_number]: checked,
      }));
    };

    // NEW: Update vote counts live WITHOUT refetching
    const handleVoteUpdated = ({ resume_number, oldVote, newVote }: { 
      resume_number: number; 
      oldVote: string;
      newVote: string;
    }) => {
      console.log(`Vote update: Resume ${resume_number}, ${oldVote} -> ${newVote}`);
      setVoteCounts(prev => {
        const current = prev[resume_number] || { yes: 0, no: 0, undecided: 0 };
        const updated = { ...current };
        
        // Remove old vote
        if (oldVote === "yes") updated.yes = Math.max(0, updated.yes - 1);
        else if (oldVote === "no") updated.no = Math.max(0, updated.no - 1);
        else if (oldVote === "unanswered") updated.undecided = Math.max(0, updated.undecided - 1);
        
        // Add new vote
        if (newVote === "yes") updated.yes += 1;
        else if (newVote === "no") updated.no += 1;
        else if (newVote === "unanswered") updated.undecided += 1;
        
        return { ...prev, [resume_number]: updated };
      });
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
    socket.on("voteUpdated", handleVoteUpdated); // NEW
    socket.on("teamConfirmSelection", handleTeamConfirmSelection);
    socket.on("teamUnconfirmSelection", handleTeamUnconfirmSelection);
    socket.on("moveGroup", handleMoveGroup);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("checkboxUpdated", handleCheckboxUpdated);
      socket.off("voteUpdated", handleVoteUpdated); // NEW
      socket.off("teamConfirmSelection", handleTeamConfirmSelection);
      socket.off("teamUnconfirmSelection", handleTeamUnconfirmSelection);
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
  }, [socket, user?.email, pathname]);

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

  const getResumeUrl = (filePath: string) => {
    const fileName = filePath.split('/').pop()!;
    return `${API_BASE_URL}/resume_pdf/resumes/${encodeURIComponent(fileName)}`;
  };

  const handleCheckboxChange = (resumeNumber: number) => {
    if (!socket || !isConnected) {
      console.warn("Socket not connected. Checkbox state not sent.");
      return;
    }

    const newCheckedState = !checkedState[resumeNumber];
    const roomId = `group_${user!.group_id}_class_${user!.class}`;

    console.log(`Sending checkbox update to room ${roomId}:`);
    console.log(`Resume ${resumeNumber}, Checked: ${newCheckedState}`);

    if (hasConfirmed) {
      const currentSelected = Object.entries(checkedState)
        .filter(([_, isChecked]) => isChecked)
        .map(([num, _]) => parseInt(num));
      
      let newSelection: number[];
      if (newCheckedState) {
        newSelection = [...currentSelected, resumeNumber];
      } else {
        newSelection = currentSelected.filter(num => num !== resumeNumber);
      }

      const selectionChanged = JSON.stringify(newSelection.sort()) !== JSON.stringify(confirmedSelection.sort());
      
      if (selectionChanged) {
        setHasConfirmed(false);
        setTeamConfirmations(prev => prev.filter(id => id !== user!.id.toString()));
        
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

  const handleTeamConfirm = () => {
    if (!socket || !user || hasConfirmed) return;
    
    const currentSelected = Object.entries(checkedState)
      .filter(([_, isChecked]) => isChecked)
      .map(([num, _]) => parseInt(num));
    setConfirmedSelection(currentSelected);
    
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
  const selectedCount = Object.values(checkedState).filter((checked) => checked).length;

  if (loading || userloading) {
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
        <div className="w-1/2 flex flex-col">
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

        <div className="w-1/2 flex flex-col">
          <div className="mb-4 p-4 bg-gray-100 border-4 border-northeasternRed rounded-lg">
            <h3 className="font-bold text-navy mb-2">✅ Group Selection (Shared)</h3>
            <p className="text-sm text-navy">
              Select exactly 4 resumes as a group to advance to interviews. When anyone in your group checks or unchecks a resume, everyone will see the change in real-time.
            </p>
          </div>

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

      <div className="flex justify-between items-center px-12 py-6">
        <button
          onClick={() => router.push("/res-review")}
          disabled={true}
          className="px-4 py-2 bg-redHeader text-white rounded-lg shadow hover:bg-blue-400 transition"
        >
          ← Back: Resume Review Pt.1
        </button>

        <div className="flex flex-col items-center gap-4">
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

          <div className="flex gap-4">
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