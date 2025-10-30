'use client';
const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NavbarAdmin from "../components/navbar-admin";
import { useSocket } from "../components/socketContext";
import Popup from "../components/popup";

const OffersManagement = () => {
  interface Offer {
    id: number;
    class_id: number;
    group_id: number;
    candidate_id: number;
    status: 'pending' | 'accepted' | 'rejected';
    candidate_name?: string; // Add optional candidate name field
  }

  interface Candidate {
    id: number;
    f_name: string;
    l_name: string;
    name?: string;
  }

  // General state
  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [user, setUser] = useState<{ affiliation: string; email?: string; [key: string]: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const router = useRouter();
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const socket = useSocket();
  
  // Offers state
  const [offersTabClass, setOffersTabClass] = useState("");
  const [pendingOffers, setPendingOffers] = useState<Offer[]>([]);
  const [acceptedOffers, setAcceptedOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Function to fetch candidate names
  const fetchCandidates = async (classId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/candidates/by-class/${classId}`, { credentials: "include" });
      if (response.ok) {
        const candidatesData = await response.json();
        const formattedCandidates = candidatesData.map((candidate: any) => ({
          id: candidate.id || candidate.resume_id,
          f_name: candidate.f_name,
          l_name: candidate.l_name,
          name: `${candidate.f_name} ${candidate.l_name}`
        }));
        setCandidates(formattedCandidates);
        return formattedCandidates;
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
    return [];
  };

  // Function to get candidate name by ID
  const getCandidateName = (candidateId: number, candidatesList: Candidate[]) => {
    const candidate = candidatesList.find(c => c.id === candidateId);
    return candidate ? candidate.name : `Candidate ${candidateId}`;
  };

  const refreshOffers = async (classId?: string) => {
    const targetClassId = classId || offersTabClass;
    if (!targetClassId) {
      console.log("No class selected for offers refresh");
      return;
    }

    setOffersLoading(true);
    try {
      console.log(`Refreshing offers for class ${targetClassId}`);
      
      // Fetch both offers and candidates
      const [offersResponse, candidatesData] = await Promise.all([
        fetch(`${API_BASE_URL}/offers/class/${targetClassId}`, { credentials: "include" }),
        fetchCandidates(targetClassId)
      ]);
      
      if (!offersResponse.ok) {
        throw new Error(`Failed to fetch offers: ${offersResponse.statusText}`);
      }

      const offers: Offer[] = await offersResponse.json();
      console.log("Fetched offers:", offers);

      // Add candidate names to offers
      const offersWithNames = offers.map(offer => ({
        ...offer,
        candidate_name: getCandidateName(offer.candidate_id, candidatesData)
      }));

      // Filter offers by status
      const pending = offersWithNames.filter(offer => offer.status === 'pending');
      const accepted = offersWithNames.filter(offer => offer.status === 'accepted');
      
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

  useEffect(() => {
    if (!socket || !user || user.affiliation !== "admin") return;

    console.log(user);

    socket.emit("adminOnline", { adminEmail: user.email });

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

    socket.on("makeOfferRequest", onRequest);
    socket.on("makeOfferResponse", onResponse);

    return () => {
      socket.off("makeOfferRequest", onRequest);
      socket.off("makeOfferResponse", onResponse);
      // Don't disconnect - the context manages the connection
    };
  }, [socket, user, offersTabClass]);

  // Updated respond to offer function
  const respondToOffer = async (
    offerId: number, 
    classId: number, 
    groupId: number, 
    candidateId: number, 
    accepted: boolean, 
    candidateName?: string
  ) => {
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
        }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error('Failed to update offer in database');
      }

      console.log("Database updated successfully");

      // Use the shared socket from context
      if (!socket) {
        throw new Error('Socket not connected');
      }

      socket.emit("makeOfferResponse", { classId, groupId, candidateId, accepted });
      
      console.log("Socket response emitted");

      // Refresh offers to show updated status
      await refreshOffers();

      const candidateDisplayName = candidateName || `Candidate ${candidateId}`;
      setPopup({
        headline: "Success",
        message: `Offer for ${candidateDisplayName} ${accepted ? 'accepted' : 'rejected'} successfully!`
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
      fetch(`${API_BASE_URL}/moderator/classes-full/${user.email}`, { credentials: "include" })
        .then(res => res.json())
        .then((data) => {
          setAssignedClassIds(data.map((item: any) => String(item.crn)));
          setClasses(data.map((item: any) => ({
            id: item.crn,
            name: `CRN ${item.crn}`
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
      
      {/* Page Title */}
      <div className="flex justify-center items-center py-6">
        <h1 className="text-4xl font-bold text-northeasternBlack text-center drop-shadow-lg">
          Candidate Offers
        </h1>
      </div>

      <div className="flex-1 p-6 flex justify-center items-start">
        <div className="max-w-2xl w-full">
          <div className="border-4 border-northeasternBlack bg-northeasternWhite rounded-lg p-6">
            <div className="grid grid-cols-3 items-center mb-6">
              <div></div>
              <h2 className="text-2xl font-bold text-northeasternRed text-center">Offers Management</h2>
              <div className="flex justify-end">
                {offersTabClass && (
                  <button
                    onClick={() => refreshOffers()}
                    disabled={offersLoading}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-3 py-2 rounded-md font-medium transition-colors text-sm"
                  >
                    {offersLoading ? "Refreshing..." : "Refresh"}
                  </button>
                )}
              </div>
            </div>
            
            {/* Class Selection - Centered */}
            <div className="mb-6 flex flex-col items-center">
              <label className="block text-navy font-semibold mb-2 text-base text-center">
                Select Class to View Offers
              </label>
              <select
                value={offersTabClass}
                onChange={handleOffersTabClassChange}
                className="w-full max-w-sm p-2 border border-wood bg-springWater rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="w-10 h-10 border-t-4 border-navy border-solid rounded-full animate-spin mb-3"></div>
                <p className="text-navy font-medium text-base">Loading offers...</p>
              </div>
            ) : !offersTabClass ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-northeasternBlack font-medium text-base">Please select a class to view offers</p>
                <p className="text-gray-500 text-sm mt-2">Offers will appear here after selecting a class</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pending Offers */}
                <div>
                  <h3 className="text-xl font-semibold text-navy mb-3 flex items-center justify-center">
                    Pending Offers 
                    <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-base">
                      {pendingOffers.length}
                    </span>
                  </h3>
                  {pendingOffers.length > 0 ? (
                    <div className="flex flex-col items-center w-full">
                      {pendingOffers.length === 1 ? (
                        // Single offer - centered
                        <div className="w-full max-w-sm">
                          {pendingOffers.map((offer) => (
                            <div
                              key={offer.id}
                              className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg shadow-md"
                            >
                              <div className="mb-3 text-center">
                                <h4 className="text-base font-semibold text-navy">
                                  Group {offer.group_id} → {offer.candidate_name}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  Offer ID: {offer.id} | Status: {offer.status}
                                </p>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => respondToOffer(offer.id, offer.class_id, offer.group_id, offer.candidate_id, true, offer.candidate_name)}
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md font-medium transition-colors text-sm"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => respondToOffer(offer.id, offer.class_id, offer.group_id, offer.candidate_id, false, offer.candidate_name)}
                                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md font-medium transition-colors text-sm"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Multiple offers - grid layout
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                          {pendingOffers.map((offer) => (
                            <div
                              key={offer.id}
                              className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg shadow-md"
                            >
                              <div className="mb-3 text-center">
                                <h4 className="text-base font-semibold text-navy">
                                  Group {offer.group_id} → {offer.candidate_name}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  Offer ID: {offer.id} | Status: {offer.status}
                                </p>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => respondToOffer(offer.id, offer.class_id, offer.group_id, offer.candidate_id, true, offer.candidate_name)}
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md font-medium transition-colors text-sm"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => respondToOffer(offer.id, offer.class_id, offer.group_id, offer.candidate_id, false, offer.candidate_name)}
                                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md font-medium transition-colors text-sm"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-center"> 
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center max-w-sm">
                        <p className="text-gray-600 text-base">No pending offers for this class</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accepted Offers */}
                <div>
                  <h3 className="text-xl font-semibold text-green-700 mb-3 flex items-center justify-center">
                    Accepted Offers 
                    <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-base">
                      {acceptedOffers.length}
                    </span>
                  </h3>
                  {acceptedOffers.length > 0 ? (
                    <div className="flex justify-center"> 
                      <div className="space-y-2 w-full max-w-2xl">
                        {acceptedOffers.map((offer) => (
                          <div
                            key={offer.id}
                            className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center justify-between shadow-sm"
                          >
                            <div className="text-center flex-1"> 
                              <h4 className="font-semibold text-green-800 text-base">
                                Group {offer.group_id} → {offer.candidate_name}
                              </h4>
                              <p className="text-xs text-green-600 mt-1">
                                Status: Accepted | Offer ID: {offer.id}
                              </p>
                            </div>
                            <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium ml-3">
                              ✓ Accepted
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center"> 
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center max-w-sm">
                        <p className="text-gray-600 text-base">No accepted offers for this class</p>
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