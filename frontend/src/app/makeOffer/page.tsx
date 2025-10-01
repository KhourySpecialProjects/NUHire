"use client"; // Declares that this page is a client component
import React, { useState, useEffect, use } from "react";// Importing React and hooks for state and effect management
import { io, Socket } from "socket.io-client"; // Importing socket.io for real-time communication
import Navbar from "../components/navbar"; // Importing the navbar component
import { usePathname, useRouter } from "next/navigation"; // Importing useRouter and usePathname for navigation
import { useProgress } from "../components/useProgress"; // Custom hook for progress tracking
import NotesPage from "../components/note"; // Importing the notes page component
import Footer from "../components/footer"; // Importing the footer component
import Popup from "../components/popup"; // Importing the popup component
import axios from "axios"; // Importing axios for HTTP requests
import Instructions from "../components/instructions"; // Importing the instructions component
import { useProgressManager } from "../components/progress";

// Define the API base URL from environment variables
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
const SOCKET_URL = `${API_BASE_URL}`;
let socket: Socket | null = null;

// Define the VoteData interface to match the expected vote data structure
type VoteData = {
  Overall: number;
  Profesionality: number;
  Quality: number;
  Personality: number;
};

interface User {
  id: string;
  group_id: number;
  email: string;
  class: number;
  affiliation: string;
}

interface InterviewPopup {
  question1: number;
  question2: number;
  question3: number;
  question4: number;
}

interface Offer {
  id: number;
  class_id: number;
  group_id: number;
  candidate_id: number;
  status: 'pending' | 'accepted' | 'rejected';
}

