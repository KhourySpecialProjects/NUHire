"use client";
import React, { useEffect, useState } from "react";

const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

interface Fact {
  fact: string;
}

interface User {
  group_id?: number;
  class_id?: number;
}

const Facts: React.FC = () => {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUserAndFacts = async () => {
      try {
        // Fetch user first
        console.log("Fetching user info...");
        const userRes = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await userRes.json();
        console.log("User fetch response status:", userRes.status);
        console.log("User data:", userData);
        setUser(userData);

        // Only fetch facts if user has group_id and class_id
        if (userRes.ok && userData.group_id && userData.class) {
          const factsUrl = `${API_BASE_URL}/facts/get/${userData.group_id}/${userData.class}`;
          console.log("Fetching facts from:", factsUrl);
          const factsRes = await fetch(factsUrl, { credentials: "include", method: "GET" });
          console.log("Facts fetch response status:", factsRes.status);
          if (factsRes.ok) {
            const factsData = await factsRes.json();
            console.log("Facts data:", factsData);
            // Map object { one, two, three } to array
            const factsArray = ["one", "two", "three"]
              .map(key => factsData[key])
              .filter(fact => fact && fact.trim());
            setFacts(factsArray.map(fact => ({ fact })));
          } else {
            console.warn("Facts fetch failed:", factsRes.status, await factsRes.text());
          }
        } else {
          console.warn("User does not have group_id and class_id, or user fetch failed.");
        }
      } catch (error) {
        console.error("Error fetching user or facts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndFacts();
  }, []);

  if (loading) {
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