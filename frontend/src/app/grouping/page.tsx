'use client';
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavbarAdmin from "../components/navbar-admin";
import { io } from "socket.io-client";
import Tabs from "../components/tabs";
import Popup from "../components/popup";

const Grouping = () => {
  interface Student {
    f_name: string;
    l_name: string;
    email: string;
  }

  interface Offer {
    id: number;
    class_id: number;
    group_id: number;
    candidate_id: number;
    status: 'pending' | 'accepted' | 'rejected';
  }

  // General state
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [user, setUser] = useState<{ affiliation: string; email?: string; [key: string]: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const router = useRouter();
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const [donePopup, setDonePopup] = useState(false);
  

  // Tab 1: Class & Student Assignment
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<{ [key: string]: any }>({});
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [group_id, setGroupId] = useState("");
  const [updateNumGroups, setUpdateNumGroups] = useState<number | "">("");

  // Tab 2: Job Assignment
  interface Job { title: string; [key: string]: any; }
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [jobGroups, setJobGroups] = useState<{ [key: string]: any }>({});
  const [selectedJobClass, setSelectedJobClass] = useState("");
  const [selectedJobGroup, setSelectedJobGroup] = useState("");
  const [job_group_id, setGroupIdJob] = useState("");
   
  // Tab 3: Groups in Class (independent state)
  const [groupsTabClass, setGroupsTabClass] = useState("");
  const [groupsTabGroups, setGroupsTabGroups] = useState<{ [key: string]: any }>({});
  const [groupsTabStudents, setGroupsTabStudents] = useState<Student[]>([]);
  // Tab 4: Offers
  const [offersTabClass, setOffersTabClass] = useState("");
  const [pendingOffers, setPendingOffers] = useState<Offer[]>([]);
  const [acceptedOffers, setAcceptedOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  const refreshOffers = async (classId?: string) => {
    const targetClassId = classId || offersTabClass;
    if (!targetClassId) {
      console.log("No class selected for offers refresh");
      return;
    }

    setOffersLoading(true);
    try {
      console.log(`Refreshing offers for class ${targetClassId}`);
      const response = await fetch(`${API_BASE_URL}/offers/class/${targetClassId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch offers: ${response.statusText}`);
      }

      const offers: Offer[] = await response.json();
      console.log("Fetched offers:", offers);

      // Filter offers by status
      const pending = offers.filter(offer => offer.status === 'pending');
      const accepted = offers.filter(offer => offer.status === 'accepted');
      
      setPendingOffers(pending);
      setAcceptedOffers(accepted);
            
    } catch (error) {
      console.error('Error refreshing offers:', error);
      setPopup({
        headline: "Error",
        message: "Failed to refresh offers. Please try again."
      });
      
      // Clear offers on error
      setPendingOffers([]);
      setAcceptedOffers([]);
    } finally {
      setOffersLoading(false);
    }
  };

  // Tab 5: Adding students
  const [addStudentClass, setAddStudentClass] = useState("");
  const [addStudentGroup, setAddStudentGroup] = useState("");
  const [addStudentEmail, setAddStudentEmail] = useState("");
  const [addStudentFirstName, setAddStudentFirstName] = useState("");
  const [addStudentLastName, setAddStudentLastName] = useState("");
  const [addStudentAvailableGroups, setAddStudentAvailableGroups] = useState<number>(0); 
 
  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await response.json();
        if (response.ok) setUser(userData);
        else { setUser(null); router.push("/"); }
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // Fix the socket handlers and respondToOffer function

  // Admin socket setup
  useEffect(() => {
    if (!user || user.affiliation !== "admin") return;

    const socketUpdate = io(API_BASE_URL);

    console.log(user);

    socketUpdate.emit("adminOnline", { adminEmail: user.email });

    const onRequest = (data: { classId: number; groupId: number; candidateId: number }) => {
      refreshOffers();
      console.log("Received offer request:", data);
      
      // If we're currently viewing offers for this class, refresh them
      if (offersTabClass && Number(offersTabClass) === data.classId) {
        console.log("New offer request for current class, refreshing...");
        refreshOffers();
      }
    };
    
    const onResponse = (data: { classId: number; groupId: number; candidateId: number; accepted: boolean }) => {
      console.log("Received offer response:", data);
      
      // If we're currently viewing offers for this class, refresh them
      if (offersTabClass && Number(offersTabClass) === data.classId) {
        console.log("Offer response for current class, refreshing...");
        refreshOffers();
      }
    };

    socketUpdate.on("makeOfferRequest", onRequest);
    socketUpdate.on("makeOfferResponse", onResponse);

    return () => {
      socketUpdate.off("makeOfferRequest", onRequest);
      socketUpdate.off("makeOfferResponse", onResponse);
      socketUpdate.disconnect();
    };
  }, [user, offersTabClass]);

  // Updated respond to offer function
  const respondToOffer = async (offerId: number, classId: number, groupId: number, candidateId: number, accepted: boolean) => {
    try {
      console.log(`Responding to offer ${offerId}: ${accepted ? 'ACCEPT' : 'REJECT'}`);
      
      // Update database first
      const response = await fetch(`${API_BASE_URL}/offers/${offerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: accepted ? 'accepted' : 'rejected'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update offer in database');
      }

      console.log("Database updated successfully");

      // Emit socket response
      const socketOffer = io(API_BASE_URL);
      socketOffer.emit("makeOfferResponse", { classId, groupId, candidateId, accepted });
      
      console.log("Socket response emitted");

      // Refresh offers to show updated status
      await refreshOffers();

      setPopup({
        headline: "Success",
        message: `Offer ${accepted ? 'accepted' : 'rejected'} successfully!`
      });

    } catch (error) {
      console.error('Error responding to offer:', error);
      setPopup({
        headline: "Error",
        message: "Failed to respond to offer. Please try again."
      });
    }
  };

  // Also add useEffect to refresh offers when class changes
  useEffect(() => {
    if (offersTabClass) {
      console.log(`Class changed to ${offersTabClass}, refreshing offers...`);
      refreshOffers(offersTabClass);
    } else {
      // Clear offers when no class is selected
      setPendingOffers([]);
      setAcceptedOffers([]);
    }
  }, [offersTabClass]);

  // Fetch assigned classes
  useEffect(() => {
    if (user?.email && user.affiliation === "admin") {
      fetch(`${API_BASE_URL}/moderator-classes-full/${user.email}`)
        .then(res => res.json())
        .then((data) => {
          setAssignedClassIds(data.map((item: any) => String(item.crn)));
          setClasses(data.map((item: any) => ({
            id: item.crn,
            name: `CRN ${item.crn} - (${item.nom_groups} groups)`
          })));
        });
    }
  }, [user]);

  // Tab 1: Fetch groups and students for selected class
  useEffect(() => {
    if (selectedClass) {
      fetch(`${API_BASE_URL}/groups?class=${selectedClass}`)
        .then(res => res.json())
        .then(data => {
          setGroups(data);
        });
      fetch(`${API_BASE_URL}/students?class=${selectedClass}`)
        .then(res => res.json())
        .then(setStudents);
    }
  }, [selectedClass]);

  // Tab 2: Fetch job groups for selected job class
  useEffect(() => {
    if (selectedJobClass) {
      fetch(`${API_BASE_URL}/groups?class=${selectedJobClass}`)
        .then(res => res.json())
        .then(setJobGroups);
    }
  }, [selectedJobClass]);

 useEffect(() => {
  if (groupsTabClass) {
    console.log("=== TAB 3 DEBUG ===");
    console.log("Selected class:", groupsTabClass);
    
    fetch(`${API_BASE_URL}/groups?class=${groupsTabClass}`)
      .then(res => {
        console.log("Groups API response status:", res.status);
        return res.json();
      })
      .then(data => {
        console.log("Groups API raw response:", data);
        console.log("Groups data type:", typeof data);
        console.log("Groups data keys:", Object.keys(data));
        setGroupsTabGroups(data);
      })
      .catch(err => {
        console.error("Groups API error:", err);
      });
      
    fetch(`${API_BASE_URL}/students?class=${groupsTabClass}`)
      .then(res => {
        console.log("Students API response status:", res.status);
        return res.json();
      })
      .then(data2 => {
        console.log("Students API raw response:", data2);
        console.log("Students data type:", typeof data2);
        console.log("Students array length:", Array.isArray(data2) ? data2.length : 'Not an array');
        setGroupsTabStudents(data2);
      })
      .catch(err => {
        console.error("Students API error:", err);
      });
  } else {
    setGroupsTabGroups({});
    setGroupsTabStudents([]);
  }
}, [groupsTabClass]);

  // Fetch jobs
  useEffect(() => {
    fetch(`${API_BASE_URL}/jobs`)
      .then(res => res.json())
      .then(setJobs);
  }, []);

  useEffect(() => {
  if (addStudentClass) {
    const selectedClassData = classes.find(c => c.id.toString() === addStudentClass);
    if (selectedClassData) {
      const match = selectedClassData.name.match(/\((\d+) groups?\)/);
      if (match) {
        setAddStudentAvailableGroups(parseInt(match[1]));
      }
    }
  } else {
    setAddStudentAvailableGroups(0);
    setAddStudentGroup(""); 
  }
}, [addStudentClass, classes]);

  // Handlers for Tab 1
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClass = e.target.value;
    if (user?.affiliation === "admin" && newClass && !assignedClassIds.includes(newClass)) {
      setPopup({ headline: "Access Denied", message: "You are not assigned to this class." });
      return;
    }
    setSelectedClass(newClass);
    setSelectedStudents([]);
    setSelectedJobs([]);
    setGroupId("");
    setGroupIdJob("");
  };
  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGroup = e.target.value;
    setSelectedGroup(newGroup);
    if (newGroup && Object.keys(groups).includes(newGroup)) setGroupId(newGroup);
    else if (newGroup) setPopup({ headline: "Invalid Selection", message: "Invalid group selection." });
  };
  const handleStudentSelection = (event: { target: { value: any; }; }) => {
    const selectedEmail = event.target.value;
    const selectedStudent = students.find(student => student.email === selectedEmail);
    if (selectedStudent && !selectedStudents.some(student => student.email === selectedEmail)) {
      setSelectedStudents([...selectedStudents, selectedStudent]);
    }
  };
  const handleRemoveStudent = (email: string) => {
    setSelectedStudents(selectedStudents.filter(student => student.email !== email));
  };

  // Handlers for Tab 2
  const handleJobClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedJobClass(e.target.value);
  };
  const handleJobGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log("++++++++ Job group change event:", e);
    const newGroup = e.target.value;
    console.log("Selected group value:", newGroup, typeof newGroup);
    setSelectedJobGroup(newGroup);
    if (newGroup && Object.keys(jobGroups).includes(newGroup)) {
      console.log("Setting group ID to:", newGroup);
      setGroupIdJob(newGroup);
    } else if (newGroup) {
      console.log("Invalid group selection");
      setPopup({ headline: "Invalid Selection", message: "Invalid group selection." });
    }
  };
  const handleJobSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTitle = event.target.value;
    const selectedJob = jobs.find(job => job.title === selectedTitle);
    if (selectedJob && !selectedJobs.some(job => job.title === selectedTitle)) {
      setSelectedJobs([selectedJob]);
    }
  };
  const handleRemoveJob = (title: string) => {
    setSelectedJobs(selectedJobs.filter(job => job.title !== title));
  };

  // Handlers for Tab 3
  const handleGroupsTabClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGroupsTabClass(e.target.value);
  };

  // Handler for Tab 4 
  const handleOffersTabClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOffersTabClass(e.target.value);
  };

  // Assign group (Tab 1)
  const handleAssignGroup = async () => {
    if (!group_id || selectedStudents.length === 0 || !selectedClass) {
      setPopup({ headline: "Incomplete Information", message: "Please enter a valid group ID, select a class, and select students." });
      return;
    }
    if (user?.affiliation === "admin" && !assignedClassIds.includes(selectedClass)) {
      setPopup({ headline: "Access Denied", message: "You are not assigned to this class." });
      return;
    }
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
      setPopup({ headline: "Success", message: "Students assigned to group successfully!" });
      setSelectedStudents([]);
      setGroupId("");
      fetch(`${API_BASE_URL}/groups?class=${selectedClass}`)
        .then(res => res.json())
        .then(setGroups);
    } else {
      setPopup({ headline: "Error", message: "Failed to assign students to group." });
    }
  };

  // Assign job (Tab 2)
  const handleAssignJob = async () => {
    if (!job_group_id || selectedJobs.length === 0 || !selectedJobClass) {
      setPopup({ headline: "Incomplete Information", message: "Please enter a valid group ID, select a class, and select a job." });
      return;
    }
    if (user?.affiliation === "admin" && !assignedClassIds.includes(selectedJobClass)) {
      setPopup({ headline: "Access Denied", message: "You are not assigned to this class." });
      return;
    }
    console.log(job_group_id);
    const response = await fetch(`${API_BASE_URL}/update-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_group_id,
        class_id: selectedJobClass,
        job: selectedJobs.map(job => job.title)
      }),
    });
    if (response.ok) {
      setPopup({ headline: "Success", message: "Job assigned to group successfully!" });
      setSelectedJobs([]);
      setGroupIdJob("");
      fetch(`${API_BASE_URL}/groups?class=${selectedClass}`)
        .then(res => res.json())
        .then(setGroups);
    } else {
      setPopup({ headline: "Error", message: "Failed to assign job to group." });
    }
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

  if (!user || user.affiliation !== "admin") {
    return <div>This account is not authorized for this page</div>;
  }

  const addStudentToClassGroup = async () => {
    if (!addStudentClass || !addStudentGroup || !addStudentEmail || !addStudentFirstName || !addStudentLastName) {
      setPopup({ headline: "Error", message: "Please fill out all fields." });
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/add-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: addStudentClass,
          group_id: addStudentGroup,
          email: addStudentEmail,
          f_name: addStudentFirstName,
          l_name: addStudentLastName,
        }),
      });
      if (res.ok) {
        setPopup({ headline: "Success", message: "Student added to class and group!" });
        // Clear all fields after success
        setAddStudentClass("");
        setAddStudentGroup("");
        setAddStudentEmail("");
        setAddStudentFirstName("");
        setAddStudentLastName("");
      } else {
        setPopup({ headline: "Error", message: "Failed to add student." });
      }
    } catch {
      setPopup({ headline: "Error", message: "Failed to add student." });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-sand font-rubik">
      <NavbarAdmin />
      <div className="flex-1 p-4">
        <Tabs>
          {/* Tab 1: Class & Student Assignment */}
          <div title="Class & Student Assignment">
            <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 flex flex-col overflow-y-auto max-h-[45vh] w-[900px] mx-auto">
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
              <div className="mb-4">
                <select
                  value={selectedGroup}
                  onChange={handleGroupChange}
                  className="w-full p-2 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a group</option>
                  {groups && Object.keys(groups).map((groupId, index) => (
                    <option key={groupId} value={groupId}>
                      Group {index + 1}
                    </option>
                  ))}
                </select>
                {groups && Object.keys(groups).length === 0 && (
                  <p className="text-red-500 text-sm mt-1">
                    No groups available in this class.
                  </p>
                )}
              </div>
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
              <div className="flex justify-center">
                <button
                  onClick={handleAssignGroup}
                  className="bg-northeasternRed text-white px-4 py-2 rounded font-bold hover:bg-navy transition"
                >
                  Assign Group
                </button>
              </div>
            </div>
            <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 mt-2 w-[900px] mx-auto">
              <h3 className="text-2xl font-bold text-northeasternRed mb-4">Update Number of Groups in Class</h3>
              <label className="block mb-2 text-navy font-semibold">
                Select Class
              </label>
              <select
                value={selectedClass}
                onChange={handleClassChange}
                className="w-full p-2 border border-wood bg-springWater rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a class</option>
                {classes.map(classItem => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
              <label className="block mb-2 text-navy font-semibold">
                Number of Groups
              </label>
              <input
                type="number"
                min={1}
                className="w-full p-2 border border-wood bg-springWater rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={updateNumGroups || ""}
                onChange={e => setUpdateNumGroups(Number(e.target.value))}
                placeholder="Enter new number of groups"
              />
              <div className="flex justify-center">
                <button
                  className="bg-northeasternRed text-white px-4 py-2 rounded font-bold hover:bg-navy transition"
                  onClick={async () => {
                    if (!selectedClass || !updateNumGroups) {
                      setPopup({ headline: "Error", message: "Please select a class and enter a valid number of groups." });
                      return;
                    }
                    try {
                      const res = await fetch(`${API_BASE_URL}/teacher/update-groups`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ crn: selectedClass, nom_groups: updateNumGroups }),
                      });
                      if (res.ok) {
                        setPopup({ headline: "Success", message: "Number of groups updated successfully!" });
                      } else {
                        setPopup({ headline: "Error", message: "Failed to update number of groups." });
                      }
                    } catch {
                      setPopup({ headline: "Error", message: "Failed to update number of groups." });
                    }
                  }}
                >
                  Update Groups
                </button>
              </div>
            </div>
          </div>
          {/* Tab 2: Job Assignment */}
          <div title="Job Assignment">
            <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 flex flex-col overflow-y-auto max-h-[45vh] w-[900px] mx-auto">
              <h2 className="text-2xl font-bold text-northeasternRed mb-4">Job Assignment</h2>
              <div className="mb-4">
                <label className="block text-navy font-semibold mb-2">
                  Assign Groups to Jobs
                </label>
                <select
                  value={selectedJobClass}
                  onChange={handleJobClassChange}
                  className="w-full p-2 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="text-red-500 text-sm mt-1">
                    You have no assigned classes. Please contact the administrator.
                  </p>
                )}
              </div>
              <div className="mb-4">
                <select
                  value={selectedJobGroup}
                  onChange={handleJobGroupChange}
                  className="w-full p-2 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a group</option>
                  {jobGroups && Object.keys(jobGroups).map((groupId, index) => (
                    <option key={groupId} value={groupId}>
                      Group {index + 1}
                    </option>
                  ))}
                </select>
                {jobGroups && Object.keys(jobGroups).length === 0 && (
                  <p className="text-red-500 text-sm mt-1">
                    No groups available in this class.
                  </p>
                )}
              </div>
              <div className="mb-4">
                <select
                  onChange={handleJobSelection}
                  className="w-full p-2 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a job</option>
                  {jobs.map((job, index) => (
                    <option key={`${job.title}-${index}`} value={job.title}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4 space-y-2">
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
                className="w-full mt-2 bg-northeasternWhite border border-wood text-navy font-bold py-2 rounded-md hover:bg-northeasternRed hover:text-white transition"
              >
                Assign Job
              </button>
            </div>
          </div>
          {/* Tab 3: Groups in Class - Fix the student display */}
          <div title="Groups in Class">
            <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 flex flex-col overflow-y-auto max-h-[45vh] w-[900px] mx-auto">
              <h2 className="text-2xl font-bold text-northeasternRed mb-4">
                {groupsTabClass ? `Groups in Class ${groupsTabClass}` : 'Groups'}
              </h2>
              <div className="mb-4">
                <label className="block text-navy font-semibold mb-2">
                  Select a class to view groups
                </label>
                <select
                  value={groupsTabClass}
                  onChange={handleGroupsTabClassChange}
                  className="w-full p-2 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="text-red-500 text-sm mt-1">
                    You have no assigned classes. Please contact the administrator.
                  </p>
                )}
              </div>

              {/* Add debugging info */}
              {groupsTabClass && (
                <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
                  <p><strong>DEBUG:</strong></p>
                  <p>Students array length: {groupsTabStudents.length}</p>
                  <p>Groups object keys: {Object.keys(groupsTabGroups).join(', ')}</p>
                </div>
              )}

              {!groupsTabClass ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <p className="text-northeasternBlack font-medium">Please select a class to view groups</p>
                  <p className="text-gray-500 text-sm mt-1">Groups will appear here after selecting a class</p>
                </div>
              ) : groupsTabStudents.length > 0 ? (
                // Group students by their group_id from the students array
                (() => {
                  // Create groups from the students data
                  const studentsByGroup: { [key: string]: any[] } = {};
                  
                  groupsTabStudents.forEach((student: any) => {
                    if (student.group_id) {
                      const groupId = student.group_id.toString();
                      if (!studentsByGroup[groupId]) {
                        studentsByGroup[groupId] = [];
                      }
                      studentsByGroup[groupId].push(student);
                    }
                  });

                  return Object.keys(studentsByGroup).length > 0 ? (
                    Object.entries(studentsByGroup).map(([group_id, students]) => (
                      <div key={group_id} className="bg-springWater border border-wood p-2 rounded-md mb-2 shadow">
                        <h3 className="text-xl font-semibold text-navy">Group {group_id}</h3>
                        <ul className="list-none pl-0 text-navy mt-1">
                          {students.map((student: any, index: number) => (
                            <li key={index} className="mb-1 flex items-center justify-between p-1 bg-white rounded">
                              <div className="flex items-center space-x-2">
                                <span className={`w-3 h-3 rounded-full ${student.online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                <span className="font-medium">
                                  {student.f_name && student.l_name 
                                    ? `${student.f_name} ${student.l_name}` 
                                    : student.email.split('@')[0]
                                  } ({student.email})
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm">
                                <span className={`px-2 py-1 rounded ${student.online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                  {student.current_page || 'No page'}
                                </span>
                                <span className="text-gray-600">
                                  No job assigned
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <p className="text-northeasternBlack text-center">No students with group assignments found for this class.</p>
                  );
                })()
              ) : (
                <p className="text-northeasternBlack text-center">No students found for this class.</p>
              )}
            </div>
          </div>
          {/* Tab 4: Pending & Accepted Offers */}
          <div title="Pending & Accepted Offers">
            <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 flex flex-col overflow-y-auto max-h-[70vh] w-[900px] mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-northeasternRed">Offers Management</h2>
                {offersTabClass && (
                  <button
                    onClick={() => refreshOffers()}
                    disabled={offersLoading}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-3 py-1 rounded-md font-medium transition-colors"
                  >
                    {offersLoading ? "Refreshing..." : "Refresh"}
                  </button>
                )}
              </div>
              
              {/* Class Selection */}
              <div className="mb-6">
                <label className="block text-navy font-semibold mb-2">
                  Select Class to View Offers
                </label>
                <select
                  value={offersTabClass}
                  onChange={handleOffersTabClassChange}
                  className="w-full p-2 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {offersLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-8 h-8 border-t-2 border-navy border-solid rounded-full animate-spin mb-2"></div>
                  <p className="text-navy font-medium">Loading offers...</p>
                </div>
              ) : !offersTabClass ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <p className="text-northeasternBlack font-medium">Please select a class to view offers</p>
                  <p className="text-gray-500 text-sm mt-1">Offers will appear here after selecting a class</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pending Offers */}
                  <div>
                    <h3 className="text-lg font-semibold text-navy mb-3 flex items-center">
                      Pending Offers 
                      <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                        {pendingOffers.length}
                      </span>
                    </h3>
                    {pendingOffers.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingOffers.map((offer) => (
                          <div
                            key={offer.id}
                            className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg"
                          >
                            <div className="mb-3">
                              <h4 className="text-base font-semibold text-navy">
                                Group {offer.group_id} → Candidate {offer.candidate_id}
                              </h4>
                              <p className="text-sm text-gray-600">
                                Offer ID: {offer.id} | Status: {offer.status}
                              </p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex space-x-2">
                              <button
                                onClick={() => respondToOffer(offer.id, offer.class_id, offer.group_id, offer.candidate_id, true)}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md font-medium transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => respondToOffer(offer.id, offer.class_id, offer.group_id, offer.candidate_id, false)}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md font-medium transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                        <p className="text-gray-600">No pending offers for this class</p>
                      </div>
                    )}
                  </div>

                  {/* Accepted Offers */}
                  <div>
                    <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center">
                      Accepted Offers 
                      <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                        {acceptedOffers.length}
                      </span>
                    </h3>
                    {acceptedOffers.length > 0 ? (
                      <div className="space-y-2">
                        {acceptedOffers.map((offer) => (
                          <div
                            key={offer.id}
                            className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center justify-between"
                          >
                            <div>
                              <h4 className="font-semibold text-green-800">
                                Group {offer.group_id} → Candidate {offer.candidate_id}
                              </h4>
                              <p className="text-sm text-green-600">
                                Status: Accepted | Offer ID: {offer.id}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                        <p className="text-gray-600">No accepted offers for this class</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Tab: Add Student to Class & Group */}
          <div title="Add Student to Class & Group">
            <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 flex flex-col overflow-y-auto max-h-[45vh] w-[900px] mx-auto">
              <h2 className="text-2xl font-bold text-northeasternRed mb-4">Add Student to Class & Group</h2>
              
              <div className="mb-4">
                <label className="block text-navy font-semibold mb-2">
                  Select Class (CRN)
                </label>
                <select
                  value={addStudentClass}
                  onChange={e => setAddStudentClass(e.target.value)}
                  className="w-full p-2 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a class</option>
                  {classes.map(classItem => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Updated Group Selection - Now a Dropdown */}
              <div className="mb-4">
                <label className="block text-navy font-semibold mb-2">
                  Group Number
                </label>
                <select
                  value={addStudentGroup}
                  onChange={e => setAddStudentGroup(e.target.value)}
                  className="w-full p-2 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!addStudentClass || addStudentAvailableGroups === 0}
                >
                  <option value="">
                    {!addStudentClass 
                      ? "Select a class first" 
                      : addStudentAvailableGroups === 0 
                        ? "No groups available" 
                        : "Select a group"
                    }
                  </option>
                  {addStudentAvailableGroups > 0 && 
                    Array.from({ length: addStudentAvailableGroups }, (_, i) => i + 1).map(groupNum => (
                      <option key={groupNum} value={groupNum}>
                        Group {groupNum}
                      </option>
                    ))
                  }
                </select>
                {addStudentClass && addStudentAvailableGroups > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Available groups: 1 to {addStudentAvailableGroups}
                  </p>
                )}
              </div>
              
              {/* NEW: First and Last Name Row */}
              <div className="mb-4">
                <label className="block text-navy font-semibold mb-2">
                  Student Name
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      value={addStudentFirstName}
                      onChange={e => setAddStudentFirstName(e.target.value)}
                      className="w-full p-2 border border-wood bg-springWater rounded-md"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={addStudentLastName}
                      onChange={e => setAddStudentLastName(e.target.value)}
                      className="w-full p-2 border border-wood bg-springWater rounded-md"
                      placeholder="Last name"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-navy font-semibold mb-2">
                  Student Email
                </label>
                <input
                  type="email"
                  value={addStudentEmail}
                  onChange={e => setAddStudentEmail(e.target.value)}
                  className="w-full p-2 border border-wood bg-springWater rounded-md"
                  placeholder="Enter student email"
                />
              </div>
              
              <div className="flex justify-center">
                <button
                  className="bg-northeasternRed text-white px-4 py-2 rounded font-bold hover:bg-navy transition"
                  onClick={addStudentToClassGroup}
                >
                  Add Student
                </button>
              </div>
            </div>
          </div>
        </Tabs>
      </div>
      {popup && (
        <Popup
          headline={popup.headline}
          message={popup.message}
          onDismiss={() => setPopup(null)}
        />
      )}
    </div>
  );
};

export default Grouping;