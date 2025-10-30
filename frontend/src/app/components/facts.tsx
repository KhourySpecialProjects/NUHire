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
        const userRes = await fetch(`${API_BASE_URL}/auth/user`, { credentials: "include" });
        const userData = await userRes.json();
        setUser(userData);

        // Only fetch facts if user has group_id and class_id
        if (userRes.ok && userData.group_id && userData.class_id) {
          const factsRes = await fetch(
            `${API_BASE_URL}/facts/get/${userData.group_id}/${userData.class_id}`,
            { credentials: "include", method: "GET" }
          );
          if (factsRes.ok) {
            const factsData = await factsRes.json();
            setFacts(factsData);
          }
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
    </div>
  );
};

export default Facts;