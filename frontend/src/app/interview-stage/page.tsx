
'use client';
import React, { useEffect, useState, useRef } from "react";
import Navbar from "../components/navbar";
import Instructions from "../components/instructions";
import { useProgress } from "../components/useProgress";
import Footer from "../components/footer";
import { usePathname } from "next/navigation";
import { io } from "socket.io-client";
import RatingSlider from "../components/ratingSlider";
import Popup from "../components/popup";
import axios from "axios";
import { useProgressManager } from "../components/progress";

// Define API_BASE_URL with a fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Initialize socket only after API_BASE_URL is defined
const socket = io(API_BASE_URL);

interface User {
  id: string;
  group_id: number;
  email: string;
  class: number;
}

interface Interview {
  id: number;
  resume_id: number;
  interview: string;
}

interface Resume {
  resume_number: number;
  checked: number;
}

export default function Interview() {
  useProgress();
  const {updateProgress, fetchProgress} = useProgressManager();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const pathname = usePathname();
  const [noShow, setNoShow] = useState(false);
  const [donePopup, setDonePopup] = useState(false);
  
  // Rating states
  const [overall, setOverall] = useState(5); 
  const [professionalPresence, setProfessionalPresence] = useState(5); 
  const [qualityOfAnswer, setQualityOfAnswer] = useState(5); 
  const [personality, setPersonality] = useState(5);
  
  // Video states
  const [videoIndex, setVideoIndex] = useState(0); 
  const [fadingEffect, setFadingEffect] = useState(false);
  const [finished, setFinished] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [interviews, setInterviews] = useState<Array<{
    resume_id: number;
    title: string;
    video_path: string;
    interview: string;
  }>>([]);
  const interviewInstructions = [
    "Watch each candidate's interview video carefully.",
    "Rate the candidate on Overall, Professional Presence, Quality of Answer, and Personality.",
    "Discuss with your group and submit your ratings for each candidate."
  ]; 

  // Use ref to always have access to current interviews state
  const interviewsRef = useRef(interviews);
  const [groupSubmissions, setGroupSubmissions] = useState(0); // Start at 1 for self
  const [groupSize, setGroupSize] = useState(0); // Default, update from backend if needed
  const [groupFinished, setGroupFinished] = useState(false);

  const fetchFinished = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/interview-status/finished-count`, {
        params: { group_id: user?.group_id, class_id: user?.class }
      });      
      setGroupSubmissions(response.data.finishedCount);
      console.log("Group submissions fetched:", groupSubmissions);
      setGroupFinished(groupSubmissions === groupSize);
    } catch (err) {
      console.error("Failed to fetch group size:", err);
    }
  };

  const fetchGroupSize = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/group-size/${user?.group_id}`);
      setGroupSize(response.data.count);
      console.log("Group size fetched:", response.data.count);
    } catch (err) {
      console.error("Failed to fetch group size:", err);
    }
  };

  // Listen for group submission updates
  useEffect(() => {
    if (!user) return;

    fetchGroupSize();

    fetchFinished();
    console.log(groupFinished);

    socket.emit("interviewStageFinished", {
      group_id: user.group_id,
      class_id: user.class,
      student_id: user.id,
    });

  }, [user, finished]);

  // Update ref whenever interviews change
  useEffect(() => {
    interviewsRef.current = interviews;
  }, [interviews]);

  // Reset video loaded state when video changes
  useEffect(() => {
    setVideoLoaded(false);
  }, [videoIndex]);

  useEffect(() => {
    if (finished) {
      setDonePopup(true);
    }
  }, [finished]);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/auth/user`, { 
          withCredentials: true,
          timeout: 10000 // 10 second timeout
        });
        
        
        if (response.status === 200) {
          setUser(response.data);
          updateProgress(response.data, "interview");
        } else {
          setError('Authentication failed. Please log in again.');
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setError('Failed to authenticate. Make sure the API server is running.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  // Send interview ratings to backend
  const sendResponseToBackend = async (
    overall: number,
    professionalPresence: number,
    qualityOfAnswer: number,
    personality: number,
    candidate_id: number
  ) => {
    if (!user || !user.id || !user.group_id) {
      console.error("Student ID or Group ID not found");
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/interview/vote`, {
        student_id: user.id,
        group_id: user.group_id,
        studentClass: user.class, // Make sure this matches the field in the server
        question1: overall,
        question2: professionalPresence,
        question3: qualityOfAnswer,
        question4: personality,
        candidate_id
      });
      if (response.status !== 200) {
        console.error("Failed to submit response:", response.statusText);
      } else {
      }
    } catch (error) {
      console.error("Error submitting response:", error);
      setPopup({ headline: "Submission Error", message: "Failed to submit your ratings. Please try again." });
    }
  };
 
  // Update current page when user is loaded
  useEffect(() => {
    if (user && user.email) {
      
      // Setup socket connection and join group room
      const roomId = `group_${user.group_id}_class_${user.class}`;
      socket.emit("joinGroup", roomId);
      
      // Emit socket events
      socket.emit("studentOnline", { studentId: user.email }); 
      socket.emit("studentPageChanged", { studentId: user.email, currentPage: pathname });
      
      // Listen for group move events
      socket.on("moveGroup", ({groupId, classId, targetPage}) => {
        if (user && groupId === user.group_id && classId === user.class && targetPage === "/makeOffer") {
          updateProgress(user, "offer");
          localStorage.setItem("progress", "makeOffer");
          window.location.href = targetPage; 
        }
      });

      // Update current page in database
      const updateCurrentPage = async () => {
        try {
          await axios.post(`${API_BASE_URL}/update-currentpage`, {
            page: 'interviewpage', 
            user_email: user.email
          });
        } catch (error) {
          console.error("Error updating current page:", error);
        }
      };
      
      updateCurrentPage();
      
      // Cleanup function
      return () => {
        socket.off("moveGroup");
        socket.off("ratingUpdated");
        socket.off("interviewSubmitted");
      };
    }
  }, [user, pathname]); // Remove interviews from dependency array

  // Fetch candidates data when user is loaded
