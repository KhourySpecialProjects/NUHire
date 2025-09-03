"use client";

import { useEffect, useState } from "react";
import io from "socket.io-client";
import { usePathname } from "next/navigation";

const API_BASE_URL = process.env.https://nuhire-api-cz6c.onrender.com;
const socket = io(API_BASE_URL); 

const StudentPage = () => {
    const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
    const pathname = usePathname(); 

    useEffect(() => {
        const storedId = localStorage.getItem("studentId");
        
        if (!storedId) {
            console.error("No student ID found in local storage.");
            return;
        }
        socket.emit("studentOnline", { studentId: storedId });

        socket.emit("updateStudentPageChange", { studentId: storedId, currentPage: pathname });

        socket.on("sendPopupToGroup", ({ headline, message }) => {
            setPopup({ headline, message });
        });

        return () => {
            socket.disconnect();
        };
    }, [pathname]); 

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