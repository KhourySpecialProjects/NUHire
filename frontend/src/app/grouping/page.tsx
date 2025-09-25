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

  // Tab 4: Offers
  const [pendingOffers, setPendingOffers] = useState<{ classId: number; groupId: number; candidateId: number }[]>([]);
  const [acceptedOffers, setAcceptedOffers] = useState<{ classId: number; groupId: number; candidateId: number }[]>([]);

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

  // Admin socket setup
  useEffect(() => {
    if (!user || user.affiliation !== "admin") return;

    const socketUpdate = io(API_BASE_URL);

    console.log(user);

    socketUpdate.emit("adminOnline", { adminEmail: user.email });

    const onRequest = (data: { classId: number; groupId: number; candidateId: number }) => {
      console.log("Received offer request:", data);
      setPendingOffers((prev) => [...prev, data]);
    };
    const onResponse = (data: { classId: number; groupId: number; candidateId: number; accepted: boolean }) => {
      if (data.accepted) {
        setAcceptedOffers((prev) => {
          if (prev.some(o => o.classId === data.classId && o.groupId === data.groupId && o.candidateId === data.candidateId)) return prev;
          return [...prev, { classId: data.classId, groupId: data.groupId, candidateId: data.candidateId }];
        });
      }
    };

    socketUpdate.on("makeOfferRequest", onRequest);
    socketUpdate.on("makeOfferResponse", onResponse);

    return () => {
      socketUpdate.off("makeOfferRequest", onRequest);
      socketUpdate.off("makeOfferResponse", onResponse);
      socketUpdate.disconnect();
    };
  }, [user]);

  const respondToOffer = (classId: number, groupId: number, candidateId: number, accepted: boolean) => {
    const socketOffer = io(API_BASE_URL);
    socketOffer.emit("makeOfferResponse", { classId, groupId, candidateId, accepted });
    setPendingOffers((prev) =>
      prev.filter((o) => o.classId !== classId || o.groupId !== groupId || o.candidateId !== candidateId)
    );
  };

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

  // Tab 3: Fetch groups for independent class selection
  useEffect(() => {
    if (groupsTabClass) {
      fetch(`${API_BASE_URL}/groups?class=${groupsTabClass}`)
        .then(res => res.json())
        .then( data => {
          setGroupsTabGroups
        });
    } else {
      setGroupsTabGroups({});
    }
  }, [groupsTabClass]);

  // Fetch jobs
  useEffect(() => {
    fetch(`${API_BASE_URL}/jobs`)
      .then(res => res.json())
      .then(setJobs);
  }, []);

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
          {/* Tab 3: Groups in Class (independent state) */}
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
              {!groupsTabClass ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <p className="text-northeasternBlack font-medium">Please select a class to view groups</p>
                  <p className="text-gray-500 text-sm mt-1">Groups will appear here after selecting a class</p>
                </div>
              ) : groupsTabGroups && Object.keys(groupsTabGroups).length > 0 ? (
                Object.entries(groupsTabGroups).map(([group_id, students]) => (
                  <div key={group_id} className="bg-springWater border border-wood p-2 rounded-md mb-2 shadow">
                    {isNaN(Number(group_id)) ? (
                      <h3 className="text-xl font-semibold text-red-600">No groups found</h3>
                    ) : (
                      <h3 className="text-xl font-semibold text-navy">Group {group_id}</h3>
                    )}
                    <ul className="list-none pl-0 text-navy mt-1">
                      {Array.isArray(students) && students.length > 0 ? (
                        students.map((student: any, index: number) => (
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
          </div>
          {/* Tab 4: Pending & Accepted Offers */}
          <div title="Pending & Accepted Offers">
            <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 flex flex-col overflow-y-auto max-h-[45vh] w-[900px] mx-auto">
              <h2 className="text-2xl font-bold text-northeasternRed mb-4">Pending & Accepted Offers</h2>
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