// Fetch candidates data when user is loaded
useEffect(() => {
  if (!user?.group_id) return;
  
  
  const fetchCandidates = async () => {
    try {
      // Get all resumes for the group and filter by class
      const resumeResponse = await axios.get(
        `${API_BASE_URL}/resume/group/${user.group_id}?class=${user.class}`, 
        { timeout: 8000 }
      );
      
      const allResumes: Resume[] = resumeResponse.data;
      
      // Filter to get only checked resumes and ensure no duplicates
      const checkedResumes = allResumes
      .filter((resume: Resume) => resume.checked === 1)
      .reduce<Resume[]>((unique, resume) => {
        if (!unique.some((r) => r.resume_number === resume.resume_number)) {
          unique.push(resume);
        }
        return unique;
      }, []);
      
      
      if (checkedResumes.length === 0) {
        setInterviews([]);
        return;
      }
      
      // Fetch candidate data for each unique checked resume
      const candidatePromises = checkedResumes.map(resume => 
        axios.get(`${API_BASE_URL}/canidates/resume/${resume.resume_number}`, { 
          timeout: 8000 
        })
        .then(response => ({
          resume_id: response.data.resume_id,
          title: response.data.title || `Candidate ${response.data.resume_id}`,
          interview: response.data.interview,
          video_path: response.data.interview
        }))
        .catch(err => {
          console.error(`Error fetching candidate for resume ${resume.resume_number}:`, err);
          return null;
        })
      );
      const results = await Promise.allSettled(candidatePromises);

      setInterviews(results.map(result => (result.status === 'fulfilled' && result.value !== null) ? result.value : null).filter((item): item is { resume_id: any; title: any; interview: any; video_path: any } => item !== null));
      
    } catch (err) {
      console.error("Error fetching interviews:", err);
      setError('Failed to load interview data. Please try refreshing the page.');
    }
  };
  
  fetchCandidates();
}, [user]); // This will run whenever user changes 
  
  // Listen for popup messages
  useEffect(() => {
    socket.on("receivePopup", ({ headline, message }) => {
      setPopup({ headline, message });

      if (headline ===  "Abandoned Interview") {
        setNoShow(true);
      } else {
        setNoShow(false); 
      }
    });

    socket.on("interviewStatusUpdated", ({ count, total }) => {
      setGroupSubmissions(count);
      setGroupSize(total);
      setGroupFinished(count === total);
    });

    socket.on("interviewStageFinished", () => {
      fetchFinished();
      fetchGroupSize();
    });
    
    return () => {
      socket.off("receivePopup");
      socket.off("interviewStatusUpdated")
      socket.off("interviewStageFinishedBroadcast")
    };
  }, []);

  // Get current video
  const currentVid = interviews[videoIndex];
  
  // Rating change handlers
  const handleOverallSliderChange = (value: number) => {
    setOverall(value);
  }
  
  const handleProfessionalPresenceSliderChange = (value: number) => {
    setProfessionalPresence(value);
  }
  
  const handleQualityOfAnswerSliderChange = (value: number) => {
    setQualityOfAnswer(value);
  }
  
  const handlePersonalitySliderChange = (value: number) => {
    setPersonality(value);
  }
  
  // Reset all ratings
  const resetRatings = () => {
    setOverall(5); 
    setProfessionalPresence(5); 
    setQualityOfAnswer(5); 
    setPersonality(5); 
  }

  // Handle submission of current interview
  const handleSubmit = async () => {
    if (!currentVid) {
      console.error("No current video selected");
      return;
    }

    if (!videoLoaded) {
      console.warn("Video not fully loaded yet, cannot submit");
      return;
    }

    try {
        if (noShow) {
          await sendResponseToBackend(1, 1, 1, 1, currentVid.resume_id);
        } else {
          await sendResponseToBackend(
            overall,
            professionalPresence,
            qualityOfAnswer,
            personality,
            currentVid.resume_id
          );
        }
      }
    catch (error) {
      console.error("Error during submission:", error);
      return;
    }

    const nextVideoIndex = videoIndex + 1;
    const isLastInterview = nextVideoIndex >= interviews.length;

    if (!isLastInterview) {
      setVideoIndex(nextVideoIndex);
      setVideoLoaded(false); // Reset video loaded state for new video
      resetRatings();
    } else {
      try {
        await axios.post(`${API_BASE_URL}/interview-status/finished`, {
          student_id: user?.id,
          finished: 1,
          group_id: user?.group_id,
          class: user?.class
        });
        setFinished(true);
      } catch (err) {
        console.error("Failed to mark as finished:", err);
      }
    }
  };
  
  // Complete interview process and move to next stage
  const completeInterview = () => {
    updateProgress(user!, "offer");
    localStorage.setItem("progress", "makeOffer");
    window.location.href = '/makeOffer';
    socket.emit("moveGroup", {groupId: user!.group_id, classId: user!.class, targetPage: "/makeOffer"});
  }

  // Loading state
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
  
  
  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sand">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <p className="mt-2">Please try refreshing the page or return to the dashboard.</p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="mt-4 bg-redHeader text-white px-4 py-2 rounded hover:bg-navy transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // No user state
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sand">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded max-w-md">
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
          <p>Please log in to access this page.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-4 bg-redHeader text-white px-4 py-2 rounded hover:bg-navy transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // No interviews state
  if (interviews.length === 0) {
    return (
      <div className="bg-sand font-rubik min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-center mb-6">Interview Stage</h1>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="font-medium">No interviews are currently available.</p>
              <p>You need to select candidates in the Resume Review Group stage first.</p>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => window.location.href = "/res-review-group"}
                className="px-4 py-2 bg-redHeader text-white rounded-lg shadow-md hover:bg-navy transition duration-300 font-rubik"
              >
                ← Go to Resume Review Group
              </button>
              <button
                onClick={() => window.location.href = "/dashboard"}
                className="px-4 py-2 bg-redHeader text-white rounded-lg shadow-md hover:bg-navy transition duration-300 font-rubik"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Main content - interview page
  return (
    <div className="bg-sand font-rubik min-h-screen">
      {showInstructions && (
          <Instructions 
            instructions={interviewInstructions}
            onDismiss={() => setShowInstructions(false)}
            title="Interview Instructions"
            progress={3}
          />
        )}
      <Navbar />
      <div className="flex justify-center items-center font-rubik text-redHeader text-4xl font-bold mb-4">
        Interview Page
      </div>

      <div className="relative flex flex-col md:flex-row min-h-screen mt-4">
        {/* Evaluation panel */}
        <div key={videoIndex} className="md:w-1/3 bg-blue-50 shadow-lg p-4 mx-4 my-2 flex flex-col items-center justify-start rounded-lg">
          <h1 className="text-2xl text-redHeader font-bold mb-4">
            Evaluation
          </h1>
          <h3 className="font-bol text-navy text-center">
            Please watch the interview and rate on a scale from 1 - 10
          </h3>
          <h3 className="font-bol text-navy text-center mb-4">
            Submit to note your responses and move to the next interview.
          </h3>

          {/* Rating sliders */}
          <div className="flex flex-col items-center text-center w-full max-w-xs mb-6">
            <h2 className="text-md text-redHeader font-semibold mb-2">
              Overall
            </h2>
            <RatingSlider onChange={handleOverallSliderChange} value={overall} />
          </div>

          <div className="flex flex-col items-center text-center w-full max-w-xs mb-6">
            <h2 className="text-md text-redHeader font-semibold mb-2">
              Professional Presence
            </h2>
            <RatingSlider onChange={handleProfessionalPresenceSliderChange} value={professionalPresence} />
          </div>

          <div className="flex flex-col items-center text-center w-full max-w-xs mb-6">
            <h2 className="text-md text-redHeader font-semibold mb-2">
              Quality of Answer
            </h2>
            <RatingSlider onChange={handleQualityOfAnswerSliderChange} value={qualityOfAnswer} />
          </div>

          <div className="flex flex-col items-center text-center w-full max-w-xs mb-6">
            <h2 className="text-md text-redHeader font-semibold mb-2">
              Personality & Creativeness
            </h2>
            <RatingSlider onChange={handlePersonalitySliderChange} value={personality} />
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={finished || !videoLoaded}
            className={`px-4 py-2 rounded-lg shadow-md transition duration-300 font-rubik mt-6 ${
              finished || !videoLoaded
                ? "bg-gray-400 text-white opacity-50 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-900"
            }`}
          >
            {!videoLoaded ? "Loading Video..." : "Submit Response"}
          </button>
          
          {/* Video progress indicator */}
          <div className="mt-6 text-sm text-gray-700">
            {interviews.length > 0 ? 
              `Video ${Math.min(videoIndex + 1, interviews.length)} of ${interviews.length}` : 
              "Loading videos..."}
          </div>
        </div>

        {/* Video display */}
        <div className={`md:w-2/3 flex flex-col items-center justify-center p-4 md:p-8 ${fadingEffect ? 'opacity-50 transition-opacity duration-500' : 'opacity-100 transition-opacity duration-500'}`}>
          <h1 className="text-xl font-rubik font-bold mb-4 text-center">
            {noShow ? "Candidate No-Show" : 
             interviews.length > 0 && videoIndex >= 0 && videoIndex < interviews.length ? 
             `Candidate Interview ${videoIndex + 1}` : 
             "Loading Interview..."}
          </h1>
          <div className="w-full max-w-4xl aspect-video border-4 border-redHeader mb-5 rounded-lg shadow-lg mx-auto">
            {noShow ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xl font-bold">
                  This candidate did not show up.
                </p>
              </div>
            ) : currentVid && currentVid.interview ? (
              <iframe
                key={`video-${videoIndex}`}
                className="w-full h-full rounded-lg shadow-lg"
                src={currentVid.interview}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                onLoad={() => {
                  setTimeout(() => {
                    setVideoLoaded(true);
                  }, 500);
                }}
              ></iframe>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100">
                <p className="text-gray-500">
                  {interviews.length === 0 ? "No interviews available" : 
                   videoIndex >= interviews.length ? "All interviews completed" :
                   !videoLoaded ? "Loading Interview Video..." :
                   "Loading Interview Video..."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Popup component */}
        {popup && (
          <Popup
            headline={popup.headline}
            message={popup.message}
            onDismiss={() => setPopup(null)}
          />
        )}
        {donePopup && (
          <Popup
            headline="Interview Complete"
            message="You have completed all interviews and ratings."
            onDismiss={() => setDonePopup(false)}
          />
        )}
      </div>

      {/* Navigation footer */}
      <footer>
        <div className="flex justify-between ml-4 mt-4 mb-4 mr-4">
          <button
            onClick={() => (window.location.href = "/res-review-group")}
            className="px-4 py-2 bg-redHeader text-white rounded-lg shadow-md cursor-not-allowed opacity-50 transition duration-300 font-rubik"
            disabled={true}
          >
            ← Back: Resume Review Pt.2
          </button>
          <button
            onClick={completeInterview}
            className={`px-4 py-2 bg-redHeader text-white rounded-lg shadow-md transition duration-300 font-rubik
              ${!finished || !groupFinished
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:bg-navy"
              }`}
            disabled={!finished || !groupFinished}
          >
            {!finished
              ? "Next: Make Offer page →"
              : !groupFinished
                ? `Next: Make Offer page (${groupSubmissions}/${groupSize} submitted)`
                : "Next: Make Offer page"}
          </button>
        </div>
      </footer>
      <Footer />
    </div>
  );
}