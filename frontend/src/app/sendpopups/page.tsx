"use client";
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavbarAdmin from "../components/navbar-admin";
import Popup from "../components/popup";
import AdminReactionPopup from "../components/adminReactionPopup";
import { useSocket } from "../components/socketContext";

const socket = useSocket(); 

const SendPopups = () => {
  interface User {
    affiliation: string;
    email: string;
  }

  interface Group {
    group_id: string;
    students: any[];
  }

  interface ModeratorClass {
  crn: number;
  nom_groups: number;
  }

  interface Candidate {
    name: string;
    resume_id: number;
  }

  interface Student {
    f_name: string;
    l_name: string;
    email: string;
  }
    
    const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
    const [user, setUser] = useState<{ affiliation: string; email?: string; class:number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState<Record<string, any>>({});
    const [selectedGroup, setSelectedGroup] = useState<string>(""); // Changed from selectedGroups array to single group
    const [headline, setHeadline] = useState("");
    const [message, setMessage] = useState(""); 
    const [sending, setSending] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState<string>("");
    const [classes, setClasses] = useState<{id: number, name: string}[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>("");
    const router = useRouter(); 
    const [pendingOffers, setPendingOffers] = useState<{ classId: number; groupId: number; candidateId: number }[]>([]);
    const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<string>("");


    const checkGroupProgress = async (groupId: string, classId: string, requiredLocation: string): Promise<boolean> => {
      try {
        const response = await fetch(`${API_BASE_URL}/progress/group/${classId}/${groupId}`, {
          credentials: 'include'
        });
        const data = await response.json();
        return data.some((student: { step: string }) => student.step === requiredLocation);
      } catch (error) {
        console.error('Error checking group progress:', error);
        return false;
      }
    };

  const presetPopups = [
    {
      title: "Internal Referral",
      headline: "Internal Referral",
      message:
        "{candidateName} has an internal referral for this position! The averages of scores will be skewed in favor of the candidate!",
      location: "interview",
      vote: {
        overall: 10,
        professionalPresence: 0,
        qualityOfAnswer: 0,
        personality: 0,
      }
    },
    {
      title: "No Show",
      headline: "Abandoned Interview",
      message:
        "{candidateName} did not show up for the interview. You can change the scores, but everything will be saved as the lowest score.",
      location: "interview",
      vote: {
        overall: -1000,
        professionalPresence: -1000,
        qualityOfAnswer: -1000,
        personality: -1000,
      }
    },
    {
      title: "Resume Discrepancy",
      headline: "Inconsistent Information",
      message:
        "{candidateName}'s resume did not align with their responses during the interview and they couldn't explain their projects, raising concerns about accuracy.",
      location: "interview",
      vote: {
        overall: -5,
        professionalPresence: 0,
        qualityOfAnswer: -10,
        personality: 0,
      }
    }, 
    {
      title: "Late Arrival",
      headline: "Late Interview Start",
      message:
        "{candidateName} arrived late to the interview. This may have impacted the flow and available time for questions.",
      location: "interview",
      vote: {
        overall: -5,
        professionalPresence: -10,
        qualityOfAnswer: 0,
        personality: 0,
      }
    },
  ];

    // Fetch the logged-in user
    useEffect(() => {
      const fetchUser = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
          const userData = await response.json();
          console.log("Fetched user data:", userData);

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
    }, []);

  useEffect(() => {
  const fetchCandidates = async () => {
    // Only fetch candidates if class is selected AND group is selected (for presets)
    if (!selectedClass || (selectedPreset && !selectedGroup)) {
      setCandidates([]);
      return;
    }
    
    try {
      let url;
      if (selectedGroup) {
        // Fetch candidates being interviewed by selected group
        url = `${API_BASE_URL}/candidates/by-groups/${selectedClass}/${selectedGroup}`;
      } else {
        // Fallback to all candidates in class (for non-preset popups)
        url = `${API_BASE_URL}/candidates/by-class/${selectedClass}`;
      }
      
      console.log("Fetching candidates from:", url);
      
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) {
        const candidatesData = await response.json();
        
        // Format the data to include the name field
        const formattedCandidates = candidatesData.map((candidate: any) => ({
          resume_id: candidate.id || candidate.resume_id,
          name: `${candidate.f_name} ${candidate.l_name}`,
          f_name: candidate.f_name,
          l_name: candidate.l_name
        }));
        
        console.log("Formatted candidates:", formattedCandidates);
        setCandidates(formattedCandidates);
      } else {
        console.error("Failed to fetch candidates");
        setCandidates([]);
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
      setCandidates([]);
    }
  };

  fetchCandidates();
}, [selectedClass, selectedGroup, selectedPreset]); // Updated dependencies

    // Fetch available classes
    useEffect(() => {
      const fetchAssignedClasses = async () => {
        console.log("Fetching assigned classes for user:", user?.email);
        if (user?.email && user.affiliation === "admin") {
          try {
            // First get the assigned class IDs
            const response = await fetch(`${API_BASE_URL}/moderator/classes-full/${user.email}`, { credentials: "include" });
            if (!response.ok) {
              throw new Error(`Error: ${response.status}`);
            }
            const data = await response.json() as ModeratorClass[];
            console.log("Admin's assigned classes (full data):", data);
            
            const classIds = data.map((item: ModeratorClass) => String(item.crn));
            console.log("Extracted class IDs:", classIds);
            
            setAssignedClassIds(classIds);
            setClasses(data.map((item: ModeratorClass) => ({
              id: item.crn,
              name: `CRN ${item.crn}`
            })));
            console.log("Classes set:", classes);
          } catch (error) {
            console.error("Error fetching moderator classes:", error);
          }
        }
      };
      fetchAssignedClasses();
    }, [user]);

  useEffect(() => {
      const fetchGroups = async () => {
          if (!selectedClass) return;
          
          try {
              // Fetch students instead of groups, then group them by group_id
              console.log("Fetching students for class:", selectedClass);
              const response = await fetch(`${API_BASE_URL}/groups/students-by-class/${selectedClass}`, { credentials: "include" });
              const studentsData = await response.json();
              console.log(studentsData);
              // Group students by their group_id
              const groupedData: Record<string, any[]> = {};
              
              studentsData.map((student: any) => {
                  if (student.group_id) {
                      const groupId = student.group_id.toString();
                      if (!groupedData[groupId]) {
                          groupedData[groupId] = [];
                      }
                      groupedData[groupId].push({
                          name: student.f_name && student.l_name 
                              ? `${student.f_name} ${student.l_name}` 
                              : student.email.split('@')[0],
                          email: student.email,
                          online: student.online || false,
                          current_page: student.current_page || 'No page',
                          job_des: student.job_des || 'No job'
                      });
                  }
              });
              
              console.log("Grouped students data:", groupedData);
              setGroups(groupedData);
          } catch (error) {
              console.error("Error fetching students:", error);
          }
      };

      if (selectedClass) {
          fetchGroups();
      }
  }, [selectedClass]);

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

  if (!user || user.affiliation !== "admin") {
    return <div>This account is not authorized to access this page. Please log in with an admin account.</div>;
  }

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(e.target.value);
    setSelectedGroup(""); // Reset selected group when class changes
    setSelectedCandidate("");
  };

  // Updated to handle single group selection
  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGroup(e.target.value);
    setSelectedCandidate(""); // Reset candidate when group changes
  };

  const handlePresetSelection = (presetTitle: string) => {
    setSelectedPreset(presetTitle);
    const preset = presetPopups.find((p) => p.title === presetTitle);
    if (preset) {
      setHeadline(preset.headline);
      setMessage(preset.message);
    }
    setSelectedCandidate("");
  };

  const handleCandidateSelection = (candidateId: string) => {
    setSelectedCandidate(candidateId);
    if (selectedPreset) {
      const preset = presetPopups.find((p) => p.title === selectedPreset);
      const candidate = candidates.find((c) => c.resume_id.toString() === candidateId);
      
      if (preset && candidate) {
        const messageWithName = preset.message.replace('{candidateName}', candidate.name);
        setMessage(messageWithName);
      }
    }
  };

  const sendPopups = async () => {
    if (!headline || !message || !selectedGroup) {
      setPopup({ headline: "Error", message: "Please fill in all fields and select a group." });
      return;
    }

    if (!socket) {
      setPopup({ headline: "Error", message: "Socket not connected. Please refresh the page." });
      return;
    }

    const selectedPresetData = presetPopups.find(p => p.title === selectedPreset);
    if (selectedPresetData) {
      if (!selectedCandidate) {
        setPopup({ headline: "Error", message: "Please select a candidate for this preset popup." });
        return;
      }
      
      // Validate that the selected candidate is actually being interviewed by the selected group
      if (candidates.length === 0) {
        setPopup({ headline: "Error", message: "The selected group is not currently interviewing any candidates." });
        return;
      }
    }

    setSending(true);

    try {
      const selectedPresetData = presetPopups.find(p => p.title === selectedPreset);
      
      if (selectedPresetData) {
        const hasValidProgress = await checkGroupProgress(selectedGroup, selectedClass, selectedPresetData.location);
        
        if (!hasValidProgress) {
          setPopup({ 
            headline: "Warning", 
            message: `Group ${selectedGroup} is not at the ${selectedPresetData.location} stage and will not receive the popup.` 
          });
          setSending(false);
          return;
        }

        console.log("emitting sent if have vote data, vote:", selectedPresetData.vote, "all, ", selectedPresetData);
        
        if (selectedPresetData.vote) {
          console.log("emitting updateRatingsWithPreset");
          socket.emit("updateRatingsWithPresetBackend", {
            classId: selectedClass,
            groupId: selectedGroup,
            vote: selectedPresetData.vote,
            candidateId: selectedCandidate,
            isNoShow: selectedPresetData.title === "No Show"
          });
        }

        // Get the candidate name for the socket emission
        const selectedCandidateData = candidates.find(c => c.resume_id.toString() === selectedCandidate);
        const candidateName = selectedCandidateData ? selectedCandidateData.name : `Candidate ${selectedCandidate}`;

        socket.emit("sendPopupToGroups", {
          groups: [selectedGroup],
          headline,
          message,
          class: selectedClass, 
          candidateId: selectedCandidate,
          candidateName: candidateName,
        });

        setPopup({ 
          headline: "Success", 
          message: `Popup sent successfully to Group ${selectedGroup} about ${candidateName}!` 
        });
      } else {
        socket.emit("sendPopupToGroups", {
          groups: [selectedGroup],
          headline,
          message,
          class: selectedClass,
          candidateId: selectedCandidate,
        });

        setPopup({ headline: "Success", message: "Popup sent successfully!" });
      }

      setHeadline("");
      setMessage("");
      setSelectedGroup("");
      setSelectedPreset("");
      setSelectedCandidate("");
    } catch (error) {
      console.error("Error sending popups:", error);
      setPopup({ headline: "Error", message: "Failed to send popup. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-sand font-rubik">
      <NavbarAdmin />

      <div className="max-w-3xl mx-auto bg-northeasternWhite border-northeasternBlack border-4 justify-center rounded-md items-center p-6 mt-6">
        <h1 className="text-3xl 
        font-bold text-center text-northeasternRed mb-6">
          Send Popups
        </h1>

        <p className="text-lg text-center text-northeasternRed mb-4">
          Select a preset or create a custom message to send to a selected group
          of students.
        </p>

          {/* Class Selection Dropdown */}
          <div className="mb-6">
            <label className="text-lg text-northeasternBlack font-rubik block mb-2">Select Class:</label>
            <select
              value={selectedClass}
              onChange={handleClassChange}
              className="w-full p-3 border border-wood bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a Class --</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>

          {/* Group Selection Dropdown - appears right after class selection */}
          {selectedClass && (
            <div className="mb-6">
              <label className="text-lg text-northeasternBlack font-rubik block mb-2">Select Group:</label>
              <select
                value={selectedGroup}
                onChange={handleGroupChange}
                className="w-full p-3 border border-wood bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a Group --</option>
                {Object.keys(groups).map((groupId) => (
                  <option key={groupId} value={groupId}>
                    Group {groupId} ({groups[groupId]?.length || 0} students)
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedClass && selectedGroup && (
            <>
              <div className="mb-6">
                <label className="text-lg font-rubik text-northeasternBlack block mb-2">Choose a Preset:</label>
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetSelection(e.target.value)}
                  className="w-full p-3 border border-wood bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a Preset --</option>
                  {presetPopups.map((preset) => (
                    <option key={preset.title} value={preset.title}>
                      {preset.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Candidate selection dropdown - only show when preset is selected */}
              {selectedPreset && (
                <div className="mb-6">
                  <label className="text-lg font-rubik text-northeasternBlack block mb-2">
                    Select Candidate for {selectedPreset}:
                  </label>
                  
                  <select
                    value={selectedCandidate}
                    onChange={(e) => handleCandidateSelection(e.target.value)}
                    className="w-full p-3 border border-wood bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select a Candidate --</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.resume_id} value={candidate.resume_id}>
                        {candidate.name} (ID: {candidate.resume_id})
                      </option>
                    ))}
                  </select>
                  {candidates.length === 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      The selected group is not currently interviewing any candidates.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-4 mb-6">
                <label className="text-lg text-Black font-rubik">Headline:</label>
                <input
                  type="text"
                  placeholder="Enter subject for popup"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="p-3 border border-wood text-left bg-springWater rounded-md 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />

                <label className="text-lg text-northeasternBlack font-rubik">Message:</label>
                <textarea
                  placeholder="Enter your message here"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full h-32 p-4 border border-wood text-left bg-springWater 
                    rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                    mb-4 resize-none overflow-hidden text-lg whitespace-pre-wrap"
                  rows={3}
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={sendPopups}
                  disabled={sending || !selectedGroup} // Updated condition
                  className={`mt-6 px-6 py-3 font-semibold rounded-md transition 
                              ${
                                sending || !selectedGroup
                                  ? "bg-gray-400 cursor-not-allowed"
                                  : "bg-northeasternRed text-white"
                              }`}
                >
                  {sending ? "Sending..." : "Send Popup"}
                </button>
              </div>
            </>
          )}

        {pendingOffers.map(({classId, groupId, candidateId }) => (
          <div
            key={`offer-${classId}-${groupId}-${candidateId}`}
            className="mt-6 p-4 bg-springWater rounded-md shadow-md max-w-md mx-auto"
          >
          </div>
        ))}

    {popup && (
              <Popup
                headline={popup.headline}
                message={popup.message}
                onDismiss={() => setPopup(null)}
              />
            )}
      </div>
    </div>
  );
};

export default SendPopups;