'use client';// Declares that this page is a client component
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; // API base URL from environment variables
import { useState, useEffect } from "react"; // Importing React and hooks for state and effect management
import { useRouter } from "next/navigation"; // Importing useRouter for navigation
import NavbarAdmin from "../components/navbar-admin"; // Importing the admin navbar component
import { io, Socket } from "socket.io-client";
import AdminReactionPopup from "../components/adminReactionPopup"; // Importing popup component for offers

//Define the Grouping component
// This component is responsible for managing groups and job assignments for students
const Grouping = () => {

  interface Student {
    f_name: string;
    l_name: string;
    email: string;
    [key: string]: any; // optionally allow other props
  }
  
  //Defining the constants and state variables
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [user, setUser] = useState<{ affiliation: string; email?: string; [key: string]: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  interface Job {
    title: string;
    [key: string]: any;
  }
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [group_id, setGroupId] = useState("");
  const [job_group_id, setGroupIdJob] = useState(""); 
  const [groups, setGroups] = useState<{[key: string]: any}>({});
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const router = useRouter();
  const [pendingOffers, setPendingOffers] = useState<
    { classId: number; groupId: number; candidateId: number }[]
  >([]);
  const [acceptedOffers, setAcceptedOffers] = useState<
    { classId: number; groupId: number; candidateId: number }[]
  >([]);
  const socket = io(API_BASE_URL);

  // ✅ Fetch the logged-in user
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

  // ✅ Admin socket setup - Register admin and listen for offer requests and responses
  useEffect(() => {
    if (!user || user.affiliation !== "admin") return;

    console.log("Setting up admin socket connection");

    const onRequest = (data: { classId: number; groupId: number; candidateId: number }) => {
      console.log("Admin received makeOfferRequest:", data);
      const { classId, groupId, candidateId } = data;
      setPendingOffers((prev) => [...prev, {classId, groupId, candidateId }]);
    };

    const onResponse = (data: { classId: number; groupId: number; candidateId: number; accepted: boolean }) => {
      const { classId, groupId, candidateId, accepted } = data;
      if (accepted) {
        setAcceptedOffers((prev) => {
          if (prev.some(o => o.classId === classId && o.groupId === groupId && o.candidateId === candidateId)) return prev;
          return [...prev, { classId, groupId, candidateId }];
        });
      }
    };

    socket.on("connect", () => {
      console.log("Admin connected to socket:", socket.id);
      socket.emit("studentOnline", { studentId: user.email });
      console.log("Admin registered as online with email:", user.email);
    });
    
    socket.on("makeOfferRequest", onRequest);
    socket.on("makeOfferResponse", onResponse);

    socket.on("moderatorClassAdded", (data) => {
    if (user?.email === data.admin_email) {
      console.log("New class assigned to you:", data);
      // Refresh the admin's assigned classes
      const fetchAssignedClasses = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/moderator-classes/${user.email}`);
          if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
          }
          const data = await response.json();
          console.log("Updated assigned classes:", data);
          setAssignedClassIds(data.map(String));
        } catch (error) {
          console.error("Error refreshing moderator classes:", error);
        }
      };
      fetchAssignedClasses();
    }
  });

  socket.on("moderatorClassRemoved", (data) => {
    if (user?.email === data.admin_email) {
      console.log("Class removed from your assignments:", data);
      const fetchAssignedClasses = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/moderator-classes/${user.email}`);
          if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
          }
          const data = await response.json();
          console.log("Updated assigned classes:", data);
          setAssignedClassIds(data.map(String));
        } catch (error) {
          console.error("Error refreshing moderator classes:", error);
        }
      };
      fetchAssignedClasses();
    }
  });

    socket.on("disconnect", () => {
      console.log("Admin disconnected from socket");
    });

    return () => {
      socket.off("makeOfferRequest", onRequest);
      socket.off("makeOfferResponse", onResponse);
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [user]);

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

  interface ModeratorClass {
    admin_email: string;
    crn: number;
    nom_groups: number;
  }

  // Then update your useEffect to use this type
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
          name: `CRN ${item.crn} - ${item.admin_email} (${item.nom_groups} groups)`
        })));
        console.log("Classes set:", classes);
      } catch (error) {
        console.error("Error fetching moderator classes:", error);
      }
    }
  };
  
  fetchAssignedClasses();
}, [user]);

  // ✅ Fetch groups filtered by class
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
  
    const fetchStudents = async () => {
      if (!selectedClass) return;
      
      try { 
        const response = await fetch(`${API_BASE_URL}/students?class=${selectedClass}`);
        const data = await response.json();
        setStudents(data);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };

    if (selectedClass) {
      fetchGroups();
      fetchStudents();
    }
  }, [selectedClass]);

  // ✅ Socket.IO setup for real-time updates
  useEffect(() => {
    if (!user) return; // Wait for user to be loaded
    
    const socket = io(API_BASE_URL, {
      reconnectionAttempts: 5,
      timeout: 5000,
    });

    socket.on("connect", () => {
      console.log("Admin connected to socket:", socket.id);
    });

    // Listen for student page changes (correct event name from server)
    socket.on("studentPageChange", ({ studentId, currentPage }) => {
      console.log(`Received update: Student ${studentId} changed to ${currentPage}`);
      
      // Update students state to reflect the current page
      setStudents(prevStudents => 
        prevStudents.map(student =>
          student.email === studentId 
            ? { ...student, current_page: currentPage }
            : student
        )
      );

      // Update groups state as well if needed
      setGroups(prevGroups => {
        const updatedGroups = { ...prevGroups };
        Object.keys(updatedGroups).forEach(groupId => {
          if (Array.isArray(updatedGroups[groupId])) {
            updatedGroups[groupId] = updatedGroups[groupId].map((student: any) =>
              student.email === studentId
                ? { ...student, current_page: currentPage }
                : student
            );
          }
        });
        return updatedGroups;
      });
    });

    // Listen for online student updates
    socket.on("updateOnlineStudents", ({ studentId, group_id, current_page }) => {
      console.log(`Student ${studentId} is online in group ${group_id} on page ${current_page}`);
      
      // Update both students and groups state
      setStudents(prevStudents => 
        prevStudents.map(student =>
          student.email === studentId 
            ? { ...student, current_page, online: true }
            : student
        )
      );

      setGroups(prevGroups => {
        const updatedGroups = { ...prevGroups };
        Object.keys(updatedGroups).forEach(groupId => {
          if (Array.isArray(updatedGroups[groupId])) {
            updatedGroups[groupId] = updatedGroups[groupId].map((student: any) =>
              student.email === studentId
                ? { ...student, current_page, online: true }
                : student
            );
          }
        });
        return updatedGroups;
      });
    });

    // Listen for new student events and refresh groups
    socket.on("newStudent", ({ classId }) => {
      console.log(`New student added to class ${classId}`);
      
      // Refresh groups for the specific class
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
      fetchGroups();
    });

    socket.on("disconnect", () => {
      console.log("Admin disconnected from socket");
    });

    // Cleanup function
    return () => {
      socket.disconnect();
    };
  }, []); 

  // ✅ Handle class selection change
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClass = e.target.value;
    
    // For admin users, verify they are assigned to this class
    if (user?.affiliation === "admin" && newClass && 
        !assignedClassIds.includes(newClass)) {
      alert("You are not assigned to this class.");
      return;
    }
    
    setSelectedClass(newClass);
    setSelectedStudents([]);
    setSelectedJobs([]);
    setGroupId("");
    setGroupIdJob("");
  };

  // ✅ Handle student selection
  const handleStudentSelection = (event: { target: { value: any; }; }) => {
    const selectedEmail = event.target.value;
    const selectedStudent = students.find(student => student.email === selectedEmail);

    if (selectedStudent && !selectedStudents.some(student => student.email === selectedEmail)) {
      setSelectedStudents([...selectedStudents, selectedStudent]);
    }
  };

  // ✅ Handle removing a selected student
  const handleRemoveStudent = (email : string) => {
    setSelectedStudents(selectedStudents.filter(student => student.email !== email));
  };

  // ✅ Fetch available jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try { 
        const response = await fetch(`${API_BASE_URL}/jobs`);
        const data = await response.json();
        console.log("Fetching jobs from:", data);
        setJobs(data);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      }
    };
    fetchJobs();
  }, []);

  // ✅ Handle job selection
  const handleJobSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTitle = event.target.value;
    const selectedJob = jobs.find(job => job.title === selectedTitle);

    if (selectedJob && !selectedJobs.some(job => job.title === selectedTitle)) {
      setSelectedJobs([selectedJob]);
    }
  };

  // ✅ Handle removing a selected job
  const handleRemoveJob = (title: string) => {
    setSelectedJobs(selectedJobs.filter(job => job.title !== title));
  };

  // ✅ Handle group assignment with class
  const handleAssignGroup = async () => {
    if (!group_id || selectedStudents.length === 0 || !selectedClass) {
      alert("Please enter a valid group ID, select a class, and select at least one student.");
      return;
    }

    if (user?.affiliation === "admin" && !assignedClassIds.includes(selectedClass)) {
      alert("You are not assigned to this class.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/update-group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id,
          class_id: selectedClass,
          students: selectedStudents.map(student => student.email)
        }),
      });

      if (response.ok) {
        alert("Students assigned to group successfully!");
        setSelectedStudents([]);
        setGroupId("");
        // Refresh groups after assignment
        const groupsResponse = await fetch(`${API_BASE_URL}/groups?class=${selectedClass}`);
        const groupsData = await groupsResponse.json();
        setGroups(groupsData);
        
      } else {
        alert("Failed to assign students to group.");
      }
    } catch (error) {
      console.error("Error updating group:", error);
    }
  };

  // ✅ Handle job assignment with class
  const handleAssignJob = async () => {
    if (!job_group_id || selectedJobs.length === 0 || !selectedClass) {
      alert("Please enter a valid group ID, select a class, and select a Job.");
      return;
    }

    if (user?.affiliation === "admin" && !assignedClassIds.includes(selectedClass)) {
      alert("You are not assigned to this class.");
      return;
    }
    

    try {
      const response = await fetch(`${API_BASE_URL}/update-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_group_id,
          class_id: selectedClass,
          job: selectedJobs.map(job => job.title)
        }),
      });

      if (response.ok) {
        alert("Job assigned to group successfully!");
        setSelectedJobs([]);
        setGroupIdJob("");
        // Refresh groups after assignment
        const groupsResponse = await fetch(`${API_BASE_URL}/groups?class=${selectedClass}`);
        const groupsData = await groupsResponse.json();
        setGroups(groupsData);
    
      } else {
        alert("Failed to assign job to group.");
      }
    } catch (error) {
      console.error("Error updating job assignment:", error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || user.affiliation !== "admin") {
    return <div>This account is not authorized for this page</div>;
  }

    return (
    <div className="flex flex-col min-h-screen bg-sand font-rubik">
      <NavbarAdmin />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-4 p-4 h-[calc(100vh-80px)]">
        <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 flex flex-col overflow-y-auto max-h-[45vh]">
          <h2 className="text-2xl font-bold text-northeasternRed mb-4">Class & Student Assignment</h2>
          <div className="mb-4">
            <label className="block text-navy font-semibold mb-2">
              Your Assigned Classes
            </label>
            <select
              value={selectedClass}
              onChange={handleClassChange}
              className="w-full p-2 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a class</option>
              {classes.map(classItem => (
                <option key={classItem.id} value={classItem.id}>
                  {/* Display "Class" prefix since now name is just the CRN number */}
                  {classItem.name}
                </option>
              ))}
            </select>
            {classes.length === 0 && (
              <p className="text-red-500 text-sm mt-1">
                You have no assigned classes. Please contact the administrator.
              </p>
            )}
          </div>
          {/* Group ID Input */}
          <input
            type="text"
            placeholder="Enter Group ID"
            value={group_id}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full p-2 border border-wood bg-springWater rounded-md mb-2"
          />
          {/* Student Selection */}
          <select
            onChange={handleStudentSelection}
            className="w-full mb-2 p-2 border border-wood bg-springWater rounded-md"
          >
            <option value="">Select a student</option>
            {students.map(student => (
              <option key={student.email} value={student.email}>
                {student.f_name} {student.l_name} ({student.email})
              </option>
            ))}
          </select>
          {/* Selected Students List */}
          <div className="mb-2 space-y-2">
            {selectedStudents.map(student => (
              <div key={student.email} className="flex items-center justify-between p-2 bg-springWater rounded-md">
                <span className="text-navy">{student.f_name} {student.l_name} ({student.email})</span>
                <button
                  onClick={() => handleRemoveStudent(student.email)}
                  className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleAssignGroup}
            className="w-full mt-2 bg-northeasternWhite border border-wood text-navy font-bold py-2 rounded-md hover:bg-blue-600 transition"
          >
            Assign Group
          </button>
        </div>

        <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 flex flex-col overflow-y-auto max-h-[45vh]">
          <h2 className="text-2xl font-bold text-northeasternRed mb-4">Job Assignment</h2>
          <input
            type="text"
            placeholder="Enter Group ID for Job Assignment"
            value={job_group_id}
            onChange={(e) => setGroupIdJob(e.target.value)}
            className="w-full p-2 border border-wood bg-springWater rounded-md mb-2"
          />
          <select
            onChange={handleJobSelection}
            className="w-full mb-2 p-2 border border-wood bg-springWater rounded-md"
          >
            <option value="">Select a job</option>
            {jobs.map(job => (
              <option key={job.title} value={job.title}>
                {job.title}
              </option>
            ))}
          </select>
          {/* Selected Jobs List */}
          <div className="mb-2 space-y-2">
            {selectedJobs.map(job => (
              <div key={job.title} className="flex items-center justify-between p-2 bg-springWater rounded-md">
                <span className="text-navy">{job.title}</span>
                <button
                  onClick={() => handleRemoveJob(job.title)}
                  className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleAssignJob}
            className="w-full mt-2 bg-northeasternWhite border border-wood text-navy font-bold py-2 rounded-md hover:bg-blue-600 transition"
          >
            Assign Job
          </button>
        </div>
        <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 flex flex-col overflow-y-auto max-h-[45vh]">
          <h2 className="text-2xl font-bold text-northeasternRed mb-4">
            {selectedClass ? `Groups in Class ${selectedClass}` : 'Groups'}
          </h2>
          
          {!selectedClass ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <p className="text-northeasternBlack font-medium">Please select a class to view groups</p>
              <p className="text-gray-500 text-sm mt-1">Groups will appear here after selecting a class</p>
            </div>
          ) : groups && Object.keys(groups).length > 0 ? (
            Object.entries(groups).map(([group_id, students]) => (
              <div key={group_id} className="bg-springWater border border-wood p-2 rounded-md mb-2 shadow">
                {isNaN(Number(group_id)) ? (
                  <h3 className="text-xl font-semibold text-red-600">No groups found</h3>
                ) : (
                  <h3 className="text-xl font-semibold text-navy">Group {group_id}</h3>
                )}
                <ul className="list-none pl-0 text-navy mt-1">
                  {Array.isArray(students) && students.length > 0 ? (
                    students.map((student, index) => (
                      <li key={index} className="mb-1 flex items-center justify-between p-1 bg-white rounded">
                        <div className="flex items-center space-x-2">
                          <span className={`w-3 h-3 rounded-full ${student.online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                          <span className="font-medium">
                            {student.name} ({student.email})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
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
            <p className="text-northeasternBlack text-center">No groups found for this class.</p>
          )}
        </div>
        <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 flex flex-col overflow-y-auto max-h-[45vh]">
          <h2 className="text-2xl font-bold text-northeasternRed mb-4">Pending & Accepted Offers</h2>
          {/* Pending Offers */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-navy mb-2">Pending Offers</h3>
            {pendingOffers.length > 0 ? (
              <div className="space-y-2">
                {pendingOffers.map(({ classId, groupId, candidateId }) => (
                  <div
                    key={`pending-offer-${classId}-${groupId}-${candidateId}`}
                    className="bg-springWater p-2 rounded border border-wood flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-navy">
                        Group {groupId} from Class {classId}
                      </h4>
                      <p className="text-gray-600">
                        Wants to make an offer to Candidate {candidateId}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Awaiting your approval decision
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-2">
                      <button
                        onClick={() => respondToOffer(classId, groupId, candidateId, true)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md font-medium transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => respondToOffer(classId, groupId, candidateId, false)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md font-medium transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-springWater border border-wood p-2 rounded-md text-center">
                <p className="text-navy">No pending offers at this time</p>
              </div>
            )}
          </div>
          {/* Accepted Offers */}
          <div>
            <h3 className="text-lg font-semibold text-navy mb-2">Accepted Offers</h3>
            {acceptedOffers.length > 0 ? (
              <div className="space-y-2">
                {acceptedOffers.map(({ classId, groupId, candidateId }) => (
                  <div
                    key={`accepted-offer-${classId}-${groupId}-${candidateId}`}
                    className="bg-white p-2 rounded border border-wood flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-navy">
                        Group {groupId} from Class {classId}
                      </h4>
                      <p className="text-gray-600">
                        Had their offer for Candidate {candidateId} <span className="text-green-700 font-bold">ACCEPTED</span>.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-springWater border border-wood p-2 rounded-md text-center">
                <p className="text-navy">No accepted offers yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Grouping;