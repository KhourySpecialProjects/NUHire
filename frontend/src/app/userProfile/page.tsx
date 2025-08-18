"use client";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
import { useState, useEffect } from "react";
import Navbar from "../components/navbar";
import NavbarAdmin from "../components/navbar-admin";
import { useRouter } from "next/navigation";

interface User {
    id: number;
    f_name: string;
    l_name: string;
    email: string;
    affiliation: string;
    group_id?: number;
    class?: number;
}

interface ClassItem {
  id: number;
  name: string;
}

export default function UserProfile() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);  
    const router = useRouter();
  
    useEffect(() => {
      const fetchUser = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
          const userData = await response.json();
  
          if (response.ok) {
            setUser(userData);
            if (userData.class) {
              setSelectedClass(userData.class.toString());
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

    // Fetch available classes
    useEffect(() => {
      const fetchClasses = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/classes`);
          const data = await response.json();
          setClasses(data);
        } catch (error) {
          console.error("Error fetching classes:", error);
        }
      };

      fetchClasses();
    }, []);

    const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedClass(e.target.value);
    };

    const updateClass = async () => {
      if (!selectedClass) {
        alert("Please select a class");
        return;
      }

      setIsUpdating(true);
      setUpdateSuccess(false);

      try {
        const response = await fetch(`${API_BASE_URL}/update-user-class`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: user!.email,
            class: selectedClass
          }),
        });

        if (response.ok) {
          setUpdateSuccess(true);
          // Update the user state with the new class
          setUser(prev => prev ? { ...prev, class: parseInt(selectedClass, 10) } : prev);
        } else {
          alert("Failed to update class. Please try again.");
        }
      } catch (error) {
        console.error("Error updating class:", error);
        alert("An error occurred while updating your class.");
      } finally {
        setIsUpdating(false);
      }
    };

    const handleLogout = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          credentials: "include", // Ensures cookies clear if using sessions
        });
    
        if (response.ok) {
          router.push("/"); // Redirect to home page
        } else {
          console.error("Failed to logout:", response.statusText);
        }
      } catch (error) {
        console.error("Error logging out:", error);
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

    return (
      <div>
        {user?.affiliation !== "admin" ? <Navbar /> : <NavbarAdmin />}
        <div className="bg-sand flex flex-col items-center justify-center p-6 min-h-screen">
      
          <div className="bg-norteasternWhite p-8 rounded-2xl shadow-lg w-full max-w-lg border-2 border-black">
            <h1 className="text-4xl font-bold mb-4 text-northeasternRed text-center">User Profile</h1>
            
            {user && (
              <div className="space-y-6">
                <div className="bg-northeasternWHite p-4 rounded-lg border border-black">
                  <h2 className="text-xl font-semibold text-northeasternRed mb-2">Personal Information</h2>
                  <p className="text-black"><span className="font-semibold">Name:</span> {user.f_name} {user.l_name}</p>
                  <p className="text-black"><span className="font-semibold">Email:</span> {user.email}</p>
                  <p className="text-black"><span className="font-semibold">Role:</span> {user.affiliation}</p>
                  {user.group_id && (
                    <p className="text-black"><span className="font-semibold">Group:</span> {user.group_id}</p>
                  )}
                  {user.class && (
                    <p className="text-black"><span className="font-semibold">Class:</span> {user.class}</p>
                  )}
                </div>
                
                {user.affiliation === "student" && (
                  <div className="bg-springWater p-4 rounded-lg border border-black">
                    <h2 className="text-xl font-semibold text-northeasternRed mb-2">Update Class</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-black mb-1">Select Class</label>
                        <select 
                          value={selectedClass}
                          onChange={handleClassChange}
                          className="w-full p-2 border border-black rounded-md focus:outline-none focus:ring-2"
                        >
                          <option value="">Select a class</option>
                          {classes.map(classItem => (
                            <option key={classItem.id} value={classItem.id}>
                              {classItem.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <button
                        onClick={updateClass}
                        disabled={isUpdating || !selectedClass}
                        className={`w-full py-2 rounded-md font-semibold text-white border border-black
                          ${isUpdating || !selectedClass 
                            ? "bg-gray-400 cursor-not-allowed" 
                            : "bg-wood text-navy hover:opacity-90"}`}
                      >
                        {isUpdating ? "Updating..." : "Update Class"}
                      </button>
                      
                      {updateSuccess && (
                        <div className="bg-green-100 text-green-700 p-2 rounded-md text-center border border-black">
                          Class updated successfully!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
      
            <button
              onClick={handleLogout}
              className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 transition-all duration-300 rounded-lg shadow-md text-white font-semibold text-lg w-full border border-black"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
}