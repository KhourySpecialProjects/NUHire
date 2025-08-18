
'use client';
import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Navbar from "../components/navbar";
import NotesPage from "../components/note";
import { useProgress } from "../components/useProgress";
import Footer from "../components/footer";
import { usePathname } from "next/navigation";
import { io } from "socket.io-client";
import RatingSlider from "../components/ratingSlider";
import Popup from "../components/popup";
import axios from "axios";

// Define API_BASE_URL with a fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Initialize socket only after API_BASE_URL is defined
const socket = io(API_BASE_URL);

interface User {
  id: string;
  group_id: string;
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
  const [timeSpent, setTimeSpent] = useState(0);
  const [fadingEffect, setFadingEffect] = useState(false);
  const [finished, setFinished] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [interviews, setInterviews] = useState<Array<{
    resume_id: number;
    title: string;
    video_path: string;
    interview: string;
  }>>([]);

  // Use ref to always have access to current interviews state
  const interviewsRef = useRef(interviews);
  
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
    console.log("Starting user fetch");
    const fetchUser = async () => {
      try {
        console.log("Making auth request");
        const response = await axios.get(`${API_BASE_URL}/auth/user`, { 
          withCredentials: true,
          timeout: 10000 // 10 second timeout
        });
        
        console.log("Auth response received:", response.status);
        
        if (response.status === 200) {
          console.log("User data:", response.data);
          setUser(response.data);
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
        console.log("Setting loading to false");
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
    timeSpent: number,
    candidate_id: number
  ) => {
    if (!user || !user.id || !user.group_id) {
      console.error("Student ID or Group ID not found");
      return;
    }
    
    // Debug the data we're about to send
    console.log("Sending data to backend:", {
      student_id: user.id,
      group_id: user.group_id,
      studentClass: user.class,
      question1: overall,
      question2: professionalPresence,
      question3: qualityOfAnswer,
      question4: personality,
      timespent: timeSpent,
      candidate_id
    });
    
    try {
      const response = await axios.post(`${API_BASE_URL}/interview/vote`, {
        student_id: user.id,
        group_id: user.group_id,
        studentClass: user.class, // Make sure this matches the field in the server
        question1: overall,
        question2: professionalPresence,
        question3: qualityOfAnswer,
        question4: personality,
        timespent: timeSpent, // Make sure it's timespent (lowercase), not timeSpent
        candidate_id
      });
      
      if (response.status !== 200) {
        console.error("Failed to submit response:", response.statusText);
      } else {
        console.log("Interview vote submitted successfully");
      }
    } catch (error) {
      console.error("Error submitting response:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Error details:", error.response.data);
        console.error("Status code:", error.response.status);
      }
      alert("Failed to submit interview rating. Please try again.");
    }
  };
 
  // Update current page when user is loaded
  useEffect(() => {
    if (user && user.email) {
      console.log("User loaded, updating current page");
      
      // Setup socket connection and join group room
      const roomId = `group_${user.group_id}_class_${user.class}`;
      console.log("Joining room:", roomId);
      socket.emit("joinGroup", roomId);
      
      // Emit socket events
      socket.emit("studentOnline", { studentId: user.email }); 
      socket.emit("studentPageChanged", { studentId: user.email, currentPage: pathname });
      
      // Listen for group move events
      socket.on("moveGroup", ({groupId, classId, targetPage}) => {
        if (user && groupId === user.group_id && classId === user.class && targetPage === "/makeOffer") {
          console.log(`Group navigation triggered: moving to ${targetPage}`);
          localStorage.setItem("progress", "makeOffer");
          window.location.href = targetPage; 
        }
      });

      // Listen for rating updates from other group members
      socket.on("ratingUpdated", ({ ratingType, value, groupId, classId }) => {
        if (user && groupId === user.group_id && classId === user.class) {
          console.log(`Received rating update: ${ratingType} = ${value}`);
          switch (ratingType) {
            case 'overall':
              setOverall(value);
              break;
            case 'professionalPresence':
              setProfessionalPresence(value);
              break;
            case 'qualityOfAnswer':
              setQualityOfAnswer(value);
              break;
            case 'personality':
              setPersonality(value);
              break;
          }
        }
      });

      // Listen for interview submissions from other group members
      socket.on("interviewSubmitted", ({ currentVideoIndex, nextVideoIndex, isLastInterview, groupId, classId }) => {
        if (user && groupId === user.group_id && classId === user.class) {
          console.log(`Group member submitted interview ${currentVideoIndex + 1}, moving to video index ${nextVideoIndex}, isLast: ${isLastInterview}`);
          console.log(`Total interviews available: ${interviewsRef.current.length}`);
          console.log(`Current interviews array:`, interviewsRef.current);
          
          // Check if this is the last interview
          if (isLastInterview) {
            console.log(`All interviews completed, setting finished state`);
            setFinished(true);
          } else if (interviewsRef.current.length > 0 && nextVideoIndex < interviewsRef.current.length) {
            console.log(`Setting video index to ${nextVideoIndex}`);
            setVideoIndex(nextVideoIndex);
            setTimeSpent(0);
            setOverall(5);
            setProfessionalPresence(5);
            setQualityOfAnswer(5);
            setPersonality(5);
            setFinished(false); 
            setVideoLoaded(false); // Reset video loaded state for new video 
          } else if (interviewsRef.current.length === 0) {
            console.log(`Interviews not loaded yet, waiting for interviews to load before processing`);
            // Don't set finished state yet, wait for interviews to load
          } else {
            console.log(`Invalid video index ${nextVideoIndex} for ${interviewsRef.current.length} interviews, setting finished state`);
            setFinished(true);
          }
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
  
  console.log("Fetching candidates for group:", user.group_id);
  
  const fetchCandidates = async () => {
    try {
      // Get all resumes for the group and filter by class
      const resumeResponse = await axios.get(
        `${API_BASE_URL}/resume/group/${user.group_id}?class=${user.class}`, 
        { timeout: 8000 }
      );
      
      console.log("Resume response:", resumeResponse.data);
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
      
      console.log("Checked resumes after deduplication:", checkedResumes);
      
      if (checkedResumes.length === 0) {
        console.log("No checked resumes found");
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
      
      // Use allSettled instead of all to prevent one failure from failing everything
      const results = await Promise.allSettled(candidatePromises);
      
      // Filter out rejected promises and null values
      const candidatesData = results
      .filter((result): result is PromiseFulfilledResult<{ resume_id: any; title: any; interview: any; video_path: any }> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
      
      console.log("Final candidate data:", candidatesData);
      setInterviews(candidatesData);
      
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
    
    return () => {
      socket.off("receivePopup");
    };
  }, []);

  // Timer for tracking time spent
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000); 
    
    return () => clearInterval(timer);
  }, []);

  // Get current video
  const currentVid = interviews[videoIndex];

  // Debug logging - Add more detailed logging
  useEffect(() => {
    if (interviews.length > 0 && videoIndex >= 0) {
      const isValidIndex = videoIndex < interviews.length;
      console.log("Is valid video index:", isValidIndex);
      if (!isValidIndex) {
        console.warn(`Invalid video index ${videoIndex} for ${interviews.length} interviews`);
      }
    }
  }, [interviews, videoIndex, currentVid, finished, loading]);

  // Move to next video with transition effect
  const nextVideo = () => { 
    if (videoIndex < interviews.length - 1) { 
      setFadingEffect(true); 
      setTimeout(() => {
        setVideoIndex(videoIndex + 1); 
        setTimeSpent(0); 
        setFadingEffect(false); 
        setNoShow(false);
      }, 500);
    } else {
      setFinished(true);
    }
  }
  
  // Rating change handlers
  const handleOverallSliderChange = (value: number) => {
    setOverall(value);
    // Emit rating update to group members
    if (user) {
      socket.emit("updateRating", {
        ratingType: 'overall',
        value,
        groupId: user.group_id,
        classId: user.class
      });
    }
  }
  
  const handleProfessionalPresenceSliderChange = (value: number) => {
    setProfessionalPresence(value);
    // Emit rating update to group members
    if (user) {
      socket.emit("updateRating", {
        ratingType: 'professionalPresence',
        value,
        groupId: user.group_id,
        classId: user.class
      });
    }
  }
  
  const handleQualityOfAnswerSliderChange = (value: number) => {
    setQualityOfAnswer(value);
    // Emit rating update to group members
    if (user) {
      socket.emit("updateRating", {
        ratingType: 'qualityOfAnswer',
        value,
        groupId: user.group_id,
        classId: user.class
      });
    }
  }
  
  const handlePersonalitySliderChange = (value: number) => {
    setPersonality(value);
    // Emit rating update to group members
    if (user) {
      socket.emit("updateRating", {
        ratingType: 'personality',
        value,
        groupId: user.group_id,
        classId: user.class
      });
    }
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

    // Calculate these values at submission time, not render time
    const nextVideoIndex = videoIndex + 1;
    const isLastInterview = nextVideoIndex >= interviews.length;

    if (noShow) {
      await sendResponseToBackend(1, 1, 1, 1, timeSpent, currentVid.resume_id);
    } else {
      await sendResponseToBackend(
        overall,
        professionalPresence,
        qualityOfAnswer,
        personality,
        timeSpent,
        currentVid.resume_id
      );
    }    
    console.log(`Submitting interview. Current index: ${videoIndex}, Next index: ${nextVideoIndex}, Is last: ${isLastInterview}, Total interviews: ${interviews.length}`);
    // Emit submission event to synchronize group members
    if (user) {
      socket.emit("submitInterview", {
        currentVideoIndex: videoIndex,
        nextVideoIndex: nextVideoIndex,
        isLastInterview: isLastInterview,
        groupId: user.group_id,
        classId: user.class
      });
    }

    // Update local state
    if (!isLastInterview) {
      console.log(`Moving to next video (index ${nextVideoIndex})`);
      setVideoIndex(nextVideoIndex);
      setTimeSpent(0);
      setVideoLoaded(false); // Reset video loaded state for new video
      resetRatings();
    } else {
      console.log("All interviews have been rated!");
      setFinished(true);
    }
  };
  
  // Complete interview process and move to next stage
  const completeInterview = () => {
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
          <div className="fixed top-0 left-0 w-full h-full bg-white bg-opacity-95 z-50 flex flex-col items-center justify-center">
            <div className="max-w-xl mx-auto p-8 rounded-lg shadow-lg border-4 border-northeasternRed">
              <h2 className="text-2xl font-bold text-redHeader mb-4 text-center">Instructions</h2>
              <ul className="text-lg text-northeasternBlack space-y-4 mb-6 list-disc list-inside">
                <li>Watch each candidate's interview video carefully.</li>
                <li>Rate the candidate on Overall, Professional Presence, Quality of Answer, and Personality.</li>
                <li>Discuss with your group and submit your ratings for each candidate.</li>

              </ul>
              <button
                className="w-full px-4 py-2 bg-northeasternRed text-white rounded font-bold hover:bg-redHeader transition"
                onClick={() => setShowInstructions(false)}
              >
                Dismiss & Start
              </button>
            </div>
          </div>
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
                  console.log("Video iframe loaded");
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
          
          {/* Timer display */}
          <div className="text-sm text-gray-500">
            Time spent: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
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
            ← Back: Resume Review Group
          </button>
          <button
            onClick={completeInterview}
            className={`px-4 py-2 bg-redHeader text-white rounded-lg shadow-md transition duration-300 font-rubik
            ${
              !finished
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:bg-navy"
            }`}
            disabled={!finished}
          >
            Next: Make Offer page →
          </button>
        </div>
      </footer>
      <Footer />
    </div>
  );
}