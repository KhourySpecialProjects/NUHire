"use client";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavbarAdmin from "../components/navbar-admin";
import { io } from "socket.io-client";
import Popup from "../components/popup";
import AdminReactionPopup from "../components/adminReactionPopup";

const socket = io(API_BASE_URL); 

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

  interface Student {
    f_name: string;
    l_name: string;
    email: string;
  }
    
    const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
    const [user, setUser] = useState<{ affiliation: string; email?: string; [key: string]: any } | null>(null);
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState<Record<string, any>>({});
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [headline, setHeadline] = useState("");
    const [message, setMessage] = useState(""); 
    const [sending, setSending] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState<string>("");
    const [classes, setClasses] = useState<{id: number, name: string}[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>("");
    const router = useRouter(); 
    const [pendingOffers, setPendingOffers] = useState<
    { classId: number; groupId: number; candidateId: number }[]
  >([]);
    const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);

  const presetPopups = [
    {
      title: "Internal Referral",
      headline: "Internal Referral",
      message:
        "This person has an internal referral for this position! You have to accept this candidate!",
    },
    {
      title: "No Show",
      headline: "Abandoned Interview",
      message:
        "This candidate did not show up for the interview. You can change the scores, but everything will be saved as the lowest score.",
    },
  ];

    // Fetch the logged-in user
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
    }, []);

    // Fetch available classes
    useEffect(() => {
      const fetchAssignedClasses = async () => {
        console.log("Fetching assigned classes for user:", user?.email);
        if (user?.email && user.affiliation === "admin") {
          try {
            // First get the assigned class IDs
            const response = await fetch(`${API_BASE_URL}/moderator-classes-full/${user.email}`);
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
              name: `CRN ${item.crn} - (${item.nom_groups} groups)`
            })));
            console.log("Classes set:", classes);
          } catch (error) {
            console.error("Error fetching moderator classes:", error);
          }
        }
      };
      fetchAssignedClasses();
    }, [user]);

    // Fetch groups filtered by class
    useEffect(() => {
        const fetchGroups = async () => {
            if (!selectedClass) return;
            
            try {
                const response = await fetch(`${API_BASE_URL}/groups?class=${selectedClass}`);
                const data = await response.json();
                setGroups(data);
            } catch (error) {
                console.error("Error fetching groups:", error);
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
    setSelectedGroups([]); // Reset selected groups when class changes
  };

  const handleCheckboxChange = (groupId: string) => {
    setSelectedGroups((prevSelected) =>
      prevSelected.includes(groupId)
        ? prevSelected.filter((id) => id !== groupId)
        : [...prevSelected, groupId]
    );
  };

  const handlePresetSelection = (presetTitle: string) => {
    setSelectedPreset(presetTitle);
    const preset = presetPopups.find((p) => p.title === presetTitle);
    if (preset) {
      setHeadline(preset.headline);
      setMessage(preset.message);
    }
  };

  const respondToOffer = (
    classId: number,
    groupId: number,
    candidateId: number,
    accepted: boolean
  ) => {
    socket.emit("makeOfferResponse", {
      classId,
      groupId,
      candidateId,
      accepted,
    });
    setPendingOffers((prev) =>
      prev.filter((o) => o.classId != classId || o.groupId !== groupId || o.candidateId !== candidateId)
    );
  };

    const sendPopups = async () => {
        if (!headline || !message || selectedGroups.length === 0) {
          setPopup({ headline: "Error", message: "Please fill in all fields and select at least one group." });
          return;
        }
    
        setSending(true);
    
        try {
            socket.emit("sendPopupToGroups", {
                groups: selectedGroups,
                headline,
                message,
                class: selectedClass // Add class information
            });
    
            setPopup({ headline: "Success", message: "Popups sent successfully!" });
            
            setHeadline("");
            setMessage("");
            setSelectedGroups([]);
            setSelectedPreset("");
        } catch (error) {
            console.error("Error sending popups:", error);
            setPopup({ headline: "Error", message: "Failed to send popups. Please try again." });
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
          Select a preset or create a custom message to send to selected groups
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

          {selectedClass && (
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

                <label className="text-lg text-northeasternBlack font-rubik">Content:</label>
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

          {/* Groups Display Section */}
          <div className="mt-6">
            <h2 className="text-2xl font-bold text-northeasternBlack mb-4">Groups in {selectedClass ? `Class ${selectedClass}` : 'All Classes'}</h2>
            {groups && Object.keys(groups).length > 0 ? (
              Object.entries(groups).map(([group_id, students]) => (
                <div
                  key={group_id}
                  className="bg-northeasternWhite mb-4 p-4 border rounded-lg shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-northeasternBlack">
                      Group {group_id}
                    </h3>
                    <input
                      type="checkbox"
                      className="h-5 w-5 text-blue-500 accent-navy cursor-pointer"
                      checked={selectedGroups.includes(group_id)}
                      onChange={() => handleCheckboxChange(group_id)}
                    />
                  </div>
                  <ul className="list-none pl-0 text-navy mt-2">
                    {Array.isArray(students) && students.length > 0 ? (
                      students.map((student, index) => (
                        <li key={index} className="mb-2 flex items-center justify-between p-2 bg-white rounded ">
                          <div className="flex items-center space-x-3">
                            <span className={`w-3 h-3 rounded-full ${student.online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                            <span className="font-medium">
                              {student.name} ({student.email})
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className={`px-2 py-1 rounded ${student.online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              {student.current_page || 'No page'}
                            </span>
                            <span className="text-gray-600">
                              {student.job_des || 'No job'}
                            </span>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li>No students assigned</li>
                    )}
                  </ul>
                </div>
              ))
            ) : (
              <p className="text-sand text-center">No groups found for this class.</p>
            )}
          </div>

        <div className="flex justify-center">
          <button
            onClick={sendPopups}
            disabled={sending || selectedGroups.length === 0}
            className={`mt-6 px-6 py-3 font-semibold rounded-md transition 
                          ${
                            sending || selectedGroups.length === 0
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-northeasternRed text-white"
                          }`}
          >
            {sending ? "Sending..." : "Send Popups"}
          </button>
        </div>

        {pendingOffers.map(({classId, groupId, candidateId }) => (
          <div
            key={`offer-${classId}-${groupId}-${candidateId}`}
            className="mt-6 p-4 bg-springWater rounded-md shadow-md max-w-md mx-auto"
          >
            <AdminReactionPopup
              headline={`Group ${groupId} from Class ${classId} wants to offer Candidate ${candidateId}`}
              message="Do you approve?"
              onAccept={() => 
                respondToOffer(classId, groupId, candidateId, true)
              }
              onReject={() => 
                respondToOffer(classId, groupId, candidateId, false)
              }
        
            />
          </div>
        ))}
      </>
    )}
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