'use client';
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { io } from "socket.io-client";
import Slideshow from "../components/slideshow";
import Popup from "../components/popup";

export default function WaitingGroupPage() {
  interface User {
    f_name: string;
    l_name: string;
    email: string;
    class?: number; // FIXED: Use 'class' instead of 'class_id'
    group_id?: number;
  }

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const [start, setStart] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false); // Added for debugging
  const router = useRouter();

  // Fetch user information
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await response.json();

        if (response.ok) {
          setUser(userData);
          // If user already has a group, redirect to dashboard
          if (userData.group_id) {
            router.push("/dashboard");
            return;
          }
        } else {
          setUser(null);
          router.push("/");
        }
      } catch (error) {
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // Socket connection for listening to teacher's group assignment authorization
  useEffect(() => {
    if (!user?.class) {
      return;
    }

    const socket = io(API_BASE_URL);

    // Handle connection
    socket.on('connect', () => {
      setSocketConnected(true);
      
      // FIXED: Join class room after connection
      socket.emit('joinClass', { 
        classId: user.class,
      });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      setSocketConnected(false);
    });

    // Listen for group assignment authorization from teacher
    socket.on('allowGroupAssignmentStudent', ({classId, message}) => {
      
      // FIXED: Compare with user.class instead of user.class_id
      if (classId === user.class) {
        setStart(true);
        
        // Redirect to group assignment page after a short delay
        setTimeout(() => {
          router.push("/assignGroup");
        }, 3000);
      } else {
      }
    });

    // Listen for any other relevant events
    socket.on('groupAssignmentClosedStudent', ({classId, message}) => {
      
      if (classId === user.class) {
        setStart(false);
      }
    });

    // FIXED: Cleanup socket connection properly
    return () => {
      socket.disconnect();
    };
  }, [user, router]);

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
                  Hello, {user.f_name} {user.l_name}!
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
                    <p className="text-lg text-gray-700 mb-4">
                      Your teacher needs to enable your group to begin.
                    </p>
                    <p className="text-md text-gray-600">
                      Please wait while your teacher prepares...
                    </p>
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
          href="https://discord.gg/XNjg2VMR"
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