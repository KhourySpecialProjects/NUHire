'use client';
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavbarAdmin from "../components/navbar-admin";
import Tabs from "../components/tabs";
import Popup from "../components/popup";
import { StudentCSVTab } from "../components/StudentCSVTab";
import { ManageGroupsTab } from "../components/ManageGroupsTab";
import { useAuth } from "../components/AuthContext"; 

const Grouping = () => {
  interface Student {
    f_name: string;
    l_name: string;
    email: string;
  }

  interface Offer {
    id: number;
    class_id: number;
    group_id: number;
    candidate_id: number;
    status: 'pending' | 'accepted' | 'rejected';
  }

  // General state
  const [user, setUser] = useState<{ affiliation: string; email?: string; [key: string]: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user: authUser, loading: userloading } = useAuth();
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);


  if (userloading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-sand">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          <div className="w-16 h-16 border-t-4 border-navy border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user || user.affiliation !== "admin") {
    return <div>This account is not authorized for this page</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-sand font-rubik">
      <NavbarAdmin />
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        <Tabs>
          <div title="Manage Groups">
            <div className="w-full max-h-[calc(100vh-200px)] overflow-y-auto border-4 border-northeasternBlack rounded-lg">
              <ManageGroupsTab />
            </div>
          </div>

          <div title="CSV Group Assignment">
            <div className="w-full max-h-[calc(100vh-200px)] overflow-y-auto border-4 border-northeasternBlack rounded-lg">
              <StudentCSVTab />
            </div>
          </div>

        </Tabs>
      </div>
      
      
      {popup && (
        <Popup
          headline={popup.headline}
          message={popup.message}
          onDismiss={() => setPopup(null)}
        />
      )}
    </div>
  );
};

export default Grouping;