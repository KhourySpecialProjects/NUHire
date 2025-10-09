'use client';
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavbarAdmin from "../components/navbar-admin";
import { io } from "socket.io-client";
import Popup from "../components/popup";

const OffersManagement = () => {
  interface Offer {
    id: number;
    class_id: number;
    group_id: number;
    candidate_id: number;
    status: 'pending' | 'accepted' | 'rejected';
  }

  // General state
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [user, setUser] = useState<{ affiliation: string; email?: string; [key: string]: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const router = useRouter();
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  
  // Offers state
  const [offersTabClass, setOffersTabClass] = useState("");
  const [pendingOffers, setPendingOffers] = useState<Offer[]>([]);
  const [acceptedOffers, setAcceptedOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  const refreshOffers = async (classId?: string) => {
    const targetClassId = classId || offersTabClass;
    if (!targetClassId) {
      console.log("No class selected for offers refresh");
      return;
    }

    setOffersLoading(true);
    try {
      console.log(`Refreshing offers for class ${targetClassId}`);
      const response = await fetch(`${API_BASE_URL}/offers/class/${targetClassId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch offers: ${response.statusText}`);
      }

      const offers: Offer[] = await response.json();
      console.log("Fetched offers:", offers);

      // Filter offers by status
      const pending = offers.filter(offer => offer.status === 'pending');
      const accepted = offers.filter(offer => offer.status === 'accepted');
      
      setPendingOffers(pending);
      setAcceptedOffers(accepted);
            
    } catch (error) {
      console.error('Error refreshing offers:', error);
      setPopup({
        headline: "Error",
        message: "Failed to refresh offers. Please try again."
      });
      
      // Clear offers on error
      setPendingOffers([]);
      setAcceptedOffers([]);
    } finally {
      setOffersLoading(false);
    }
  };

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await response.json();
        if (response.ok) setUser(userData);
        else { setUser(null); router.push("/"); }
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // Admin socket setup
  useEffect(() => {
    if (!user || user.affiliation !== "admin") return;

    const socketUpdate = io(API_BASE_URL);

    console.log(user);

    socketUpdate.emit("adminOnline", { adminEmail: user.email });

    const onRequest = (data: { classId: number; groupId: number; candidateId: number }) => {
      refreshOffers();
      console.log("Received offer request:", data);
      
      // If we're currently viewing offers for this class, refresh them
      if (offersTabClass && Number(offersTabClass) === data.classId) {
        console.log("New offer request for current class, refreshing...");
        refreshOffers();
      }
    };
    
    const onResponse = (data: { classId: number; groupId: number; candidateId: number; accepted: boolean }) => {
      console.log("Received offer response:", data);
      
      // If we're currently viewing offers for this class, refresh them
      if (offersTabClass && Number(offersTabClass) === data.classId) {
        console.log("Offer response for current class, refreshing...");
        refreshOffers();
      }
    };

    socketUpdate.on("makeOfferRequest", onRequest);
    socketUpdate.on("makeOfferResponse", onResponse);

    return () => {
      socketUpdate.off("makeOfferRequest", onRequest);
      socketUpdate.off("makeOfferResponse", onResponse);
      socketUpdate.disconnect();
    };
  }, [user, offersTabClass]);

  // Updated respond to offer function
  const respondToOffer = async (offerId: number, classId: number, groupId: number, candidateId: number, accepted: boolean) => {
    try {
      console.log(`Responding to offer ${offerId}: ${accepted ? 'ACCEPT' : 'REJECT'}`);
      
      // Update database first
      const response = await fetch(`${API_BASE_URL}/offers/${offerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: accepted ? 'accepted' : 'rejected'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update offer in database');
      }

      console.log("Database updated successfully");

      // Emit socket response
      const socketOffer = io(API_BASE_URL);
      socketOffer.emit("makeOfferResponse", { classId, groupId, candidateId, accepted });
      
      console.log("Socket response emitted");

      // Refresh offers to show updated status
      await refreshOffers();

      setPopup({
        headline: "Success",
        message: `Offer ${accepted ? 'accepted' : 'rejected'} successfully!`
      });

    } catch (error) {
      console.error('Error responding to offer:', error);
      setPopup({
        headline: "Error",
        message: "Failed to respond to offer. Please try again."
      });
    }
  };

  // Refresh offers when class changes
  useEffect(() => {
    if (offersTabClass) {
      console.log(`Class changed to ${offersTabClass}, refreshing offers...`);
      refreshOffers(offersTabClass);
    } else {
      // Clear offers when no class is selected
      setPendingOffers([]);
      setAcceptedOffers([]);
    }
  }, [offersTabClass]);

  // Fetch assigned classes
  useEffect(() => {
    if (user?.email && user.affiliation === "admin") {
      fetch(`${API_BASE_URL}/moderator-classes-full/${user.email}`)
        .then(res => res.json())
        .then((data) => {
          setAssignedClassIds(data.map((item: any) => String(item.crn)));
          setClasses(data.map((item: any) => ({
            id: item.crn,
            name: `CRN ${item.crn} - (${item.nom_groups} groups)`
          })));
        });
    }
  }, [user]);

  // Handler for class selection
  const handleOffersTabClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOffersTabClass(e.target.value);
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

  if (!user || user.affiliation !== "admin") {
    return <div>This account is not authorized for this page</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-sand font-rubik">
      <NavbarAdmin />
      <div className="flex-1 p-6 flex justify-center items-start">
        <div className="max-w-6xl w-full"> 
          <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-6">
            <div className="grid grid-cols-3 items-center mb-6">
            <div></div>
            <h1 className="text-3xl font-bold text-northeasternRed text-center">Offers Management</h1>
            <div className="flex justify-end">
                {offersTabClass && (
                <button
                    onClick={() => refreshOffers()}
                    disabled={offersLoading}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                    {offersLoading ? "Refreshing..." : "Refresh"}
                </button>
                )}
            </div>
        </div>
            {/* Class Selection - Centered */}
            <div className="mb-8 flex flex-col items-center">
              <label className="block text-navy font-semibold mb-3 text-lg text-center">
                Select Class to View Offers
              </label>
              <select
                value={offersTabClass}
                onChange={handleOffersTabClassChange}
                className="w-full max-w-md p-3 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {offersLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-12 h-12 border-t-4 border-navy border-solid rounded-full animate-spin mb-4"></div>
                <p className="text-navy font-medium text-lg">Loading offers...</p>
              </div>
            ) : !offersTabClass ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-northeasternBlack font-medium text-lg">Please select a class to view offers</p>
                <p className="text-gray-500 text-base mt-2">Offers will appear here after selecting a class</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Pending Offers */}
                <div>
                  <h2 className="text-2xl font-semibold text-navy mb-4 flex items-center justify-center"> 
                    Pending Offers 
                    <span className="ml-3 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-lg">
                      {pendingOffers.length}
                    </span>
                  </h2>
                  {pendingOffers.length > 0 ? (
                    <div className="flex justify-center"> 
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl"> 
                        {pendingOffers.map((offer) => (
                          <div
                            key={offer.id}
                            className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg shadow-md"
                          >
                            <div className="mb-4 text-center"> 
                              <h3 className="text-lg font-semibold text-navy">
                                Group {offer.group_id} → Candidate {offer.candidate_id}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Offer ID: {offer.id} | Status: {offer.status}
                              </p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex space-x-3">
                              <button
                                onClick={() => respondToOffer(offer.id, offer.class_id, offer.group_id, offer.candidate_id, true)}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => respondToOffer(offer.id, offer.class_id, offer.group_id, offer.candidate_id, false)}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center"> 
                      <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center max-w-md"> 
                        <p className="text-gray-600 text-lg">No pending offers for this class</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accepted Offers */}
                <div>
                  <h2 className="text-2xl font-semibold text-green-700 mb-4 flex items-center justify-center"> 
                    Accepted Offers 
                    <span className="ml-3 bg-green-100 text-green-800 px-3 py-1 rounded-full text-lg">
                      {acceptedOffers.length}
                    </span>
                  </h2>
                  {acceptedOffers.length > 0 ? (
                    <div className="flex justify-center"> 
                      <div className="space-y-3 w-full max-w-4xl"> 
                        {acceptedOffers.map((offer) => (
                          <div
                            key={offer.id}
                            className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center justify-between shadow-sm"
                          >
                            <div className="text-center flex-1"> 
                              <h3 className="font-semibold text-green-800 text-lg">
                                Group {offer.group_id} → Candidate {offer.candidate_id}
                              </h3>
                              <p className="text-sm text-green-600 mt-1">
                                Status: Accepted | Offer ID: {offer.id}
                              </p>
                            </div>
                            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium ml-4"> 
                              ✓ Accepted
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center"> 
                      <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center max-w-md"> 
                        <p className="text-gray-600 text-lg">No accepted offers for this class</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
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

export default OffersManagement;