// Main component for the MakeOffer page
export default function MakeOffer() {
  useProgress();
  const router = useRouter();
  const {updateProgress, fetchProgress} = useProgressManager();
  const [checkedState, setCheckedState] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [voteCounts, setVoteCounts] = useState<{ [key: number]: VoteData }>({});
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [popup, setPopup] = useState<{
    headline: string;
    message: string;
  } | null>(null);
  const pathname = usePathname();
  const [offerPending, setOfferPending] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [interviewsWithVideos, setInterviewsWithVideos] = useState<any[]>([]);
  const [acceptedOffer, setAcceptedOffer] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [sentIn, setSentIn] = useState<(true | false | 'none')[]>(['none', 'none', 'none', 'none']);
  const offerInstructions = [
    "Review everything about the candidates you know.",
    "Discuss as a team which person is getting the job offer.",
    "Make the offer and wait for your advisor's decision."
  ];  
  const [groupSize, setGroupSize] = useState(4);
  const selectedCandidateId = Object.entries(checkedState)
    .filter(([_, checked]) => checked)
    .map(([id]) => Number(id))[0]; // Get the selected candidate ID
  const [offerConfirmations, setOfferConfirmations] = useState<{[candidateId: number]: string[]}>({});
  const confirmations = selectedCandidateId ? (offerConfirmations[selectedCandidateId] || []) : [];
  const hasConfirmed = confirmations.includes(user?.id || '');
  const confirmationCount = confirmations.length;
  const allConfirmed = confirmationCount >= groupSize;
  const [popupVotes, setPopupVotes] = useState<{ [key: number]: InterviewPopup }>({});
  
  const [existingOffer, setExistingOffer] = useState<Offer | null>(null);
  const [ableToMakeOffer, setAbleToMakeOffer] = useState(true);

  const checkExistingOffer = async () => {
    if (!user?.group_id || !user?.class) return;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/offers/group/${user.group_id}/class/${user.class}`
      );
      
      if (response.ok) {
        const offer = await response.json();
        
        // Fix: Handle null response properly
        if (offer && offer.id) {
          setExistingOffer(offer);
          
          if (offer.status === 'pending') {
            setOfferPending(true);
          } else if (offer.status === 'accepted') {
            setAcceptedOffer(true);
            setSentIn(prev => {
              const newSentIn = [...prev];
              newSentIn[offer.candidate_id] = true;
              return newSentIn;
            });
          } else if (offer.status === 'rejected') {
            setSentIn(prev => {
              const newSentIn = [...prev];
              newSentIn[offer.candidate_id] = false;
              return newSentIn;
            });
            setOfferPending(false);
          }
        } else {
          setExistingOffer(null);
          setOfferPending(false);
        }
      } else {
        setExistingOffer(null);
        setOfferPending(false);
      }
    } catch (error) {
      console.error("Error checking existing offer:", error);
      setExistingOffer(null);
      setOfferPending(false);
    } finally {
    }
  };

  useEffect(() => {
  }, [ableToMakeOffer]);

  useEffect(() => {
    if (user?.group_id && user?.class) {
      checkExistingOffer();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.group_id || !candidates.length) return;

    const fetchPopupVotes = async () => {
      try {
        const promises = candidates.map(candidate => 
          fetch(`${API_BASE_URL}/interview-popup/${candidate.id}/${user.group_id}/${user.class}`)
            .then(res => res.json())
        );
        
        const results = await Promise.all(promises);
        const votesMap = results.reduce((acc, vote, index) => {
          acc[candidates[index].id] = vote;
          return acc;
        }, {});
        
        setPopupVotes(votesMap);
      } catch (error) {
        console.error('Error fetching popup votes:', error);
      }
    };

    fetchPopupVotes();
  }, [user, candidates]);

  // Load user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, {
          credentials: "include",
        });
        const userData = await response.json();
        if (response.ok) { 
          setUser(userData);
          updateProgress(userData, "offer");
        }
        else router.push("/login");
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // Update current page when user is loaded
  useEffect(() => {
    if (user && user.email) {
      // Emit socket events
      socket?.emit("studentOnline", { studentId: user.email });
      socket?.emit("studentPageChanged", {
        studentId: user.email,
        currentPage: pathname,
      });

      // Update current page in database
      const updateCurrentPage = async () => {
        try {
          await axios.post(`${API_BASE_URL}/update-currentpage`, {
            page: "makeofferpage",
            user_email: user.email,
          });
        } catch (error) {
          console.error("Error updating current page:", error);
        }
      };

      updateCurrentPage();
    }
  }, [user, pathname]);

  useEffect(() => {
    if (!user?.group_id) return;

    const fetchInterviews = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/interview/group/${user.group_id}?class=${user.class}`
        );
        const data = await response.json();

        setInterviews(data);
      } catch (err) {
        console.error("Error fetching interviews:", err);
      }
    };

    const fetchGroupSize = async () => {
      if (!user?.group_id) return;
      try {
        const response = await axios.get(`${API_BASE_URL}/group-size/${user.group_id}`);
        setGroupSize(response.data.count);
      } catch (err) {
        console.error("Failed to fetch group size:", err);
      }
    };

    fetchGroupSize();
    fetchInterviews();
  }, [user]);

  useEffect(() => {
    if (!interviews.length) {
      return;
    }

    const fetchCandidates = async () => {
      try {
        const fetchedCandidates = await Promise.all(
          interviews.map(async (interview, index) => {
            const id = interview.candidate_id;
            const url = `${API_BASE_URL}/canidates/resume/${id}`;
          
            try {
              const res = await fetch(url);

              if (!res.ok) {
                console.error(`  ❌ Invalid response for candidate ${id}:`, {
                  status: res.status,
                  statusText: res.statusText,
                  url: url
                });
                throw new Error(
                  `Invalid response for candidate ${interview.candidate_id}: ${res.status}`
                );
              }

              // Check if response has content
              const contentType = res.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) {
                console.error(`  ❌ Invalid content-type for candidate ${id}:`, contentType);
                throw new Error(`Invalid content-type for candidate ${id}: ${contentType}`);
              }
              
              // Get response text first to debug
              const responseText = await res.text();
              
              if (!responseText.trim()) {
                console.error(`  ❌ Empty response for candidate ${id}`);
                throw new Error(`Empty response for candidate ${id}`);
              }

              const data = JSON.parse(responseText);
              
              if (!data) {
                console.error(`  ❌ No data found for candidate ${id}`);
                throw new Error(`No data found for candidate ${id}`);
              }
              
              return data;
              
            } catch (parseError) {
              console.error(`  ❌ Error processing candidate ${id}:`, parseError);
              // Instead of throwing, return a placeholder or skip this candidate
              return null; // or create a placeholder object
            }
          })
        );

        // Filter out null candidates (failed fetches)
        const validCandidates = fetchedCandidates.filter(candidate => candidate !== null);
        setCandidates(validCandidates);
              
      } catch (err) {
        console.error("=== Error in fetchCandidates ===");
        console.error("Error type:", typeof err);
        console.error("Error message:", err instanceof Error ? err.message : err);
        console.error("Full error object:", err);
        console.error("Current interviews that caused error:", interviews);
        
        // Set empty array to prevent infinite loops
        setCandidates([]);
      }
    };

    fetchCandidates();
  }, [interviews]);

  useEffect(() => {
    const handleShowInstructions = () => {
      setShowInstructions(true);
    };

    window.addEventListener('showInstructions', handleShowInstructions);

    return () => {
      window.removeEventListener('showInstructions', handleShowInstructions);
    };
  }, []);
  
  useEffect(() => {
    if (!candidates.length) return;

    const fetchResumes = async () => {
      try {
        const fetchedResumes = await Promise.all(
          candidates.map(async (candidate) => {
            const id = candidate.resume_id;
            const res = await fetch(`${API_BASE_URL}/resume_pdf/id/${id}`);

            if (!res.ok) {
              throw new Error(
                `Invalid response for resume ${candidate.resume_id}`
              );
            }

            const data = await res.json();
            
            // Fix: If data is an array, take the first element
            const resumeData = Array.isArray(data) ? data[0] : data;
            return resumeData;
          })
        );

        setResumes(fetchedResumes);
      } catch (err) {
        console.error("Error fetching resumes:", err);
      }
    };

    fetchResumes();
  }, [candidates]);
  
  const groupInterviewsByCandidate = (interviews: any[]) => {
    const grouped: { [candidate_id: number]: any[] } = {};
    for (const interview of interviews) {
      const id = interview.candidate_id;
      if (!grouped[id]) {
        grouped[id] = [];
      }
      grouped[id].push(interview);
    }
    return grouped;
  };

  // Calculate vote totals and checkbox state
  useEffect(() => {
    if (!user || !interviews.length) return;

    const grouped = groupInterviewsByCandidate(interviews);
    const voteData: { [key: number]: VoteData } = {};
    const checkboxData: { [key: number]: boolean } = {};

    for (const [candidateIdStr, candidateInterviews] of Object.entries(
      grouped
    )) {
      const candidateId = parseInt(candidateIdStr);
      voteData[candidateId] = {
        Overall: 0,
        Profesionality: 0,
        Quality: 0,
        Personality: 0,
      };

      candidateInterviews.forEach((interview) => {
        voteData[candidateId].Overall += interview.question1;
        voteData[candidateId].Profesionality += interview.question2;
        voteData[candidateId].Quality += interview.question3;
        voteData[candidateId].Personality += interview.question4;

        checkboxData[candidateId] =
          checkboxData[candidateId] || interview.checked;
      });
    }

    setVoteCounts(voteData);
    setCheckedState(checkboxData);
  }, [interviews, user]);

  useEffect(() => {
    if (!interviews.length || !candidates.length) return;

    const uniqueCandidateIds = [
      ...new Set(interviews.map((i) => i.candidate_id)),
    ];

    const merged = uniqueCandidateIds.map((id) => {
      // Fix: Match interview candidate_id with candidate's resume_id (not the candidate's id)
      const candidate = candidates.find((c) => c.resume_id === id);
      
      if (!candidate) {
        console.warn(`No candidate found with resume_id ${id}`);
        return {
          candidate_id: id,
          video_path: "https://www.youtube.com/embed/srw4r3htm4U",
          resume_path: "uploads/resumes/sample1.pdf",
        };
      }

      const resume = resumes.find((r) => r.id === candidate.resume_id);
      
      return {
        candidate_id: id,
        video_path: candidate?.interview || "https://www.youtube.com/embed/srw4r3htm4U",
        resume_path: resume?.file_path || "uploads/resumes/sample1.pdf",
      };
    });

    setInterviewsWithVideos(merged);
  }, [resumes]);

  // Setup socket.io
  useEffect(() => {
    if (!user || socket) return;

    socket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      timeout: 5000,
    });

    socket.on("connect", () => {
      setIsConnected(true);
      socket?.emit("joinGroup", `group_${user.group_id}_class_${user.class}`);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("groupMemberOffer", () => {
      setPopup({
        headline: "Offer submitted",
        message: "Awaiting approval from your advisor…",
      });
      setOfferPending(true);
    });

    socket.on("confirmOffer", ({ candidateId, studentId, groupId, classId }) => {
    // Only process if it's for our group and class
    if (groupId === user.group_id && classId === user.class) {
      setOfferConfirmations(prev => {
        const currentConfirmations = prev[candidateId] || [];
        if (!currentConfirmations.includes(studentId)) {
          return {
            ...prev,
            [candidateId]: [...currentConfirmations, studentId]
          };
        }
        return prev;
      });
    }
  });

    // Listens to Advisor's response
    socket.on(
      "makeOfferResponse",
      ({
        classId,
        groupId,
        candidateId,
        accepted,
      }: {
        classId: number;
        groupId: number;
        candidateId: number;
        accepted: boolean;
      }) => {

        checkExistingOffer();

        if(classId !== user.class) {
          return
        }
        if(groupId !== user.group_id) {
          return
        }
        if (accepted) {
          setPopup({
            headline: "Offer accepted!",
            message: "Congratulations—you've extended the offer successfully.",
          });
          setSentIn((prev) => {
            const newSentIn = [...prev];
            newSentIn[candidateId] = true; 
            return newSentIn;
          })

          setAcceptedOffer(true);
          setExistingOffer(prev => prev ? {...prev, status: 'accepted'} : null);
        } else {
          setPopup({
            headline: "Offer rejected",
            message:
              "That candidate wasn't available or has chosen another offer. Please choose again.",
          });

          setCheckedState({});
          setSentIn((prev) => {
            const newSentIn = [...prev];
            newSentIn[candidateId] = false; 
            return newSentIn;
          })

          setOfferPending(false);
          setExistingOffer(prev => prev ? {...prev, status: 'rejected'} : null);
          setAbleToMakeOffer(true);
        }
      }
    );

    socket.on(
      "checkboxUpdated",
      ({
        interview_number,
        checked,
      }: {
        interview_number: number;
        checked: boolean;
      }) => {
        setCheckedState((prev) => ({ ...prev, [interview_number]: checked }));
      }
    );

    return () => {
      socket?.disconnect();
    };
  }, [user]);

  const handleCheckboxChange = (interviewNumber: number) => {
    if (!socket || !isConnected) return;

    const roomId = `group_${user!.group_id}_class_${user!.class}`;

    const newCheckedState = !checkedState[interviewNumber];
    setCheckedState((prev) => ({
      ...prev,
      [interviewNumber]: newCheckedState,
    }));

    socket.emit("checkint", {
      group_id: roomId,
      interview_number: interviewNumber,
      checked: newCheckedState,
    });
  };
    
  const handleConfirmOffer = (candidateId: number) => {
    if (!socket || !user || !candidateId) return;
    
    // Check if there's already an offer
    if (existingOffer && (existingOffer.status === 'pending' || existingOffer.status === 'accepted')) {
      let message = "";
      if (existingOffer.status === 'pending') {
        message = "You already have a pending offer awaiting advisor approval.";
      } else if (existingOffer.status === 'accepted') {
        message = "You already have an accepted offer. You cannot make another offer.";
      }
      
      setPopup({
        headline: "Offer Already Exists",
        message: message
      });
      return;
    }
    
    // First update local state immediately
    setOfferConfirmations(prev => {
      const currentConfirmations = prev[candidateId] || [];
      if (!currentConfirmations.includes(user.id)) {
        return {
          ...prev,
          [candidateId]: [...currentConfirmations, user.id]
        };
      }
      return prev;
    });

    // Then emit to other users in the room
    socket.emit("confirmOffer", {
      groupId: user.group_id,
      classId: user.class,
      candidateId,
      studentId: user.id,
      roomId: `group_${user.group_id}_class_${user.class}`
    });
  };

  const handleMakeOffer = async () => {
    // Check if there's already an offer
    if (existingOffer && (existingOffer.status === 'pending' || existingOffer.status === 'accepted')) {
      let message = "";
      if (existingOffer.status === 'pending') {
        message = "You already have a pending offer awaiting advisor approval.";
      } else if (existingOffer.status === 'accepted') {
        message = "You already have an accepted offer. You cannot make another offer.";
      }
      
      setPopup({
        headline: "Offer Already Exists",
        message: message
      });
      setAbleToMakeOffer(false);
      return;
    }

    const selectedIds = Object.entries(checkedState)
      .filter(([_, checked]) => checked)
      .map(([id]) => Number(id));
    
    if (selectedIds.length !== 1) return;
    
    const candidateId = selectedIds[0];
    const confirmations = offerConfirmations[candidateId] || [];
    if (confirmations.length < groupSize) {
      setPopup({
        headline: "Team Confirmation Required",
        message: `All ${groupSize} team members must confirm before making an offer.`,
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_id: user!.group_id,
          class_id: user!.class,
          candidate_id: candidateId,
          status: `pending`,
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setPopup({
          headline: "Error",
          message: result.error || "Failed to submit offer",
        });
        return;
      }

      // Update existing offer state
      setExistingOffer({
        id: result.id,
        class_id: user!.class,
        group_id: user!.group_id,
        candidate_id: candidateId,
        status: 'pending'
      });

      // THEN emit socket event for real-time updates
      socket?.emit("makeOfferRequest", {
        classId: user!.class,
        groupId: user!.group_id,
        candidateId,
      });

      setPopup({
        headline: "Offer submitted",
        message: "Awaiting approval from your advisor…",
      });
      setOfferPending(true);

    } catch (error) {
      console.error("Error submitting offer:", error);
      setPopup({
        headline: "Error",
        message: "Failed to submit offer. Please try again.",
      });
    }
  };

  const completeMakeOffer = () => {
    const selectedCount = Object.values(checkedState).filter(Boolean).length;
    if (selectedCount !== 1) {
      setPopup({
        headline: "Action Required",
        message: "Please select exactly one candidate to make an offer.",
      });
      return;
    }
    updateProgress(user!, "employer");
    localStorage.setItem("progress", "employer");
    window.location.href = "/dashboard";
  };

  const selectedCount = Object.values(checkedState).filter(Boolean).length;

  const isOfferDisabled = existingOffer !== null && (existingOffer.status === 'pending' || existingOffer.status === 'accepted');

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
  

  if (!user || user.affiliation !== "student") return null;

  return (
  <div className="min-h-screen bg-sand font-rubik">
    {showInstructions && (
      <Instructions 
        instructions={offerInstructions}
        onDismiss={() => setShowInstructions(false)}
        title="Offer Instructions"
        progress={4}
      />
    )}

    <Navbar />
    <div className="flex-1 flex flex-col px-4 py-8">
      <div className="w-full p-6">
        <h1 className="text-3xl font-bold text-center text-navy mb-6">
          Make an Offer as a Group
        </h1>

        {/* NEW: Show existing offer status */}
        {existingOffer && (
          <div className={`mb-6 p-4 rounded-lg text-center ${
            existingOffer.status === 'pending' 
              ? 'bg-yellow-100 border border-yellow-400 text-yellow-800'
              : existingOffer.status === 'accepted'
              ? 'bg-green-100 border border-green-400 text-green-800'
              : 'bg-red-100 border border-red-400 text-red-800'
          }`}>
            <h3 className="font-bold mb-2">
              {existingOffer.status === 'pending' && 'Offer Pending Approval'}
              {existingOffer.status === 'accepted' && 'Offer Accepted!'}
              {existingOffer.status === 'rejected' && 'Offer Rejected'}
            </h3>
            <p>
              {existingOffer.status === 'pending' && 'Your offer for Candidate ' + existingOffer.candidate_id + ' is awaiting advisor approval.'}
              {existingOffer.status === 'accepted' && 'Your offer for Candidate ' + existingOffer.candidate_id + ' has been accepted! Congratulations!'}
              {existingOffer.status === 'rejected' && 'Your offer for Candidate ' + existingOffer.candidate_id + ' was rejected. You may select a different candidate.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 w-full min-h-[60vh] items-stretch">
          {interviewsWithVideos.map((interview, index) => {
            const interviewNumber = interview.candidate_id;
            const votes = voteCounts[interviewNumber] || {
              Overall: 0,
              Profesionality: 0,
              Quality: 0,
              Personality: 0,
            };

            const isAccepted = sentIn[interviewNumber] === true;
            const isRejected = sentIn[interviewNumber] === false;
            return (
              <div
                key={interviewNumber}
                className={`p-6 rounded-lg shadow-md flex flex-col gap-4 ${
                  isAccepted
                    ? "bg-green-100 border border-green-500"
                    : isRejected
                    ? "bg-red-100 border border-red-300 pointer-events-none"
                    : "bg-wood"
                }`}
              >
                <h3 className="text-xl font-semibold text-navy text-center">
                  Candidate {interviewNumber}
                </h3>

                <div className="aspect-video w-full">
                  <iframe
                    className="w-full h-full rounded-lg shadow-md"
                    src={interview.video_path}
                    title="Interview Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  ></iframe>
                </div>

                <div className="mt-2 space-y-1 text-navy text-sm">
                  <p>
                    <span className="font-medium">Overall:</span> {
                      Math.max(0, 
                        ((votes.Overall || 0) + (popupVotes[interviewNumber]?.question1 || 0)) / groupSize
                      ).toFixed(1)
                    }
                  </p>
                  <p>
                    <span className="font-medium">Professional Presence:</span>{" "}
                    {
                      Math.max(0, 
                        ((votes.Profesionality || 0) + (popupVotes[interviewNumber]?.question2 || 0)) / groupSize
                      ).toFixed(1)
                    }
                  </p>
                  <p>
                    <span className="font-medium">Quality of Answer:</span>{" "}
                    {
                      Math.max(0, 
                        ((votes.Quality || 0) + (popupVotes[interviewNumber]?.question3 || 0)) / groupSize
                      ).toFixed(1)
                    }
                  </p>
                  <p>
                    <span className="font-medium">Personality:</span>{" "}
                    {
                      Math.max(0, 
                        ((votes.Personality || 0) + (popupVotes[interviewNumber]?.question4 || 0)) / groupSize
                      ).toFixed(1)
                    }
                  </p>
                </div>

                <a
                  href={`${API_BASE_URL}/${interview.resume_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-navy hover:underline ${isRejected ? "pointer-events-none opacity-50" : ""}`}
                >
                  View / Download Resume
                </a>

                {!isRejected && (
                  <label className={`flex items-center mt-2 ${isOfferDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checkedState[interviewNumber] || false}
                      onChange={() => !isOfferDisabled && handleCheckboxChange(interviewNumber)}
                      disabled={isOfferDisabled}
                      className="h-4 w-4 text-redHeader"
                    />
                    <span className="ml-2 text-navy text-sm">Selected for Offer</span>
                  </label>
                )}
              </div>
            );
          })}
        </div>

        {popup && (
          <Popup
            headline={popup.headline}
            message={popup.message}
            onDismiss={() => setPopup(null)}
          />
        )}

        {selectedCount === 1 && !isOfferDisabled && (
          <div className="flex flex-col items-center my-6 gap-4">
            {/* Team confirmation status */}
            <div className="text-center">
              <p className="text-navy font-medium">
                Team Confirmation: {confirmationCount}/{groupSize} members ready
              </p>
            </div>

            {/* Confirmation/Offer buttons */}
            <div className="flex gap-4">
              {!allConfirmed ? (
                // Individual confirmation button
                <button
                  onClick={() => handleConfirmOffer(selectedCandidateId)}
                  disabled={hasConfirmed || offerPending || isOfferDisabled || !ableToMakeOffer}
                  className={`px-6 py-3 rounded-lg shadow-md font-rubik transition duration-300 ${
                    hasConfirmed
                      ? "bg-green-500 text-white cursor-not-allowed"
                      : isOfferDisabled
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {hasConfirmed ? `✓ Confirmed (${confirmationCount}/${groupSize})` : 'Confirm Selection'}
                </button>
              ) : (
                // Final offer button (only appears when all confirmed)
                <button
                  onClick={handleMakeOffer}
                  disabled={offerPending || isOfferDisabled || !ableToMakeOffer}
                  className={`px-6 py-3 rounded-lg shadow-md font-rubik transition duration-300 ${
                    offerPending || isOfferDisabled
                      ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                      : "bg-redHeader text-white hover:bg-blue-700"
                  }`}
                >
                  {offerPending ? "Awaiting Advisor…" : isOfferDisabled ? "Offer Already Submitted" : "Make Team Offer"}
                </button>
              )}
            </div>

            {/* Status message */}
            {!allConfirmed && confirmationCount > 0 && !isOfferDisabled && (
              <p className="text-sm text-orange-600 text-center">
                Waiting for {groupSize - confirmationCount} more team member{groupSize - confirmationCount !== 1 ? 's' : ''} to confirm
              </p>
            )}
          </div>
        )}

        {selectedCount === 1 && isOfferDisabled && (
          <div className="flex flex-col items-center my-6 gap-4">
            <div className="text-center">
              <p className="text-gray-600 font-medium">
                {ableToMakeOffer && !acceptedOffer && 'Offer actions disabled - awaiting advisor approval'}
                {ableToMakeOffer && acceptedOffer && 'Offer actions disabled - offer already accepted'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer navigation buttons */}
      <footer className="flex justify-between mt-6 px-4">
        <button
          onClick={() => (window.location.href = "/jobdes")}
          className="px-4 py-2 bg-redHeader text-white rounded-lg shadow-md cursor-not-allowed opacity-50 transition duration-300 font-rubik"
          disabled={true}
        >
          ← Back: Interview Stage
        </button>
        <button
          onClick={completeMakeOffer}
          className={`px-4 py-2 bg-redHeader text-white rounded-lg shadow-md font-rubik transition duration-300 ${
            !acceptedOffer
              ? "cursor-not-allowed opacity-50"
              : "hover:bg-blue-400"
          }`}
          disabled={!acceptedOffer}
        >
          Next: Employer Panel →
        </button>
      </footer>
    </div>
    <Footer />
  </div>
)};