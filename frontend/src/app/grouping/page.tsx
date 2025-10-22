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
  
  // Delete confirmation popup state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    studentEmail: string;
    studentName: string;
    classId: string;
  }>({
    show: false,
    studentEmail: '',
    studentName: '',
    classId: ''
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<String[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [group_id, setGroupId] = useState("");
  const [updateNumGroups, setUpdateNumGroups] = useState<number | "">("");

  interface Job { title: string; [key: string]: any; }
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [jobGroups, setJobGroups] = useState<string[]>([]);
  const [selectedJobClass, setSelectedJobClass] = useState("");
  const [selectedJobGroup, setSelectedJobGroup] = useState("");
  const [job_group_id, setGroupIdJob] = useState("");
   
  const [groupsTabClass, setGroupsTabClass] = useState("");
  const [groupsTabGroups, setGroupsTabGroups] = useState<{ [key: string]: any }>({});
  const [groupsTabStudents, setGroupsTabStudents] = useState<Student[]>([]);

  // Function to refresh groups tab students
  const refreshGroupsTabStudents = () => {
    if (groupsTabClass) {
      fetch(`${API_BASE_URL}/students?class=${groupsTabClass}`)
        .then(res => res.json())
        .then(setGroupsTabStudents)
        .catch(err => {
          console.error("Students API error:", err);
        });
    }
  };

  // Delete student function
  const handleDeleteStudent = async (studentEmail: string, studentName: string, classId: string) => {
    setDeleteConfirmation({
      show: true,
      studentEmail,
      studentName,
      classId
    });
  };

  const confirmDeleteStudent = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/teacher/del-student`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: deleteConfirmation.studentEmail
        }),
      });

      if (response.ok) {
        setPopup({ 
          headline: "Success", 
          message: `${deleteConfirmation.studentName} has been removed from the class successfully!` 
        });
        // Refresh the students list
        refreshGroupsTabStudents();
      } else {
        setPopup({ 
          headline: "Error", 
          message: "Failed to remove student from class." 
        });
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      setPopup({ 
        headline: "Error", 
        message: "Failed to remove student from class." 
      });
    } finally {
      // Close the confirmation popup
      setDeleteConfirmation({
        show: false,
        studentEmail: '',
        studentName: '',
        classId: ''
      });
    }
  };

  const cancelDeleteStudent = () => {
    setDeleteConfirmation({
      show: false,
      studentEmail: '',
      studentName: '',
      classId: ''
    });
  };
 
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

  // Fetch assigned classes
  useEffect(() => {
    if (user?.email && user.affiliation === "admin") {
      fetch(`${API_BASE_URL}/moderator-classes-full/${user.email}`)
        .then(res => res.json())
        .then((data) => {
          setAssignedClassIds(data.map((item: any) => String(item.crn)));
          setClasses(data.map((item: any) => ({
            id: item.crn,
            name: `CRN ${item.crn}`
          })));
        });
    }
  }, [user]);

  useEffect(( ) => {
    console.log(groups);
  }, [groups]);

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
      console.log("🔍 Fetching job groups for class:", selectedJobClass);
      
      fetch(`${API_BASE_URL}/groups?class=${selectedJobClass}`)
        .then(res => {
          console.log("📡 Job Groups API response status:", res.status);
          return res.json();
        })
        .then(data => {
          console.log("📊 Job Groups API response:", data);
          setJobGroups(data);
        })
        .catch(error => {
          console.error("❌ Job Groups API error:", error);
        });
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
    const newGroup = e.target.value;
    console.log("Selected group value:", newGroup);
    setSelectedJobGroup(newGroup);
    
    if (newGroup && jobGroups.includes(newGroup)) {
      console.log("Setting group ID to:", newGroup);
      setGroupIdJob(newGroup);
    } else if (newGroup) {
      console.log("Invalid group selection");
      setPopup({ headline: "Invalid Selection", message: "Invalid group selection." });
    }
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGroup = e.target.value;
    setSelectedGroup(newGroup);
    if (newGroup && groups.includes(newGroup)) {
      setGroupId(newGroup);
    } else if (newGroup) {
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
      fetch(`${API_BASE_URL}/groups?class=${selectedJobClass}`)
        .then(res => res.json())
        .then(setJobGroups);
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
    <div className="flex flex-col h-screen bg-sand font-rubik">
      <NavbarAdmin />
      <div className="flex-1 p-4 flex gap-4 overflow-hidden">
        {/* Left side - Main tabs */}
        <div className="flex-1 flex flex-col">
          <Tabs>
            {/* Tab: Job Assignment */}
            <div title="Job Assignment">
              <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 flex flex-col overflow-y-auto max-h-[70vh] w-full">
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
                    {Array.isArray(jobGroups) && jobGroups.map((groupId) => (
                      <option key={groupId} value={groupId}>
                        Group {groupId}
                      </option>
                    ))}
                  </select>
                  {jobGroups && jobGroups.length === 0 && (
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
                <div className="mb-4 space-y-2 flex-1 overflow-y-auto">
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

            {/* Tab: Class & Student Assignment */}
            <div title="Class & Student Assignment">
              <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 flex flex-col overflow-y-auto max-h-[70vh] w-full">
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
                <div className="mb-2 space-y-2 flex-1 overflow-y-auto">
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
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleAssignGroup}
                    className="bg-northeasternRed text-white px-4 py-2 rounded font-bold hover:bg-navy transition"
                  >
                    Assign Group
                  </button>
                </div>
              </div>
              
              {/* Update Number of Groups section */}
              <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-4 mt-4 w-full">
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

          </Tabs>
        </div>

        {/* Right side - Fixed Groups in Class panel */}
        <div className="w-1/2 border-l-4 border-northeasternBlack pl-4 flex flex-col h-full">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-northeasternWhite rounded-lg p-4 flex-1 flex flex-col min-h-0">
              <h2 className="text-2xl font-bold text-center text-northeasternRed mb-4 flex-shrink-0">
                {groupsTabClass ? `Groups in Class ${groupsTabClass}` : 'Groups'}
              </h2>
              
              <div className="mb-4 flex-shrink-0">
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
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {!groupsTabClass ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <p className="text-northeasternBlack font-medium">Please select a class to view groups</p>
                    <p className="text-gray-500 text-sm mt-1">Groups will appear here after selecting a class</p>
                  </div>
                ) : groupsTabStudents.length > 0 ? (
                  (() => {
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
                      <div className="space-y-2">
                        {Object.entries(studentsByGroup).map(([group_id, students]) => (
                          <div key={group_id} className="bg-springWater border border-wood p-3 rounded-md shadow">
                            <h3 className="text-xl font-semibold text-navy mb-2">Group {group_id}</h3>
                            <div className="space-y-1">
                              {students.map((student: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                                  <div className="flex items-center space-x-2 flex-1">
                                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${student.online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                    <span className="font-medium text-sm">
                                      {student.f_name && student.l_name 
                                        ? `${student.f_name} ${student.l_name}` 
                                        : student.email.split('@')[0]
                                      } ({student.email})
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center space-x-1 text-xs">
                                      <span className={`px-2 py-1 rounded whitespace-nowrap ${student.online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {student.current_page || 'No page'}
                                      </span>
                                      <span className="text-gray-600 whitespace-nowrap">
                                        No job assigned
                                      </span>
                                    </div>
                                    {/* Delete Button */}
                                    <button
                                      onClick={() => handleDeleteStudent(
                                        student.email, 
                                        student.f_name && student.l_name 
                                          ? `${student.f_name} ${student.l_name}` 
                                          : student.email.split('@')[0],
                                        groupsTabClass
                                      )}
                                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                                      title="Remove student from class"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 text-center">
                        <p className="text-northeasternBlack">No students with group assignments found for this class.</p>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <p className="text-northeasternBlack">No students found for this class.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Popup */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-red-600 mb-4">Confirm Deletion</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to remove <strong>{deleteConfirmation.studentName}</strong> from this class? 
              This action cannot be undone.
            </p>
            <div className="flex space-x-4 justify-end">
              <button
                onClick={cancelDeleteStudent}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteStudent}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-medium transition-colors"
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}
      
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