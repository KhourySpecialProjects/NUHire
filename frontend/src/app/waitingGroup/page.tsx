'use client';
export const dynamic = "force-dynamic";
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Slideshow from "../components/slideshow";
import Popup from "../components/popup";
import {useSocket} from "../components/socketContext";
import Facts from "../components/facts";
import { useAuth } from "../components/AuthContext";

export default function WaitingGroupPage() {
  interface User {
    f_name: string;
    l_name: string;
    email: string;
    class?: number; // FIXED: Use 'class' instead of 'class_id'
    group_id?: number;
  }

  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const [start, setStart] = useState(false);
  const socket = useSocket(); 
  const router = useRouter();
  const { user, loading: userloading } = useAuth();

  const groupStatusResponse = async () => {
    if (!user?.class || !user?.group_id) {
      console.log("Missing class or group_id:", { class: user?.class, group_id: user?.group_id });
      return;
    }
    
    console.log("Checking group status...");
    try {
      const response = await fetch(
        `${API_BASE_URL}/groups/status/${user.class}/${user.group_id}`,
        { method: "GET", credentials: "include" }
      );
      
      console.log("Group status response:", response.status);
      
      if (!response.ok) {
        console.error("Group status request failed:", response.status, response.statusText);
        return;
      }
      
      const statusData = await response.json();
      console.log("Group status data:", statusData);
        
      if (statusData.started) {
        console.log("Group is started, checking seen status...");
        
        const seenResponse = await fetch(
          `${API_BASE_URL}/groups/seen?email=${encodeURIComponent(user.email)}`,
          { method: "GET", credentials: "include" }
        );
        
        console.log("Seen response:", seenResponse.status);
        
        if (seenResponse.ok) {
          const seenData = await seenResponse.json();
          console.log("Seen data:", seenData);
          
          if (seenData.seen === 1) {
            console.log("User has seen intro, going to dashboard");
            router.push("/dashboard");
          } else {
            console.log("User has not seen intro, going to about");
            router.push("/about");
          }
        } else {
          console.log("Seen request failed, defaulting to about page");
          router.push("/about");
        }
      } else {
        console.log("Group not started yet");
      }

    } catch (error) {
      console.error("Error fetching group status:", error);
    }
  };
    
  useEffect(() => {
    if (!socket || !user?.class) {
      return;
    }

    // Handle connection
    const handleConnect = () => {
      
      socket.emit('joinClass', { 
        classId: user.class,
      });

      const roomId = `group_${user.group_id}_class_${user.class}`;
      socket.emit("joinGroup", roomId);
    };

    const handleDisconnect = () => {
    };

    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error);
    };

    const handleGroupStartedGroup = ({ group_id }: { group_id: number }) => {
      if (group_id === user.group_id) {
        groupStatusResponse();
      }
      console.log(`📡 Received groupStartedGroup event for group ${group_id}`);
    };

    const handleGroupStartedClass = () => {
      groupStatusResponse();
      console.log(`📡 Received groupStartedClass event`);
    };

    // Check if already connected
    if (socket.connected) {
      handleConnect();
    }

    // Attach listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('groupStartedGroup', handleGroupStartedGroup);
    socket.on('groupStartedClass', handleGroupStartedClass);

    // Cleanup listeners only, don't disconnect
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('groupStartedGroup', handleGroupStartedGroup);
      socket.off('groupStartedClass', handleGroupStartedClass);
    };
  }, [socket, user, router]);

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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sand">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to continue</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-sand font-rubik">
      {/* Background Slideshow */}
      <div className="fixed inset-0 z-0">
        <Slideshow />
      </div>
      
      {/* Overlay */}
      <div className="fixed inset-0 bg-sand/80 z-5" />
      
      {/* Main Content */}
      <div className="z-10 flex flex-col items-center justify-center relative flex-grow p-8">
        <div className="max-w-2xl w-full text-center">
          {!start ? (
            <>
              <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-northeasternRed mb-4">
                  Waiting for Teacher
                </h1>
                <p className="text-xl text-northeasternBlack mb-4">
                  Hello, `{user.f_name} {user.l_name}`!
                </p>
                {user.class && (
                  <p className="text-lg text-navy mb-6">
                    Class CRN: {user.class}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-lg border-4 border-northeasternBlack p-8 mb-8">
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-northeasternRed border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-northeasternRed rounded-full opacity-20 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-navy mb-4">
                      Waiting for Teacher to allow Start
                    </h2>
                    <Facts />
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Authorization Received State
            <div className="bg-white rounded-lg shadow-lg border-4 border-green-500 p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg text-gray-700 mb-4">
                  Your teacher has enabled the activity!
                </p>
                <p className="text-md text-gray-600 mb-6">
                  Redirecting you to the dashboard...
                </p>
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full flex justify-center p-2 bg-navy/90 backdrop-blur-sm shadow-md font-rubik text-2xl z-20">
        <a
          className="flex items-center text-wood hover:text-blue-300 transition-colors duration-200"
          href="https://discord.com/invite/jyvzqyJHy6"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image src="/discord.svg" alt="Discord icon" width={25} height={25} />
          <span className="ml-2">Join our Discord</span>
        </a>
      </footer>

      {/* Popup */}
      {popup && (
        <Popup
          headline={popup.headline}
          message={popup.message}
          onDismiss={() => setPopup(null)}
        />
      )}
    </div>
  );
}