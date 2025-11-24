'use client';
export const dynamic = "force-dynamic";
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavbarAdmin from "../components/navbar-admin";
import AdminReactionPopup from "../components/adminReactionPopup";
import { useSocket } from "../components/socketContext";
import Popup from "../components/popup";
import { useAuth } from "../components/AuthContext";

interface User {
  id: number;
  name: string;
  email: string;
  affiliation: string;
}

interface Job {
  id: number;
  title: string;
  file_path: string;
  class_id: number;
}

interface Resume {
  id: number;
  title: string;
  file_path: string;
  first_name?: string;
  last_name?: string;
  interview?: string;
  class_id: number;
}

interface ClassInfo {
  crn: number;
  class_name?: string;
  admin_email: string;
}

const Upload = () => {
  const { user, loading: userloading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  // Separate states for Job Description
  const [jobTitle, setJobTitle] = useState("");
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [jobUploading, setJobUploading] = useState(false);
  
  // Separate states for Resume
  const [resTitle, setResTitle] = useState("");
  const [resFirstName, setResFirstName] = useState("");
  const [resLastName, setResLastName] = useState("");
  const [resYouTubeVideo, setResYouTubeVideo] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  
  // Scroll states for jobs and resumes
  const [jobsScrollState, setJobsScrollState] = useState({ canScrollDown: false, canScrollUp: false });
  const [resumesScrollState, setResumesScrollState] = useState({ canScrollDown: false, canScrollUp: false });

  const router = useRouter();
  const [pendingOffers, setPendingOffers] = useState<
  { classId: number; groupId: number; candidateId: number }[]
  >([]);  
  const socket = useSocket();

  const handleJobsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const canScrollDown = element.scrollHeight > element.clientHeight && 
                          element.scrollTop < element.scrollHeight - element.clientHeight - 5;
    const canScrollUp = element.scrollTop > 5;
    
    setJobsScrollState({ canScrollDown, canScrollUp });
  };

  const handleResumesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const canScrollDown = element.scrollHeight > element.clientHeight && 
                          element.scrollTop < element.scrollHeight - element.clientHeight - 5;
    const canScrollUp = element.scrollTop > 5;
    
    setResumesScrollState({ canScrollDown, canScrollUp });
  };

  // Check initial scroll states when jobs/resumes update
  useEffect(() => {
    const checkInitialScroll = () => {
      const jobsElement = document.getElementById('jobs-list');
      const resumesElement = document.getElementById('resumes-list');
      
      if (jobsElement && jobs.length > 0) {
        const canScrollDown = jobsElement.scrollHeight > jobsElement.clientHeight;
        setJobsScrollState({ canScrollDown, canScrollUp: false });
      }
      
      if (resumesElement && resumes.length > 0) {
        const canScrollDown = resumesElement.scrollHeight > resumesElement.clientHeight;
        setResumesScrollState({ canScrollDown, canScrollUp: false });
      }
    };
    
    // Small delay to ensure elements are rendered
    setTimeout(checkInitialScroll, 100);
  }, [jobs, resumes]);

  // Fetch classes when user is loaded
  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.email) return;

      try {
        const response = await fetch(`${API_BASE_URL}/moderator/classes-full/${user.email}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const classData = await response.json();
          setClasses(classData);
          
          // Auto-select first class if available
          if (classData.length > 0) {
            setSelectedClass(classData[0].crn.toString());
          }
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    fetchClasses();
  }, [user]);

  // Fetch jobs and resumes when selectedClass changes
  useEffect(() => {
    if (selectedClass) {
      fetchJobs();
      fetchResumes();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (!socket) return;

    const onRequest = (data: { classId: number; groupId: number; candidateId: number }) => {
      const { classId, groupId, candidateId } = data;
      setPendingOffers((prev) => [...prev, { classId, groupId, candidateId }]);
    };
      
    socket.on("makeOfferRequest", onRequest);
    
    return () => {
      socket.off("makeOfferRequest", onRequest);
    };
  }, [socket]); 

  const respondToOffer = (
    classId: number,
    groupId: number,
    candidateId: number,
    accepted: boolean
  ) => {
    if (!socket) {
      console.error('Socket not connected');
      return;
    }

    socket.emit("makeOfferResponse", {
      classId,
      groupId,
      candidateId,
      accepted,
    });
    
    setPendingOffers((prev) =>
      prev.filter((o) => o.classId !== classId || o.groupId !== groupId || o.candidateId !== candidateId)
    );
  };

  const fetchJobs = async () => {
    if (!selectedClass) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/jobs?class_id=${selectedClass}`, { 
        credentials: "include" 
      });
      const data = await response.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const fetchResumes = async () => {
    if (!selectedClass) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/resume_pdf?class_id=${selectedClass}`, { 
        credentials: "include" 
      });
      const data = await response.json();
      setResumes(Array.isArray(data) ? data : []);   
    } catch (error) {
      console.error("Error fetching resumes:", error);
    }
  };

  const deleteResume = async (resumeId: number, filePath: string, classId: number) => {
    const fileName = filePath.split("/").pop(); 
    
    try {
      const response = await fetch(`${API_BASE_URL}/delete/resume/${fileName}?class_id=${classId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Error: ${await response.text()}`);
      }
      
      setPopup({ headline: "Success", message: "Resume deleted successfully." });
      fetchResumes();
    } catch (error) {
      console.error("Failed to delete file:", error);
      setPopup({ headline: "Error", message: "Failed to delete the resume." });
    }
  };

  const deleteJob = async (jobId: number, filePath: string, classId: number) => {
    const fileName = filePath.split("/").pop();
    
    try {
      const response = await fetch(`${API_BASE_URL}/delete/job/${fileName}?class_id=${classId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Error: ${await response.text()}`);
      }
      
      setPopup({ headline: "Success", message: "Job description deleted successfully." });
      fetchJobs();
    } catch (error) {
      console.error("Failed to delete file:", error);
      setPopup({ headline: "Error", message: "Failed to delete the job description." });
    }
  };

  const handleJobFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setJobFile(e.target.files[0]);
    }
  };

  const handleResumeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setResumeFile(e.target.files[0]);
    }
  };

  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/).+/;
    return youtubeRegex.test(url);
  };

  const uploadJobDescription = async () => {
    if (!selectedClass) return setPopup({ headline: "Error", message: "Please select a class first." });
    if (!jobFile) return setPopup({ headline: "Error", message: "No file selected for upload." });
    if (!jobTitle.trim()) return setPopup({ headline: "Error", message: "Please enter a job title before uploading." });

    const formData = new FormData();
    formData.append("jobDescription", jobFile);

    try {
      setJobUploading(true);

      const response = await fetch(`${API_BASE_URL}/upload/job`, { 
        method: "POST", 
        body: formData,
        credentials: "include"
      });

      if (!response.ok) throw new Error("Job description upload failed");
      const { filePath } = await response.json();

      await fetch(`${API_BASE_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: jobTitle, 
          filePath,
          class_id: selectedClass 
        }),
        credentials: "include"
      });

      fetchJobs();
      setJobTitle("");
      setJobFile(null);
      const jobFileInput = document.querySelector('input[type="file"][accept="application/pdf"]:first-of-type') as HTMLInputElement;
      if (jobFileInput) {
        jobFileInput.value = '';
      }
      
      setPopup({ headline: "Success", message: "Job description uploaded successfully!" });
    } catch (error) {
      console.error("Job upload error:", error);
      setPopup({ headline: "Error", message: "Failed to upload job description" });
    } finally {
      setJobUploading(false);
    }
  };
  
  const uploadResume = async () => {
    if (!selectedClass) return setPopup({ headline: "Error", message: "Please select a class first." });
    if (!resumeFile) return setPopup({ headline: "Error", message: "No file selected for upload." });
    if (!resTitle.trim()) return setPopup({ headline: "Error", message: "Please enter a resume title before uploading." });
    if (!resFirstName.trim()) return setPopup({ headline: "Error", message: "Please enter the candidate's first name." });
    if (!resLastName.trim()) return setPopup({ headline: "Error", message: "Please enter the candidate's last name." });
    if (!resYouTubeVideo.trim()) return setPopup({ headline: "Error", message: "Please enter a YouTube video URL." });
    if (!isValidYouTubeUrl(resYouTubeVideo)) return setPopup({ headline: "Error", message: "Please enter a valid YouTube URL." });

    const formData = new FormData();
    formData.append("resume", resumeFile);

    try {
      setResumeUploading(true);

      const response = await fetch(`${API_BASE_URL}/upload/resume`, { 
        method: "POST", 
        body: formData,
        credentials: "include"
      });

      if (!response.ok) throw new Error("Resume upload failed");
      const { filePath } = await response.json();

      const dbResponse = await fetch(`${API_BASE_URL}/resume_pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          resTitle, 
          filePath,
          f_name: resFirstName,
          l_name: resLastName,
          vid: resYouTubeVideo,
          class_id: selectedClass
        }),
        credentials: "include"
      });

      if (!dbResponse.ok) {
        const errorData = await dbResponse.json();
        throw new Error(errorData.error || "Database error");
      }

      fetchResumes();
      setResTitle("");
      setResFirstName("");
      setResLastName("");
      setResYouTubeVideo("");
      setResumeFile(null);
      
      const resumeFileInput = document.querySelector('input[type="file"][accept="application/pdf"]:last-of-type') as HTMLInputElement;
      if (resumeFileInput) {
        resumeFileInput.value = '';
      }
      
      setPopup({ headline: "Success", message: "Resume uploaded successfully!" });
    } catch (error) {
      console.error("Resume upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Resume upload failed. Please try again.";
      setPopup({ headline: "Error", message: errorMessage });
    } finally {
      setResumeUploading(false);
    }
  };

  if (userloading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sand">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          <div className="w-16 h-16 border-t-4 border-navy border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }  
  
  if (!user || user.affiliation !== "admin") return <div>Unauthorized</div>;

  return (
    <div className="flex flex-col min-h-screen bg-sand font-rubik">
      <NavbarAdmin />
      
      {/* Class Selector */}
      <div className="p-4 bg-white border-b-4 border-northeasternBlack">
        <div className="max-w-md mx-auto">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Class:
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-navy"
          >
            <option value="">Choose a class...</option>
            {classes.map((cls) => (
              <option key={cls.crn} value={cls.crn}>
                CRN: {cls.crn} - {cls.admin_email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedClass ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-xl">Please select a class to upload jobs and resumes</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 p-4">
          {/* Job Description Upload Section */}
          <div className="border-4 border-northeasternBlack rounded-lg p-4 bg-white">
            <h2 className="text-2xl font-bold text-navy mb-4">Upload Job Description</h2>
            
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Enter job title" 
                value={jobTitle} 
                onChange={(e) => setJobTitle(e.target.value)} 
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy" 
              />
              
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleJobFile} 
                className="w-full p-3 border border-gray-300 rounded-md" 
              />
              
              <button 
                onClick={uploadJobDescription} 
                disabled={jobUploading} 
                className="w-full bg-northeasternBlack text-northeasternWhite p-3 rounded-md hover:bg-navy transition duration-200 disabled:bg-gray-400">
                {jobUploading ? "Uploading..." : "Upload Job Description"}
              </button>
            </div>

            <h3 className="text-xl font-bold mt-6 mb-3">Existing Job Descriptions (Class {selectedClass})</h3>
            <div className="relative">
              {jobsScrollState.canScrollUp && (
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none flex items-start justify-center">
                  <div className="text-blue-600 text-xs font-semibold animate-bounce">
                    ▲ Scroll up
                  </div>
                </div>
              )}
              
              <div 
                id="jobs-list"
                className="max-h-60 overflow-y-auto"
                onScroll={handleJobsScroll}
              >
                {jobs.length === 0 ? (
                  <p className="text-gray-500">No job descriptions uploaded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {jobs.map((job) => (
                      <li key={job.id} className="border border-gray-200 p-3 rounded-md flex justify-between items-center">
                        <div>
                          <strong className="text-navy">{job.title}</strong>
                          <a href={`${API_BASE_URL}/${job.file_path}`} target="_blank" className="text-blue-500 ml-2 hover:underline">
                            View PDF
                          </a>
                        </div>
                        <button 
                          onClick={() => deleteJob(job.id, job.file_path, job.class_id)} 
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition duration-200">
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {jobsScrollState.canScrollDown && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none flex items-end justify-center">
                  <div className="text-blue-600 text-xs font-semibold animate-bounce">
                    ▼ Scroll down
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resume Upload Section */}
          <div className="border-4 border-northeasternBlack rounded-lg p-4 bg-white">
            <h2 className="text-2xl font-bold text-navy mb-4">Upload Candidate</h2>
            
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Enter resume title" 
                value={resTitle} 
                onChange={(e) => setResTitle(e.target.value)} 
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy" 
              />
              
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="First name" 
                  value={resFirstName} 
                  onChange={(e) => setResFirstName(e.target.value)} 
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy" 
                />
                <input 
                  type="text" 
                  placeholder="Last name" 
                  value={resLastName} 
                  onChange={(e) => setResLastName(e.target.value)} 
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy" 
                />
              </div>
              
              <input 
                type="url" 
                placeholder="YouTube interview video URL" 
                value={resYouTubeVideo} 
                onChange={(e) => setResYouTubeVideo(e.target.value)} 
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy" 
              />
              
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleResumeFile} 
                className="w-full p-3 border border-gray-300 rounded-md" 
              />
              
              <button 
                onClick={uploadResume} 
                disabled={resumeUploading} 
                className="w-full bg-northeasternBlack text-northeasternWhite p-3 rounded-md hover:bg-navy transition duration-200 disabled:bg-gray-400">
                {resumeUploading ? "Uploading..." : "Upload Candidate"}
              </button>
            </div>

            <h3 className="text-xl font-bold mt-6 mb-3">Existing Candidates (Class {selectedClass})</h3>
            <div className="relative">
              {resumesScrollState.canScrollUp && (
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none flex items-start justify-center">
                  <div className="text-blue-600 text-xs font-semibold animate-bounce">
                    ▲ Scroll up
                  </div>
                </div>
              )}
              
              <div 
                id="resumes-list"
                className="max-h-60 overflow-y-auto"
                onScroll={handleResumesScroll}
              >
                {resumes.length === 0 ? (
                  <p className="text-gray-500">No Candidates uploaded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {resumes.map((resume) => (
                      <li key={resume.id} className="border border-gray-200 p-3 rounded-md">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-semibold text-navy">{resume.first_name} {resume.last_name}</div>
                            <div className="flex gap-2 mt-1">
                              <a href={`${API_BASE_URL}/${resume.file_path}`} target="_blank" className="text-blue-500 text-sm hover:underline">
                                View PDF
                              </a>
                              {resume.interview && (
                                <a href={resume.interview} target="_blank" className="text-red-500 text-sm hover:underline">
                                  Watch Interview
                                </a>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => deleteResume(resume.id, resume.file_path, resume.class_id)} 
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition duration-200 ml-2">
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {resumesScrollState.canScrollDown && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none flex items-end justify-center">
                  <div className="text-blue-600 text-xs font-semibold animate-bounce">
                    ▼ Scroll down
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Render pending offers as popups */}
      {pendingOffers.map(({classId, groupId, candidateId }) => (
        <div
          key={`offer-${classId}-${groupId}-${candidateId}`}
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
        >
        <div className="bg-springWater p-6 rounded-lg shadow-lg max-w-md mx-auto">
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
  );
};

export default Upload;