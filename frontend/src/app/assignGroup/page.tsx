'use client';
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Slideshow from "../components/slideshow";
import Popup from "../components/popup";

export default function AssignGroupPage() { // FIXED: Changed function name
  interface User {
    f_name: string;
    l_name: string;
    email: string;
    class?: number; // FIXED: Use 'class' instead of 'class_id'
    group_id?: number;
  }

  interface GroupSlot {
    group_id: number;
    occupied_slots: number;
    max_slots: number;
    students: Array<{
      f_name: string;
      l_name: string;
      email: string;
    }>;
  }

  interface ClassInfo {
    crn: number;
    nom_groups: number;
    slots_per_group: number;
  }

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupSlots, setGroupSlots] = useState<GroupSlot[]>([]);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const [joining, setJoining] = useState<number | null>(null);
  const router = useRouter();

  // Fetch user information
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await response.json();

        console.log("Raw user data from API:", userData); // DEBUG

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

  // Fetch class info and group slots
  useEffect(() => {
    const fetchGroupSlots = async () => {
      // FIXED: Use user.class instead of user.class_id
      if (!user?.class) {
        console.log("No class found for user:", user);
        return;
      }

      try {
        console.log("Fetching group slots for class:", user.class); // DEBUG

        // FIXED: Use the existing group-slots endpoint
        const groupSlotsResponse = await fetch(`${API_BASE_URL}/group-slots/${user.class}`);
        if (groupSlotsResponse.ok) {
          const groupSlotsData = await groupSlotsResponse.json();
          console.log("Group slots data:", groupSlotsData); // DEBUG
          setGroupSlots(groupSlotsData);
        } else {
          console.error("Failed to fetch group slots");
          setPopup({
            headline: "Error",
            message: "Failed to load group slots. Please try again."
          });
        }

        // Fetch class information
        const classResponse = await fetch(`${API_BASE_URL}/class-info/${user.class}`);
        if (classResponse.ok) {
          const classData = await classResponse.json();
          console.log("Class info data:", classData); // DEBUG
          setClassInfo(classData);
        } else {
          console.error("Failed to fetch class info");
        }

      } catch (error) {
        console.error("Error fetching group slots:", error);
        setPopup({
          headline: "Error",
          message: "Failed to load group information. Please try again."
        });
      }
    };

    if (user?.class) {
      fetchGroupSlots();
    }
  }, [user]);

  // Join a group
  const joinGroup = async (groupId: number) => {
    if (!user) return;

    setJoining(groupId);

    try {
      const response = await fetch(`${API_BASE_URL}/student/join-group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: user.email,
          class_id: user.class, // FIXED: Use user.class
          group_id: groupId,
        }),
      });

      if (response.ok) {
        setPopup({
          headline: "Success!",
          message: `You have successfully joined Group ${groupId}!`
        });
        
        // Update user state
        setUser(prev => prev ? { ...prev, group_id: groupId } : null);
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        const errorData = await response.json();
        setPopup({
          headline: "Error",
          message: errorData.error || "Failed to join group. Please try again."
        });
      }
    } catch (error) {
      console.error("Error joining group:", error);
      setPopup({
        headline: "Error",
        message: "Failed to join group. Please try again."
      });
    } finally {
      setJoining(null);
    }
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sand">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to continue</h2>
        </div>
      </div>
    );
  }

  // FIXED: Check for user.class instead of user.class_id
  if (!user.class) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sand">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Class Assigned</h2>
          <p className="text-lg text-gray-700">Please contact your teacher to be assigned to a class.</p>
          <div className="mt-4 p-4 bg-gray-100 rounded text-left text-sm">
            <p><strong>Debug Info:</strong></p>
            <p>User: {JSON.stringify(user)}</p>
          </div>
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
      <div className="z-10 flex flex-col items-center relative flex-grow p-8 overflow-y-auto">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-northeasternRed mb-4">
              Choose Your Group
            </h1>
            <p className="text-xl text-northeasternBlack mb-2">
              Welcome, {user.f_name} {user.l_name}!
            </p>
            {classInfo && (
              <p className="text-lg text-navy">
                Class CRN {classInfo.crn} - {classInfo.nom_groups} groups available
              </p>
            )}
          </div>

          {/* Debug Info - Remove in production */}
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4 text-sm text-left">
            <h4 className="font-semibold mb-2">🐛 Debug Info:</h4>
            <p>User Class: {user.class || 'Not assigned'}</p>
            <p>Group Slots Length: {groupSlots.length}</p>
            <p>Class Info: {classInfo ? JSON.stringify(classInfo) : 'Not loaded'}</p>
            <p>Group Slots: {JSON.stringify(groupSlots)}</p>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {groupSlots.length > 0 ? (
              groupSlots.map((group) => (
                <div
                  key={group.group_id}
                  className="bg-white rounded-lg shadow-lg border-4 border-northeasternBlack p-6"
                >
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-northeasternRed mb-2">
                      Group {group.group_id}
                    </h2>
                    <div className="flex justify-center items-center space-x-2">
                      <span className="text-navy font-semibold">
                        {group.occupied_slots}/{group.max_slots} slots filled
                      </span>
                      <div className="flex space-x-1">
                        {Array.from({ length: group.max_slots }, (_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full ${
                              i < group.occupied_slots 
                                ? 'bg-northeasternRed' 
                                : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Current Members */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-navy mb-2">Current Members:</h3>
                    {group.students.length > 0 ? (
                      <ul className="space-y-1">
                        {group.students.map((student, index) => (
                          <li key={index} className="text-sm text-gray-700 bg-gray-100 p-2 rounded">
                            {student.f_name} {student.l_name}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No members yet</p>
                    )}
                  </div>

                  {/* Available Slots */}
                  {group.occupied_slots < group.max_slots && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-green-600 mb-2">
                        Available Slots:
                      </h3>
                      <div className="space-y-1">
                        {Array.from({ 
                          length: group.max_slots - group.occupied_slots 
                        }, (_, i) => (
                          <div key={i} className="text-sm text-green-600 bg-green-50 p-2 rounded border-2 border-dashed border-green-300">
                            Open Slot #{group.occupied_slots + i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Join Button */}
                  <div className="text-center">
                    {group.occupied_slots < group.max_slots ? (
                      <button
                        onClick={() => joinGroup(group.group_id)}
                        disabled={joining === group.group_id}
                        className={`w-full py-3 px-4 rounded-md font-bold text-white transition ${
                          joining === group.group_id
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-northeasternRed hover:bg-navy'
                        }`}
                      >
                        {joining === group.group_id ? 'Joining...' : 'Join This Group'}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3 px-4 rounded-md font-bold text-white bg-gray-400 cursor-not-allowed"
                      >
                        Group Full
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center">
                <p className="text-lg text-gray-600">No groups available. Please contact your teacher.</p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow-lg border-4 border-northeasternBlack p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-northeasternRed mb-4 text-center">
              How to Choose Your Group
            </h2>
            <div className="grid md:grid-cols-2 gap-4 text-navy">
              <div>
                <h3 className="font-semibold mb-2">📋 What You'll See:</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Current group members</li>
                  <li>• Available slots in each group</li>
                  <li>• Total capacity per group</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">🎯 How to Join:</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Click "Join This Group" on your preferred group</li>
                  <li>• You'll be automatically assigned to that group</li>
                  <li>• Once joined, you'll proceed to the dashboard</li>
                </ul>
              </div>
            </div>
          </div>
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