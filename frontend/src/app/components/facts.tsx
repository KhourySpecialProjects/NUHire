"use client";
import React, { useEffect, useState } from "react";
import { useSocket } from "./socketContext";
import { useAuth } from "./AuthContext";

const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

interface Fact {
  fact: string;
}


const Facts: React.FC = () => {
  const {user, loading: userloading} = useAuth();
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  useEffect(() => { 
    console.log("user changed", user)
  }, [user]);

  const fetchFacts = async () => {
    console.log("Fetching facts...");
    console.log ("User in fetchFacts:", user);

    const factsUrl = `${API_BASE_URL}/facts/get/${user?.class}`;
    try {
      const factsRes = await fetch(factsUrl, { credentials: "include", method: "GET" });
      console.log("Facts response:", factsRes);
      if (factsRes.ok) {
        const factsData = await factsRes.json();

        const factsArray = ["one", "two", "three"]
          .map(key => factsData[key])
          .filter(fact => fact && fact.trim());

        setFacts(factsArray.map(fact => ({ fact })));
      } else {
        console.warn("Facts fetch failed:", factsRes.status, await factsRes.text());
      }
    } catch (error) {
      console.error("Error fetching facts:", error);
    }
  };

 useEffect(() => {
    if (!socket || !user?.class || !user?.group_id) return;

    const handleNewFacts = () => {
      fetchFacts();
    };

    const roomId = `class_${user.class}`;
    socket.emit("joinGroup", roomId);

    socket.on("factsUpdated", handleNewFacts);

    return () => {
      socket.off("factsUpdated", handleNewFacts);
    };
  }, [socket, user]);

  useEffect(() => {
    fetchFacts();
  }, [user]);

  if (userloading || loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading fun facts...
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto my-6">
      <h2 className="text-2xl font-bold text-northeasternRed mb-4 text-center">Waiting Facts</h2>
      <ul className="space-y-4">
        {facts.map((fact, index) => (
          <li key={index} className="text-lg text-navy font-medium">
            {fact.fact}
          </li>
        ))}
      </ul>
      {facts.length === 0 && (
        <div className="text-center text-gray-400 mt-4">No facts available for your group/class.</div>
      )}
    </div>
  );
};

export default Facts;