'use client'
export const dynamic = "force-dynamic";
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

import { useState, useEffect, JSX, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import Navbar from "../components/navbar";
import Popup from "../components/popup";
import Footer from "../components/footer";
import { usePathname } from "next/navigation";
import { useSocket } from "../components/socketContext";
import router from "next/router";
import Instructions from "../components/instructions";
import { useProgressManager } from "../components/progress";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();


interface CommentType {
  id: string;
  x: number;
  y: number;
  text: string;
  page: number;
  isEditing?: boolean;
}

interface User { 
  email: string;
  class: number;
  group_id: number;
}

export default function JobDescriptionPage() { 
  const socket = useSocket();
  const {updateProgress, fetchProgress} = useProgressManager();
  const [fileUrl, setJob] = useState("");
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [tool, setTool] = useState<"pointer" | "comment">("pointer");
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const jobDesInstructions = [
    "Read the job description that you are hiring for.",
    "Take notes by pressing the top right notes button, you can always access them.",
    "Leaving comments on the description are only accessible on this page.",
    "Pay attention to the required skills and qualifications.",
    "Look for specific technologies or tools mentioned.",
    "Note any soft skills that are emphasized in the job description."
  ];

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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await response.json();
        if (response.ok) {
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();

  }, [router]);

  useEffect(() => {
    if (user)
      updateProgress(user, "job_description");
  }, [user]);

  useEffect(() => {
    if (!socket || !user?.email) return;

    socket.emit("studentOnline", { studentId: user.email }); 
    socket.emit("studentPageChanged", { studentId: user.email, currentPage: pathname });

    const updateCurrentPage = async () => {
      try {
        await fetch(`${API_BASE_URL}/users/update-currentpage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: 'jobdes', user_email: user.email }),
          credentials: "include"
        });
      } catch (error) {
        console.error("Error updating current page:", error);
      }
    };

    updateCurrentPage();
  }, [socket, user?.email, pathname]);

  useEffect(() => {
    if (!socket) return;

    const handleReceivePopup = ({ headline, message }: { headline: string; message: string }) => {
      setPopup({ headline, message });
    };

    socket.on("receivePopup", handleReceivePopup);

    return () => {
      socket.off("receivePopup", handleReceivePopup);
    };
  }, [socket]);

  // Update your fetchJob useEffect in jobdes/page.tsx
  useEffect(() => {
    const fetchJob = async () => {
      if (!user?.group_id || !user?.class) {
        console.log("No user group_id or class found");
        setLoading(false);
        return; 
      }
      
      try {
        // First, get the job assignment for this group/class
        console.log(`Fetching job assignment for group ${user.group_id} in class ${user.class}`);
        const jobAssignmentResponse = await fetch(
          `${API_BASE_URL}/jobs/assignment/${user.group_id}/${user.class}`, {credentials: "include"},
        );

        if (!jobAssignmentResponse.ok) {
          console.log("No job assignment found for this group");
          setLoading(false);
          return;
        }

        const jobAssignmentData = await jobAssignmentResponse.json();
      const jobTitle = jobAssignmentData.job;
        console.log("Found job assignment:", jobTitle);

        // Then fetch the PDF file using the job title
        const response = await fetch(`${API_BASE_URL}/jobs/title?title=${encodeURIComponent(jobTitle)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error("Failed to fetch job description PDF");
        }

        const job = await response.json();
        console.log("Job PDF data:", job);
        setJob(`${API_BASE_URL}/${job.file_path}`);
      } catch (error) {
        console.error("Error fetching job description:", error);
        setPopup({
          headline: "No Job Assignment",
          message: "You haven't been assigned a job description yet. Please contact your instructor."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [user]);


      useEffect(() => {
        const savedComments = localStorage.getItem("pdf-comments");
        if (savedComments) {
          setComments(JSON.parse(savedComments));
        }
      }, []);
    
      useEffect(() => {
        localStorage.setItem("pdf-comments", JSON.stringify(comments));
      }, [comments]);
    
      const handlePdfClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (tool !== "comment") return;
        const pdfPage = document.querySelector(".react-pdf__Page") as HTMLElement | null;
        if (!pdfPage) {
          console.log("PDF page not found.");
          return;
        }
        const pageRect = pdfPage.getBoundingClientRect();
        if (
          event.clientX >= pageRect.left &&
          event.clientX <= pageRect.right &&
          event.clientY >= pageRect.top &&
          event.clientY <= pageRect.bottom
        ) {
          // Calculate coordinates relative to PDF
          const x = (event.clientX - pageRect.left) / pageRect.width * 100;
          const y = (event.clientY - pageRect.top) / pageRect.height * 100;
          const newComment: CommentType = {
            id: String(Date.now()),
            x,
            y,
            text: "",
            page: pageNumber,
            isEditing: true,
          };
          setComments([...comments, newComment]);
        } else {
          console.log("Clicked outside the PDF page, comment not added.");
        }
      };
    
      // Update comment text and turn off editing mode
      const updateComment = (id: string, newText: string) => {
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === id ? { ...comment, text: newText, isEditing: false } : comment
          )
        );
      };
    
      const deleteComment = (id: string) => {
        setComments((prevComments) => prevComments.filter((comment) => comment.id !== id));
      };
    
      const toggleEditComment = (id: string) => {
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === id ? { ...comment, isEditing: true } : comment
          )
        );
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
  
  if (!user) return <div>Error: User not found.</div>;



  return (
    <div className="bg-sand font-rubik">
      {showInstructions && (
        <Instructions 
          instructions={jobDesInstructions}
          onDismiss={() => setShowInstructions(false)}
          title="Job Description Instructions"
          progress={0}
        />
      )}
      <Navbar />
      <div className="flex-1 flex flex-col px-4 py-8">

        <div className="flex justify-center items-center font-rubik text-redHeader text-4xl font-bold mb-4">
          Job Description
        </div>

        <div className="flex justify-center space-x-4 my-4">
          <button
            onClick={() => setTool("pointer")}
            className={`px-5 py-2 rounded bg-navy font-rubik text-white transition duration-300 ease-in-out ${
              tool === "pointer" ? "ring-2 ring-navy" : "hover:bg-redHeader"
            }`}
          >
            Cursor
          </button>
          <button
            onClick={() => setTool("comment")}
            className={`px-5 py-2 rounded bg-navy font-rubik text-white transition duration-300 ease-in-out ${
              tool === "comment" ? "ring-2 ring-navy" : "hover:bg-redHeader"
            }`}
          >
            Comment
          </button>
        </div>

        <div
          id="pdf-container"
          className={`relative w-full mx-auto flex justify-center rounded-lg ${
            tool === "comment" ? "cursor-crosshair" : ""
          }`}
          onClick={handlePdfClick}
        >
          <div className="border border-northeasternBlack p-4 rounded-lg">
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages }) => {
                setNumPages(numPages);
                setPdfLoaded(true);
              }}
              className={`relative`}
            >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="flex justify-center"
                scale={1.3}
              />

            {comments
              .filter((comment) => comment.page === pageNumber)
              .map((comment) => (
                <div
                  key={comment.id}
                  className="comment-overlay absolute bg-white shadow-md p-2 rounded-md"
                  style={{
                    left: `${comment.x}%`,
                    top: `${comment.y}%`,
                  }}
                >
                  {comment.isEditing ? (
                    <input
                      type="text"
                      placeholder="Enter comment..."
                      autoFocus
                      className="border border-gray-400 rounded-md p-1 text-sm"
                      defaultValue={comment.text}
                      onBlur={(e) => updateComment(comment.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateComment(comment.id, (e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                  ) : (
                    <div className="relative">
                      <div
                        className="bg-gray-200 text-sm p-2 rounded-md cursor-pointer"
                        onClick={() => toggleEditComment(comment.id)}
                      >
                        {comment.text}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteComment(comment.id);
                        }}
                        className="absolute top-0 right-0 text-red-500 text-xs"
                      >
                        X
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </Document>
          </div>
          {popup && (
            <Popup
              headline={popup.headline}
              message={popup.message}
              onDismiss={() => setPopup(null)}
            />
          )}
        </div>

        <div className="flex justify-center items-center gap-5 mt-5 mb-5 w-full">
          <button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber(pageNumber - 1)}
            className="px-4 py-2 rounded bg-navy font-rubik text-white transition duration-300 hover:bg-redHeader disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <span className="font-bold text-lg mx-4">
            Page {pageNumber} of {numPages}
          </span>

          <button
            disabled={pageNumber >= (numPages || 1)}
            onClick={() => setPageNumber(pageNumber + 1)}
            className="px-4 py-2 rounded bg-navy font-rubik text-white transition duration-300 hover:bg-redHeader disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>

      <footer>
        <div className="flex justify-end mt-4 mb-4 mr-4">
          <button
            onClick={() => {
              updateProgress(user, "res_1");
              localStorage.setItem("progress", "res_1"); // update to commmit
              console.log("Progress updated to res_1");
              window.location.href = '/res-review';
            }}
            className="px-4 py-2 bg-redHeader text-white rounded-lg shadow-md hover:bg-navy transition duration-300 font-rubik"
          >
            Next: Resume Review pt. 1 →
          </button>
        </div>
      </footer>
    <Footer />
    </div>
  );
}