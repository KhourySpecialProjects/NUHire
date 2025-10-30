"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSocket } from "../components/socketContext";

const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

const StudentPage = () => {
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const pathname = usePathname(); 
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const storedId = localStorage.getItem("studentId");
    
    if (!storedId) {
      console.error("No student ID found in local storage.");
      return;
    }

    socket.emit("studentOnline", { studentId: storedId });
    socket.emit("updateStudentPageChange", { studentId: storedId, currentPage: pathname });

    const handleSendPopupToGroup = ({ headline, message }: { headline: string; message: string }) => {
      setPopup({ headline, message });
    };

    socket.on("sendPopupToGroup", handleSendPopupToGroup);

    return () => {
      socket.off("sendPopupToGroup", handleSendPopupToGroup);
    };
  }, [socket, pathname]);

    return (
        <div className="p-6 min-h-screen">
            <h1 className="text-2xl font-bold">Student Dashboard</h1>

            {popup && (
                <div className="fixed top-10 right-10 bg-blue-500 text-white p-4 rounded-md shadow-lg">
                    <h2 className="font-bold">{popup.headline}</h2>
                    <p>{popup.message}</p>
                    <button onClick={() => setPopup(null)} className="mt-2 px-4 py-2 bg-gray-800 text-white rounded">
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
};

export default StudentPage;