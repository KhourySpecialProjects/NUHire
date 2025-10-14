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
    class_id?: number;
    group_id?: number;
  }

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const [groupAssignmentAllowed, setGroupAssignmentAllowed] = useState(false);
  const router = useRouter();
  const socket = io(API_BASE_URL);

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
        console.error("Error fetching user:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    console.log("User data:", user);
  }, [user]);

  // Socket connection for listening to teacher's group assignment authorization
  useEffect(() => {
    if (!user?.class_id) return;

    socket.emit('joinClass', { 
      classId: user.class_id,
    });

    // Listen for group assignment authorization from teacher
    socket.on('allowGroupAssignment', ({classId, message}) => {
      console.log('Received group assignment authorization:', );
      
      // Check if this authorization is for the current user's class
      if (classId === user.class_id) {

        setGroupAssignmentAllowed(true);
        setPopup({
          headline: "Group Assignment Available!",
          message: "Your teacher has enabled group selection. You can now choose your group!"
        });
        
        // Redirect to group assignment page after a short delay
        setTimeout(() => {
          router.push("/assignGroup");
        }, 3000);
      }
    });

    // Listen for any other relevant events
    socket.on('groupAssignmentClosed', ({classId, message}) => {
      if (classId === user.class_id) {
        setGroupAssignmentAllowed(false);
        setPopup({
          headline: "Group Assignment Closed",
          message: "The teacher has closed group selection for now."
        });
      }
    });

    // Cleanup socket connection
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
          
          {!groupAssignmentAllowed ? (
            // Waiting State
            <>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-northeasternRed mb-4">
                  Waiting for Teacher
                </h1>
                <p className="text-xl text-northeasternBlack mb-4">
                  Hello, {user.f_name} {user.l_name}!
                </p>
                {user.class_id && (
                  <p className="text-lg text-navy mb-6">
                    Class CRN: {user.class_id}
                  </p>
                )}
              </div>

              {/* Waiting Animation and Message */}
              <div className="bg-white rounded-lg shadow-lg border-4 border-northeasternBlack p-8 mb-8">
                <div className="flex flex-col items-center space-y-6">
                  {/* Animated waiting icon */}
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-northeasternRed border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-northeasternRed rounded-full opacity-20 animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-navy mb-4">
                      Waiting for Group Assignment Authorization
                    </h2>
                    <p className="text-lg text-gray-700 mb-4">
                      Your teacher needs to enable group selection before you can choose your group.
                    </p>
                    <p className="text-md text-gray-600">
                      Please wait while your teacher prepares the group assignment process...
                    </p>
                  </div>
                </div>
              </div>

              {/* Information Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-blue-800 mb-3">
                  What happens next?
                </h3>
                <div className="text-left space-y-2 text-blue-700">
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    Your teacher will create groups for the class
                  </p>
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    Once ready, you'll receive authorization to select a group
                  </p>
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    You'll be automatically redirected to group selection
                  </p>
                  <p className="flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                    Choose your preferred group and teammates
                  </p>
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
                <h2 className="text-2xl font-bold text-green-700 mb-4">
                  Group Assignment Authorized!
                </h2>
                <p className="text-lg text-gray-700 mb-4">
                  Your teacher has enabled group selection.
                </p>
                <p className="text-md text-gray-600 mb-6">
                  Redirecting you to group selection page...
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