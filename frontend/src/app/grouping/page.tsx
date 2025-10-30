'use client';
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavbarAdmin from "../components/navbar-admin";
import { io } from "socket.io-client";
import Tabs from "../components/tabs";
import Popup from "../components/popup";
import { StudentCSVTab } from "../components/StudentCSVTab";
import { ManageGroupsTab } from "../components/ManageGroupsTab";

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
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [group_id, setGroupId] = useState("");

  interface Job { title: string; [key: string]: any; }
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [jobGroups, setJobGroups] = useState<string[]>([]);
  const [selectedJobClass, setSelectedJobClass] = useState("");
  const [selectedJobGroup, setSelectedJobGroup] = useState("");
  const [job_group_id, setGroupIdJob] = useState("");;
 
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
      fetch(`${API_BASE_URL}/moderator/classes-full/${user.email}`, { credentials: "include" })
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

  // Tab 1: Fetch groups and students for selected class
  useEffect(() => {
    if (selectedClass) {
      fetch(`${API_BASE_URL}/groups?class=${selectedClass}`, { credentials: "include" })
        .then(res => res.json())
        .then(data => {
          const stringJobGroups = Array.isArray(data) ? data.map(String) : [];
          setGroups(stringJobGroups);
        });
      fetch(`${API_BASE_URL}/groups-by-class/${selectedClass}`, { credentials: "include" })
        .then(res => res.json())
        .then(setStudents);
    }
  }, [selectedClass]);

  // Tab 2: Fetch job groups for selected job class
  useEffect(() => {
    if (selectedJobClass) {      
      fetch(`${API_BASE_URL}/groups?class=${selectedJobClass}`, { credentials: "include" })
        .then(res => {
          return res.json();
        })
        .then(data => {
          const stringJobGroups = Array.isArray(data) ? data.map(String) : [];
          setJobGroups(stringJobGroups);
        })
        .catch(error => {
          console.error("❌ Job Groups API error:", error);
        });
    }
  }, [selectedJobClass]);

  // Fetch jobs
  useEffect(() => {
    fetch(`${API_BASE_URL}/jobs`, { credentials: "include" })
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
    setSelectedJobGroup(newGroup);
    if (newGroup && jobGroups.includes(newGroup)) {
      setGroupIdJob(newGroup);
    } else if (newGroup) {
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
    const response = await fetch(`${API_BASE_URL}/groups/update-group`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group_id,
        class_id: selectedClass,
        students: selectedStudents.map(student => student.email)
      }),
      credentials: "include"
    });
    if (response.ok) {
      setPopup({ headline: "Success", message: "Students assigned to group successfully!" });
      setSelectedStudents([]);
      setGroupId("");
      fetch(`${API_BASE_URL}/groups?class=${selectedClass}`, { credentials: "include" })
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
    const response = await fetch(`${API_BASE_URL}/jobs/update-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_group_id,
        class_id: selectedJobClass,
        job: selectedJobs.map(job => job.title)
      }),
      credentials: "include"
    });
    if (response.ok) {
      setPopup({ headline: "Success", message: "Job assigned to group successfully!" });
      setSelectedJobs([]);
      setGroupIdJob("");
      fetch(`${API_BASE_URL}/groups?class=${selectedJobClass}`, { credentials: "include" })
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
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        <Tabs>
          <div title="Manage Groups">
            <div className="w-full h-full flex flex-col overflow-y-auto border-4 border-northeasternBlack rounded-lg">
              <ManageGroupsTab />
            </div>
          </div>

          <div title="CSV Group Assignment">
            <div className="w-full h-full flex flex-col overflow-y-auto border-4 border-northeasternBlack rounded-lg">
              <StudentCSVTab />
            </div>
          </div>
          {/* Tab: Job Assignment */}
          <div title="Job Assignment">
            <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-6 flex flex-col overflow-y-auto max-h-[80vh]">
              <h2 className="text-2xl font-bold text-northeasternRed mb-4">Job Assignment</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Class Selection */}
                <div>
                  <label className="block text-navy font-semibold mb-2">
                    Select Class
                  </label>
                  <select
                    value={selectedJobClass}
                    onChange={handleJobClassChange}
                    className="w-full p-3 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                {/* Group Selection */}
                <div>
                  <label className="block text-navy font-semibold mb-2">
                    Select Group
                  </label>
                  <select
                    value={selectedJobGroup}
                    onChange={handleJobGroupChange}
                    className="w-full p-3 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                {/* Job Selection */}
                <div>
                  <label className="block text-navy font-semibold mb-2">
                    Select Job
                  </label>
                  <select
                    onChange={handleJobSelection}
                    className="w-full p-3 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a job</option>
                    {jobs.map((job, index) => (
                      <option key={`${job.title}-${index}`} value={job.title}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Jobs Display */}
              <div className="mb-6">
                <label className="block text-navy font-semibold mb-3">
                  Selected Jobs
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedJobs.length === 0 ? (
                    <p className="text-gray-500 italic p-4 text-center border-2 border-dashed border-gray-300 rounded-lg">
                      No jobs selected
                    </p>
                  ) : (
                    selectedJobs.map(job => (
                      <div key={job.title} className="flex items-center justify-between p-3 bg-springWater rounded-md border border-wood">
                        <span className="text-navy font-medium">{job.title}</span>
                        <button
                          onClick={() => handleRemoveJob(job.title)}
                          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleAssignJob}
                  className="bg-northeasternRed text-white px-8 py-3 rounded-lg font-bold hover:bg-navy transition-colors text-lg"
                >
                  Assign Job to Group
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