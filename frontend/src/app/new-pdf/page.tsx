'use client';
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import NavbarAdmin from "../components/navbar-admin";
import AdminReactionPopup from "../components/adminReactionPopup"; // Importing popup component for offers
import { io, Socket } from "socket.io-client";
import Popup from "../components/popup";

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
}

interface Resume {
  id: number;
  title: string;
  file_path: string;
}


const Upload = () => {
  const [user, setUser] = useState<User| null>(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [title, setTitle] = useState("");
  const [resTitle, setResTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedResume, setSelectedResume] = useState<number | null>(null);
  const router = useRouter();
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [pendingOffers, setPendingOffers] = useState<
  { classId: number; groupId: number; candidateId: number }[]
  >([]);  
  const socket = io(API_BASE_URL);

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

  useEffect(() => {
    const onRequest = (data: { classId: number; groupId: number; candidateId: number }) => {
      const { classId, groupId, candidateId } = data;
      setPendingOffers((prev) => [...prev, {classId, groupId, candidateId }]);
    };
      
      socket.on("makeOfferRequest", onRequest);
      return () => {
        socket.off("makeOfferRequest", onRequest);
      };
    }, []);
  
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
    

  useEffect(() => {
    fetchJobs();
    fetchResumes();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs`);
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const fetchResumes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/resume_pdf`);
      const data = await response.json();
      setResumes(data);
    } catch (error) {
      console.error("Error fetching resumes:", error);
    }
  };

  const saveFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
    }
  };

  const deleteResume = async (filePath: string) => {
    const fileName = filePath.split("/").pop(); // Extract just the filename
    
    try {
      const response = await fetch(`${API_BASE_URL}/delete/resume/${fileName}`, {
        method: "DELETE",
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${await response.text()}`);
      }
      
      setPopup({ headline: "Success", message: "Resume deleted successfully." });
  
      // Refresh the resumes list after deletion
      fetchResumes();
    } catch (error) {
      console.error("Failed to delete file:", error);
      setPopup({ headline: "Error", message: "Failed to delete the resume." });
    }
  };

  const deleteJob = async (filePath: string) => {
    const fileName = filePath.split("/").pop(); // Extract just the filename
    
    try {
      const response = await fetch(`${API_BASE_URL}/delete/job/${fileName}`, {
        method: "DELETE",
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${await response.text()}`);
      }
      
      setPopup({ headline: "Success", message: "Job description deleted successfully." });
      fetchJobs();
      // Refresh the resumes list after deletion
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

const uploadFile = async (type: "job" | "resume") => {
  const fileToUpload = type === "job" ? jobFile : resumeFile;
  if (!fileToUpload) return setPopup({ headline: "Error", message: "No file selected for upload." });
  if (type === "job" && !title.trim()) return setPopup({ headline: "Error", message: "Please enter a job title before uploading." });
  if (type === "resume" && !resTitle.trim()) return setPopup({ headline: "Error", message: "Please enter a resume title before uploading." });

  const formData = new FormData();
  formData.append(type === "job" ? "jobDescription" : "resume", fileToUpload);

  try {
    setUploading(true);

    const response = await fetch(`${API_BASE_URL}/upload/${type}`, { 
      method: "POST", 
      body: formData 
    });

    if (!response.ok) throw new Error("File upload failed");
    const { filePath } = await response.json();

    if (type === "job") {
      await fetch(`${API_BASE_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, filePath }),
      });
      fetchJobs();
      setJobFile(null);
    } else if (type === "resume") {
      await fetch(`${API_BASE_URL}/resume_pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resTitle, filePath }),
      });
      fetchResumes();
      setResumeFile(null);
    }
  } catch (error) {
    console.error("Upload error:", error);
  } finally {
    setUploading(false);
  }
};

const handleResumeSelection = (id: number) => {
  console.log("Selected Resume ID:", id); // Debugging log
  setSelectedResume(id);
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
  
  if (!user || user.affiliation !== "admin") return <div>Unauthorized</div>;

  return (
    <div className="flex flex-col min-h-screen bg-sand font-rubik">
      <NavbarAdmin />
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="border-4 border-northeasternBlack rounded-lg p-4 bg-white">
          <h2 className="text-2xl font-bold text-navy">Upload Job Description</h2>
          <input type="text" placeholder="Enter job title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded mt-2" />
          <input type="file" accept="application/pdf" onChange={handleJobFile} className="w-full p-2 border rounded mt-2" />
          <button onClick={() => uploadFile("job")} disabled={uploading} className="w-full bg-northeasternBlack text-northeasternWhite p-2 rounded mt-2">
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <h3 className="text-xl font-bold mt-4">Existing Job Descriptions</h3>
          <ul>
            {jobs.length === 0 ? <p>No job descriptions uploaded yet.</p> : jobs.map((job) => (
              <li key={job.id} className="border-b py-2 flex justify-between items-center">
                <div>
                  <strong>{job.title}</strong> - 
                  <a href={`${API_BASE_URL}/${job.file_path}`} target="_blank" className="text-blue-500 ml-2">View PDF</a>
                </div>
                <button 
                  onClick={() => deleteJob(job.file_path)} 
                  className="p-1 bg-red-500 text-white rounded ml-2">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-4 border-northeasternBlack rounded-lg p-4 bg-white">
          <h2 className="text-2xl font-bold text-navy">Upload Resume</h2>
          <input type="text" placeholder="Enter resume title" value={resTitle} onChange={(e) => setResTitle(e.target.value)} className="w-full p-2 border rounded mt-2" />
          <input type="file" accept="application/pdf" onChange={handleResumeFile} className="w-full p-2 border rounded mt-2" />
          <button onClick={() => uploadFile("resume")} disabled={uploading} className="w-full bg-northeasternBlack text-northeasternWhite p-2 rounded mt-2">
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <h3 className="text-xl font-bold mt-4">Existing Resumes</h3>
        <div/>
        <ul>
          {resumes.length === 0 ? (
            <p>No resumes uploaded yet.</p>
          ) : (
            resumes.map((resume) => (
              <li key={resume.id} className="border-b py-2 flex justify-between items-center">
                <div>
                  <strong>{resume.title}</strong> - 
                  <a href={`${API_BASE_URL}/${resume.file_path}`} target="_blank" className="text-blue-500 ml-2">View</a>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => deleteResume(resume.file_path)} 
                    className="p-1 bg-red-500 text-white rounded">
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
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
        </div>
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

export default Upload;