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

// Define the API base URL from environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const SOCKET_URL = `${API_BASE_URL}`;
let socket: Socket | null = null;

// Define the VoteData interface to match the expected vote data structure
type VoteData = {
  Overall: number;
  Profesionality: number;
  Quality: number;
  Personality: number;
};

// Main component for the MakeOffer page
export default function MakeOffer() {
  useProgress();
  const router = useRouter();

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
  interface User {
    id: string;
    group_id: string;
    email: string;
    class: number;
    affiliation: string;
  }

  const [user, setUser] = useState<User | null>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [interviewsWithVideos, setInterviewsWithVideos] = useState<any[]>([]);
  const [acceptedOffer, setAcceptedOffer] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Load user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, {
          credentials: "include",
        });
        const userData = await response.json();
        if (response.ok) setUser(userData);
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
        console.log("fetching interviews for class: ", user.class);
        const data = await response.json();

        setInterviews(data);
      } catch (err) {
        console.error("Error fetching interviews:", err);
      }
    };

    fetchInterviews();
  }, [user]);

  useEffect(() => {
    if (!interviews.length) return;

    const fetchCandidates = async () => {
      try {
        const fetchedCandidates = await Promise.all(
          interviews.map(async (interview) => {
            const id = interview.candidate_id;
            const res = await fetch(`${API_BASE_URL}/canidates/${id}`);

            if (!res.ok) {
              throw new Error(
                `Invalid response for candidate ${interview.candidate_id}`
              );
            }

            const data = await res.json();
            return data;
          })
        );

        console.log("Setting candidates:", fetchedCandidates);
        setCandidates(fetchedCandidates); // triggers re-render
      } catch (err) {
        console.error("Error fetching candidates:", err);
      }
    };

    fetchCandidates();
  }, [interviews]);

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
            return data;
          })
        );

        console.log("Setting candidates:", fetchedResumes);
        setResumes(fetchedResumes); // triggers re-render
      } catch (err) {
        console.error("Error fetching candidates:", err);
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
      const candidate = candidates.find((c) => c.id === id);
      const resume = resumes.find((r) => r.id === candidate?.resume_id);
      return {
        candidate_id: id,
        video_path:
          candidate?.interview || "https://www.youtube.com/embed/srw4r3htm4U",
        resume_path: resume?.file_path || "uploads/resumes/sample1.pdf",
      };
    });

    setInterviewsWithVideos(merged);
  }, [interviews, candidates]);

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
      console.log()
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
        groupId: string;
        candidateId: number;
        accepted: boolean;
      }) => {
        console.log("Received Response: ", {
          classId,
          groupId,
          candidateId,
          accepted,
        });

        if(classId !== user.class) {
          console.log("Class Id is not defined");
          return
        }
        if(groupId !== user.group_id) {
          console.log("GroupId is not defined");
          return
        }
        if (accepted) {
          setPopup({
            headline: "Offer accepted!",
            message: "Congratulations—you’ve extended the offer successfully.",
          });
          setAcceptedOffer(true);
        } else {
          setPopup({
            headline: "Offer rejected",
            message:
              "That candidate wasn’t available or has chosen another offer. Please choose again.",
          });

          // filter the candidates based on the id to remove the rejected candidate.
          setInterviewsWithVideos((prev) =>
            prev.filter((iv) => iv.candidate_id !== candidateId)
          );

          setCheckedState((prev) => {
            const next = { ...prev };
            delete next[candidateId];
            return next;
          });

          setOfferPending(false);
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

  const handleMakeOffer = () => {
    const selectedIds = Object.entries(checkedState)
      .filter(([_, checked]) => checked)
      .map(([id]) => Number(id));
    if (selectedIds.length !== 1) return;
    const candidateId = selectedIds[0];

    console.log("user class: ", user!.class); // delete later -> seeing if user class is being fetched.  

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
  };

  const completeMakeOffer = () => {
    const selectedCount = Object.values(checkedState).filter(Boolean).length;
    if (selectedCount !== 1) {
      alert("You must select exactly 1 candidates before proceeding.");
      return;
    }
    localStorage.setItem("progress", "employerPannel");
    window.location.href = "/dashboard";
  };

  const selectedCount = Object.values(checkedState).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-xl">
        Loading...
      </div>
    );
  }

  if (!user || user.affiliation !== "student") return null;

  return (
    <div className="min-h-screen bg-sand font-rubik">
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full relative">
            <button
              className="absolute top-4 right-4 text-2xl text-gray-500 hover:text-red-500 font-bold"
              onClick={() => setShowInstructions(false)}
              aria-label="Close instructions"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-navy mb-4 text-center">Instructions</h2>
            <ul className="list-disc pl-6 text-navy text-lg space-y-2">
              <li>Review all candidates below as a group.</li>
              <li>Watch their interview videos and view their resumes.</li>
              <li>Discuss with your teammates and select <span className="font-bold">one</span> candidate to make an offer.</li>
              <li>Once selected, click <span className="font-bold">Make an Offer</span> and wait for advisor approval.</li>
              <li>After approval, proceed to the Employer Panel.</li>
            </ul>
          </div>
        </div>
      )}
      <Navbar />
      <div className="flex-1 flex flex-col px-4 py-8">
        <div className="w-full p-6">
          <h1 className="text-3xl font-bold text-center text-navy mb-6">
            Make an Offer as a Group
          </h1>
          <h2 className="text-xl italic text-center text-navy mb-6">
            Please review the Candidates below and as a group select 1 to give an
            offer.
          </h2>

          <div className="grid grid-cols-2 gap-8 w-full min-h-[60vh] items-stretch">
            {interviewsWithVideos.map((interview, index) => {
              const interviewNumber = interview.candidate_id;
              const votes = voteCounts[interviewNumber];

              return (
                <div
                  key={interviewNumber}
                  className="bg-wood p-6 rounded-lg shadow-md flex flex-col gap-4"
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
                      <span className="font-medium">Overall:</span>{" "}
                      {votes.Overall}
                    </p>
                    <p>
                      <span className="font-medium">Professional Presence:</span>{" "}
                      {votes.Profesionality}
                    </p>
                    <p>
                      <span className="font-medium">Quality of Answer:</span>{" "}
                      {votes.Quality}
                    </p>
                    <p>
                      <span className="font-medium">Personality:</span>{" "}
                      {votes.Personality}
                    </p>
                  </div>

                  <a
                    href={`${API_BASE_URL}/${interview.resume_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-navy hover:underline"
                  >
                    View / Download Resume
                  </a>

                  <label className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={checkedState[interviewNumber] || false}
                      onChange={() => handleCheckboxChange(interviewNumber)}
                      className="h-4 w-4 text-redHeader"
                    />
                    <span className="ml-2 text-navy text-sm">
                      Selected for Offer
                    </span>
                  </label>
                </div>
              );
            })}

            {popup && (
              <Popup
                headline={popup.headline}
                message={popup.message}
                onDismiss={() => setPopup(null)}
              />
            )}
          </div>
          {selectedCount === 1 && (
            <div className="flex justify-center my-6">
              <button
                onClick={handleMakeOffer}
                disabled={offerPending}
                className={`px-6 py-3 bg-redHeader text-white rounded-lg shadow-md font-rubik transition duration-300 ${
                  offerPending
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-blue-700"
                }`}
              >
                {offerPending ? "Awaiting Advisor…" : "Make an Offer"}
              </button>
            </div>
          )}
        </div>
        <footer className="flex justify-between mt-6">
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
          >
            Next: Employer Pannel →
          </button>
        </footer>
      </div>
      <Footer />
    </div>
  );
}