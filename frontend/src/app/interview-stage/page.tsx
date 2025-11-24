'use client';
export const dynamic = "force-dynamic";
import React, { useEffect, useState, useRef } from "react";
import Navbar from "../components/navbar";
import Instructions from "../components/instructions";
import { useProgress } from "../components/useProgress";
import Footer from "../components/footer";
import { usePathname } from "next/navigation";
import { useSocket } from "../components/socketContext"; 
import RatingSlider from "../components/ratingSlider";
import Popup from "../components/popup";
import axios from "axios";
import { useAuth } from "../components/AuthContext";
import { useProgressManager } from "../components/progress";
import Facts from "../components/facts";

const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

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
  first_name: string; 
  last_name: string;  
}

interface Resume {
  resume_number: number;
  checked: number;
}

export default function Interview() {
  useProgress();
  const socket = useSocket();
  const {updateProgress, fetchProgress} = useProgressManager();
  const { user, loading: userloading } = useAuth();
  
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
  const [currentCandidateId, setCurrentCandidateId] = useState<number | null>(null);
  const [videosLoading, setVideosLoading] = useState(true);



  const [interviews, setInterviews] = useState<Array<{
    resume_id: number;
    title: string;
    video_path: string;
    interview: string;
    first_name: string;  
    last_name: string;   
  }>>([]);
  const interviewInstructions = [
    "Watch each candidate's interview video carefully.",
    "Rate the candidate on Overall, Professional Presence, Quality of Answer, and Personality.",
    "Discuss with your group and submit your ratings for each candidate."
  ]; 

  // Use ref to always have access to current interviews state
  const interviewsRef = useRef(interviews);
  const [groupSubmissions, setGroupSubmissions] = useState(0);
  const [groupSize, setGroupSize] = useState(0);
  const [groupFinished, setGroupFinished] = useState(false);

  const fetchFinished = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/interview/status/finished-count`, {
        params: { group_id: user?.group_id, class_id: user?.class },
        withCredentials: true,
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
      const response = await fetch(`${API_BASE_URL}/interview/group-size/${user?.group_id}/${user?.class}`, { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setGroupSize(data.count);
        }
    } catch (err) {
      console.error("Failed to fetch group size:", err);
    }
  };

  useEffect(() => {
    const savedVideoIndex = localStorage.getItem('interviewStage_videoIndex');
    const savedCandidateId = localStorage.getItem('interviewStage_candidateId');
    const savedOverall = localStorage.getItem('interviewStage_overall');
    const savedProfessionalPresence = localStorage.getItem('interviewStage_professionalPresence');
    const savedQualityOfAnswer = localStorage.getItem('interviewStage_qualityOfAnswer');
    const savedPersonality = localStorage.getItem('interviewStage_personality');
    const savedNoShow = localStorage.getItem('interviewStage_noShow');
    
    if (savedVideoIndex) setVideoIndex(Number(savedVideoIndex));
    if (savedCandidateId) setCurrentCandidateId(Number(savedCandidateId));
    if (savedOverall) setOverall(Number(savedOverall));
    if (savedProfessionalPresence) setProfessionalPresence(Number(savedProfessionalPresence));
    if (savedQualityOfAnswer) setQualityOfAnswer(Number(savedQualityOfAnswer));
    if (savedPersonality) setPersonality(Number(savedPersonality));
    if (savedNoShow) setNoShow(savedNoShow === 'true');
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('interviewStage_videoIndex', String(videoIndex));
  }, [videoIndex]);

  useEffect(() => {
    localStorage.setItem('interviewStage_overall', String(overall));
  }, [overall]);

  useEffect(() => {
    localStorage.setItem('interviewStage_professionalPresence', String(professionalPresence));
  }, [professionalPresence]);

  useEffect(() => {
    localStorage.setItem('interviewStage_qualityOfAnswer', String(qualityOfAnswer));
  }, [qualityOfAnswer]);

  useEffect(() => {
    localStorage.setItem('interviewStage_personality', String(personality));
  }, [personality]);

  useEffect(() => {
    localStorage.setItem('interviewStage_noShow', String(noShow));
  }, [noShow]);

  // Clear state when finished
  useEffect(() => {
    if (finished) {
      localStorage.removeItem('interviewStage_videoIndex');
      localStorage.removeItem('interviewStage_candidateId');
      localStorage.removeItem('interviewStage_overall');
      localStorage.removeItem('interviewStage_professionalPresence');
      localStorage.removeItem('interviewStage_qualityOfAnswer');
      localStorage.removeItem('interviewStage_personality');
      localStorage.removeItem('interviewStage_noShow');
    }
  }, [finished]);

  useEffect(() => {
    console.log("Interviews updated:", interviews);
  }, [interviews]);
  
  useEffect(() => {
    const handleShowInstructions = () => {
      console.log("Help button clicked - showing instructions");
      setShowInstructions(true);
    };

    window.addEventListener('showInstructions', handleShowInstructions);

    return () => {
      window.removeEventListener('showInstructions', handleShowInstructions);
    };
  }, []);

  // Update ref whenever interviews change
  useEffect(() => {
    interviewsRef.current = interviews;
  }, [interviews]);

  // Reset video loaded state when video changes
  useEffect(() => {
    console.log('[VIDEO STATE] Video index changed to:', videoIndex);
    console.log('[VIDEO STATE] Current video:', interviews[videoIndex]);

    setVideoLoaded(false);
  }, [videoIndex]);

  useEffect(() => {
    if (finished) {
      setDonePopup(true);
    }
  }, [finished]);

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
      }, { withCredentials: true });
      if (response.status !== 200) {
        console.error("Failed to submit response:", response.statusText);
      } else {
      }
    } catch (error) {
      console.error("Error submitting response:", error);
      setPopup({ headline: "Submission Error", message: "Failed to submit your ratings. Please try again." });
    }
  };

  useEffect(() => {
    if (!user?.group_id) {
      console.log('[VIDEO LOADING] No user group_id found');
      return;
    }
    
    console.log('[VIDEO LOADING] Starting fetchCandidates for group:', user.group_id, 'class:', user.class);
    
    const fetchCandidates = async () => {
      setVideosLoading(true);
      console.log('[VIDEO LOADING] Set videosLoading to true');
      
      try {
        // Get all resumes for the group and filter by class
        console.log('[VIDEO LOADING] Fetching resumes from:', `${API_BASE_URL}/resume/group/${user.group_id}?class=${user.class}`);
        
        const resumeResponse = await axios.get(
          `${API_BASE_URL}/resume/group/${user.group_id}?class=${user.class}`, 
          { withCredentials: true, timeout: 8000 }
        );
        
        console.log('[VIDEO LOADING] Resume response received:', resumeResponse.data);
        
        const allResumes: Resume[] = resumeResponse.data;
        console.log('[VIDEO LOADING] Total resumes:', allResumes.length);
        
        // Filter to get only checked resumes and ensure no duplicates
        const checkedResumes = allResumes
          .filter((resume: Resume) => resume.checked === 1)
          .reduce<Resume[]>((unique, resume) => {
            if (!unique.some((r) => r.resume_number === resume.resume_number)) {
              unique.push(resume);
            }
            return unique;
          }, []);
        
        console.log('[VIDEO LOADING] Checked resumes (filtered):', checkedResumes.length);
        console.log('[VIDEO LOADING] Checked resume IDs:', checkedResumes.map(r => r.resume_number));
        
        if (checkedResumes.length === 0) {
          console.log('[VIDEO LOADING] No checked resumes found, stopping');
          setInterviews([]);
          setVideosLoading(false);
          return;
        }
        
        console.log('[VIDEO LOADING] Fetching candidate data for', checkedResumes.length, 'resumes');
        
        const candidatePromises = checkedResumes.map((resume, index) => {
          console.log(`[VIDEO LOADING] Fetching candidate ${index + 1}/${checkedResumes.length} for resume:`, resume.resume_number);
          
          return axios.get(`${API_BASE_URL}/candidates/resume/${resume.resume_number}`, { 
            timeout: 8000, 
            withCredentials: true,
          })
          .then(response => {
            console.log(`[VIDEO LOADING] ✓ Candidate ${index + 1} response:`, response.data);
            
            const candidateData = {
              resume_id: response.data.resume_id,
              title: response.data.title || `Candidate ${response.data.resume_id}`,
              interview: response.data.interview,
              video_path: response.data.interview,
              first_name: response.data.f_name,
              last_name: response.data.l_name,
            };
            
            console.log(`[VIDEO LOADING] ✓ Formatted candidate ${index + 1}:`, candidateData);
            return candidateData;
          })
          .catch(err => {
            console.error(`[VIDEO LOADING] ✗ Error fetching candidate ${index + 1}:`, err.message);
            console.error(`[VIDEO LOADING] ✗ Full error:`, err);
            return null;
          });
        });

        console.log('[VIDEO LOADING] Waiting for all candidate promises...');
        const results = await Promise.allSettled(candidatePromises);
        console.log('[VIDEO LOADING] All promises settled. Results:', results.length);

        // Log each result individually
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            console.log(`[VIDEO LOADING] Result ${index + 1} (fulfilled):`, result.value);
          } else {
            console.log(`[VIDEO LOADING] Result ${index + 1} (rejected):`, result.reason);
          }
        });

        const finalInterviews = results
          .map(result => (result.status === 'fulfilled' && result.value !== null) ? result.value : null)
          .filter((item): item is { resume_id: number; title: string; interview: string; video_path: string, first_name: string, last_name: string} => item !== null)
          .slice(0,4);

        console.log('[VIDEO LOADING] Final interviews count:', finalInterviews.length);
        console.log('[VIDEO LOADING] Final interviews data:', finalInterviews);
        
        setInterviews(finalInterviews);
        console.log('[VIDEO LOADING] Interviews state updated');
        
      } catch (err) {
        console.error('[VIDEO LOADING] ✗ Critical error in fetchCandidates:', err);
        if (axios.isAxiosError(err)) {
          console.error('[VIDEO LOADING] ✗ Axios error details:', {
            message: err.message,
            code: err.code,
            response: err.response?.data,
            status: err.response?.status
          });
        }
        setError('Failed to load interview data. Please try refreshing the page.');
      } finally {
        console.log('[VIDEO LOADING] Setting videosLoading to false');
        setVideosLoading(false);
      }
    };
    
    fetchCandidates();
  }, [user]);

  const currentVid = interviews[videoIndex];

  // Save candidate ID whenever video changes
  useEffect(() => {
    if (currentVid) {
      setCurrentCandidateId(currentVid.resume_id);
      localStorage.setItem('interviewStage_candidateId', String(currentVid.resume_id));
    }
  }, [currentVid]);

  // Verify ratings match current candidate after interviews load
  useEffect(() => {
    if (interviews.length > 0 && currentCandidateId !== null) {
      const currentVideoCandidate = interviews[videoIndex]?.resume_id;
      
      // If stored candidate doesn't match current video, reset ratings
      if (currentVideoCandidate !== currentCandidateId) {
        console.log('Candidate mismatch after refresh, resetting ratings');
        resetRatings();
        setNoShow(false);
        setCurrentCandidateId(currentVideoCandidate);
        localStorage.setItem('interviewStage_candidateId', String(currentVideoCandidate));
      }
    }
  }, [interviews, videoIndex, currentCandidateId]);

  // First useEffect - Fetch data and emit interviewStageFinished
useEffect(() => {
  if (!socket || !user) return;

  fetchGroupSize();
  fetchFinished();
  console.log(groupFinished);

  socket.emit("interviewStageFinished", {
    group_id: user.group_id,
    class_id: user.class,
    student_id: user.id,
  });
}, [socket, user, finished]); // Add socket to dependencies

// Second useEffect - Setup page and join group
useEffect(() => {
  if (!socket || !user?.email) return;
  
  // Setup socket connection and join group room
  const roomId = `group_${user.group_id}_class_${user.class}`;
  socket.emit("joinGroup", roomId);
  
  // Emit socket events
  socket.emit("studentOnline", { studentId: user.email }); 
  socket.emit("studentPageChanged", { studentId: user.email, currentPage: pathname });
  
  // Listen for group move events
  const handleMoveGroup = ({ groupId, classId, targetPage }: { groupId: number; classId: number; targetPage: string }) => {
    if (user && groupId === user.group_id && classId === user.class && targetPage === "/makeOffer") {
      updateProgress(user, "offer");
      localStorage.setItem("progress", "offer");
      window.location.href = targetPage; 
    }
  };

  socket.on("moveGroup", handleMoveGroup);

  // Update current page in database
  const updateCurrentPage = async () => {
    try {
      await axios.post(`${API_BASE_URL}/users/update-currentpage`, {
        page: 'interviewpage', 
        user_email: user.email
      }, { withCredentials: true });
    } catch (error) {
      console.error("Error updating current page:", error);
    }
  };
  
  updateCurrentPage();
  
  // Cleanup function
  return () => {
    socket.off("moveGroup", handleMoveGroup);
  };
}, [socket, user?.email, pathname, updateProgress]); // Add dependencies

// Third useEffect - Listen for popup and status updates
useEffect(() => {
  if (!socket) return;

  const handleReceivePopup = ({ headline, message }: { headline: string; message: string }) => {
    setPopup({ headline, message });
  };

  const handleInterviewStatusUpdated = ({ count, total }: { count: number; total: number }) => {
    setGroupSubmissions(count);
    setGroupSize(total);
    setGroupFinished(count === total);
  };

  const handleInterviewStageFinished = () => {
    fetchFinished();
    fetchGroupSize();
  };

  socket.on("receivePopup", handleReceivePopup);
  socket.on("interviewStatusUpdated", handleInterviewStatusUpdated);
  socket.on("interviewStageFinished", handleInterviewStageFinished);
  
  return () => {
    socket.off("receivePopup", handleReceivePopup);
    socket.off("interviewStatusUpdated", handleInterviewStatusUpdated);
    socket.off("interviewStageFinished", handleInterviewStageFinished);
  };
}, [socket, fetchFinished, fetchGroupSize]); // Add dependencies

// Fourth useEffect - Handle preset ratings
useEffect(() => {
  if (!socket || !user || !currentVid) {
    console.log("Missing user or currentVid, not setting up socket listeners", user, currentVid);
    return;
  }

  console.log("Setting up socket listeners with user:", user.id, "and currentVid:", currentVid.resume_id);

  const handleUpdateRatingsWithPreset = ({ classId, groupId, vote, isNoShow, candidateId }: {
    classId: number;
    groupId: number;
    vote: { professionalPresence?: number; qualityOfAnswer?: number; personality?: number; overall?: number };
    isNoShow: boolean;
    candidateId: number;
  }) => {
    console.log("Received updateRatingsWithPreset event", { classId, groupId, vote, isNoShow, candidateId });
    
    const voteData = {
      student_id: user.id,
      group_id: groupId,
      class: classId,
      question1: isNoShow ? -10000 : (vote.professionalPresence || 0),
      question2: isNoShow ? -10000 : (vote.qualityOfAnswer || 0),
      question3: isNoShow ? -10000 : (vote.personality || 0),
      question4: isNoShow ? -10000 : (vote.overall || 0),
      candidate_id: candidateId
    };
    
    console.log("Emitting sentPresetVotes with data:", voteData);
    socket.emit("sentPresetVotes", voteData);
  };

  socket.on("updateRatingsWithPresetFrontend", handleUpdateRatingsWithPreset);

  return () => {
    console.log("Cleaning up socket listeners");
    socket.off("updateRatingsWithPresetFrontend", handleUpdateRatingsWithPreset);
  };
}, [socket, user, currentVid]);

// Fixed completeInterview function
const completeInterview = () => {
  if (!socket || !user) return;
  
  updateProgress(user, "offer");
  localStorage.setItem("progress", "offer");
  localStorage.removeItem('interviewStage_videoIndex');
  localStorage.removeItem('interviewStage_candidateId');
  localStorage.removeItem('interviewStage_overall');
  localStorage.removeItem('interviewStage_professionalPresence');
  localStorage.removeItem('interviewStage_qualityOfAnswer');
  localStorage.removeItem('interviewStage_personality');
  localStorage.removeItem('interviewStage_noShow');
  window.location.href = '/makeOffer';
  socket.emit("moveGroup", { groupId: user.group_id, classId: user.class, targetPage: "/makeOffer" });
};

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
      setVideoLoaded(false); 
      resetRatings();
      setNoShow(false);
    } else {
      try {
        await axios.post(`${API_BASE_URL}/interview/status/finished`, {
          student_id: user?.id,
          finished: 1,
          group_id: user?.group_id,
          class: user?.class
        }, {
          withCredentials: true,
        });
        setFinished(true);
      } catch (err) {
        console.error("Failed to mark as finished:", err);
      }
    }
  };
  
  // Loading state
   if (userloading) {
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

  if (videosLoading) {
    return (
      <div className="bg-sand font-rubik min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-center mb-6">Interview Stage</h1>
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 border-t-4 border-redHeader border-solid rounded-full animate-spin mb-6"></div>
              <p className="text-lg font-semibold text-navy mb-2">Loading Interview Videos...</p>
              <p className="text-sm text-gray-600">Please wait while we fetch the candidate interviews</p>
            </div>
          </div>
        </div>
        <Footer />
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
      <div className="mt-6"/>
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
            currentVid && currentVid.first_name && currentVid.last_name ? 
            `Evaluating ${currentVid.first_name} ${currentVid.last_name}` : 
            "Evaluation"}
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
                  console.log('[VIDEO STATE] Iframe onLoad triggered for video:', videoIndex);
                  console.log('[VIDEO STATE] Video URL:', currentVid.interview);
                  setTimeout(() => {
                    console.log('[VIDEO STATE] Setting videoLoaded to true after delay');
                    setVideoLoaded(true);
                  }, 500);
                }}
                onError={(e) => {
                  console.error('[VIDEO STATE] Iframe error:', e);
                  console.error('[VIDEO STATE] Failed to load video URL:', currentVid.interview);
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
          {finished && !groupFinished && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
              <div className="bg-white border-4 border-navy rounded-lg shadow-lg p-8 text-center max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-navy mb-4">Waiting for Teammates</h2>
                <p className="text-lg text-gray-700 mb-4">
                  You have completed your interviews and ratings.<br />
                  Waiting for other group members to finish...
                </p>
                <div className="w-16 h-16 border-t-4 border-navy border-solid rounded-full animate-spin mx-auto mb-4"></div>
                <Facts />
              </div>
            </div>
          )}
        </div>
      </footer>
      <Footer />
    </div>
  );
}