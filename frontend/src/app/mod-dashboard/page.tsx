'use client';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/navbar";
import Footer from "../components/footer";

interface ModeratorInfo {
  id: number;
  crn: number;
  nom_groups: number;
  admin_email: string;
}

const ModDashboard = () => {
  const [info, setInfo] = useState<ModeratorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const [form, setForm] = useState({ admin_email: "", crn: "", nom_groups: "" });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchCRNs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/moderator-crns`, { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setInfo(data);
        } else {
          setPopup({ headline: "Error", message: "Failed to fetch CRNs." });
        }
      } catch (error) {
        setPopup({ headline: "Error", message: "Failed to fetch CRNs." });
      } finally {
        setLoading(false);
      }
    };
    fetchCRNs();
  }, [submitting]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/moderator-crns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_email: form.admin_email,
          crn: Number(form.crn),
          nom_groups: Number(form.nom_groups),
        }),
      });
      if (res.ok) {
        setForm({ admin_email: "", crn: "", nom_groups: "" });
        setPopup({ headline: "Success", message: "Class added!" });
      } else {
        setPopup({ headline: "Error", message: "Failed to add class." });
      }
    } catch {
      setPopup({ headline: "Error", message: "Failed to add class." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bg-sand font-rubik min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col px-4 py-8">
        <div className="font-extrabold text-3xl font-rubik text-redHeader mb-6 text-center">
          <h3>Valid CRNs & Groups</h3>
        </div>

        {/* Add CRN Form */}
        <form
          onSubmit={handleFormSubmit}
          className="bg-white border-2 border-northeasternRed rounded-xl shadow-md p-6 mb-8 max-w-lg mx-auto flex flex-col gap-4"
        >
          <h4 className="text-xl font-bold text-northeasternRed mb-2">Add a Class</h4>
          <input
            type="email"
            name="admin_email"
            placeholder="Admin Email"
            value={form.admin_email}
            onChange={handleFormChange}
            className="border p-2 rounded"
            required
          />
          <input
            type="number"
            name="crn"
            placeholder="CRN"
            value={form.crn}
            onChange={handleFormChange}
            className="border p-2 rounded"
            required
          />
          <input
            type="number"
            name="nom_groups"
            placeholder="Number of Groups"
            value={form.nom_groups}
            onChange={handleFormChange}
            className="border p-2 rounded"
            required
          />
          <button
            type="submit"
            className="bg-navy text-white py-2 rounded hover:bg-navy/80 transition"
            disabled={submitting}
          >
            {submitting ? "Adding..." : "Add Class"}
          </button>
        </form>

        <div className="flex-1 flex items-center justify-center">
          {info.length === 0 ? (
            <div className="text-center text-gray-600">No CRNs found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
              {info.map((i) => (
                <div
                  key={i.id}
                  className="w-full min-h-[180px] max-w-[500px] mx-auto bg-northeasternWhite border-2 border-northeasternRed rounded-xl shadow-lg flex flex-col justify-center items-center font-semibold text-lg p-6"
                >
                  <div className="text-2xl font-bold text-northeasternRed mb-2">CRN: {i.crn}</div>
                  <div className="text-lg text-navy mb-1">
                    <span className="font-bold">Number of Groups:</span> {i.nom_groups}
                  </div>
                  <div className="text-lg text-navy">
                    <span className="font-bold">Admin Email:</span>
                    <ul className="list-disc ml-6">
                      <li>{i.admin_email}</li>
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
    );
};

export default ModDashboard;