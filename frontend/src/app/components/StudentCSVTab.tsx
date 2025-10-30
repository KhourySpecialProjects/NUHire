'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavbarAdmin from '../components/navbar-admin';

const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

interface CSVStudent {
  email: string;
  group_id: number;
}

interface ValidationError {
  row: number;
  error: string;
}

interface ClassInfo {
  crn: number;
  class_name: string;
}

interface User {
  email: string;
}

export function StudentCSVTab() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [csvStudents, setCsvStudents] = useState<CSVStudent[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add submit loading state
  const [submitSuccess, setSubmitSuccess] = useState(false); // Add submit success state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // const emailRegex = /^[^\s@]+@northeastern\.edu$/;
  const emailRegex = /^.*$/;
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/user`, { 
          credentials: 'include' 
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.email) return;

      try {
        const response = await fetch(`${API_BASE_URL}/moderator/classes-full/${user.email}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const classData = await response.json();
          setClasses(classData);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    fetchClasses();
  }, [user]);

  const parseCSV = (csvText: string): string[][] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    return lines.map(line => 
      line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''))
    );
  };

  const validateAndExtractEmails = (data: string[][]): { students: CSVStudent[], errors: ValidationError[] } => {
    const students: CSVStudent[] = [];
    const errors: ValidationError[] = [];

    if (data.length === 0) {
      errors.push({ row: 0, error: 'CSV file is empty' });
      return { students, errors };
    }

    // Find email column
    const headers = data[0].map(h => h.toLowerCase().trim());
    console.log('CSV Headers:', headers);
    const emailIndex = headers.findIndex(h => h.includes('email'));

    if (emailIndex === -1) {
      errors.push({ row: 1, error: 'No email column found in headers' });
      return { students, errors };
    }

    // Process data rows
    data.slice(1).forEach((row, index) => {
      const rowNumber = index + 2;
      const email = row[emailIndex]?.trim().toLowerCase();

      if (!email) {
        errors.push({ row: rowNumber, error: 'Empty email address' });
      } else if (!emailRegex.test(email)) {
        errors.push({ row: rowNumber, error: `Invalid email format: ${email}` });
      } else {
        // Give each student their own unique group (index + 1)
        students.push({ email, group_id: 1 });
      }
    });
    return { students, errors };
  };

  const handleFileUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setValidationErrors([{ row: 0, error: 'Please upload a CSV file' }]);
      return;
    }

    // Clear existing data when new file is uploaded
    setCsvStudents([]);
    setValidationErrors([]);
    setSubmitSuccess(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const parsedData = parseCSV(csvText);
      const { students, errors } = validateAndExtractEmails(parsedData);
      
      setCsvStudents(students);
      setValidationErrors(errors);
    };

    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const updateStudentGroup = (email: string, groupId: number) => {
    console.log('Updating:', email, 'to group:', groupId);
    setCsvStudents(prev => 
      prev.map(student => {
        if (student.email === email) {
          console.log('Found match, updating:', student.email);
          return { ...student, group_id: groupId };
        }
        return student;
      })
    );
  };

  // New submit function
const handleSubmit = async () => {
  if (!selectedClass || csvStudents.length === 0) {
    alert('Please select a class and upload student data first');
    return;
  }

  const payload = {
    class_id: selectedClass,
    assignments: csvStudents.map(student => ({
      email: student.email,
      group_id: student.group_id
    }))
  };

  const uniqueGroupIds = [...new Set(csvStudents.map(student => student.group_id))];
  const numGroups = Math.max(...uniqueGroupIds); 
  
  setIsSubmitting(true);

  try {
    const createPayload = {
      class_id: selectedClass,
      num_groups: numGroups
    };

    console.log('Creating groups with payload:', createPayload);
    
    const createRes = await fetch(`${API_BASE_URL}/groups/create-groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(createPayload),
    });

    if (!createRes.ok) {
      const createError = await createRes.json();
      console.error('Failed to create groups:', createError);
      if (!createError.error?.includes('already exist')) {
        throw new Error(`Failed to create groups: ${createError.error}`);
      } else {
        console.log('Groups already exist, proceeding with assignment');
      }
    } else {
      const createResult = await createRes.json();
      console.log(`✅ Created ${createResult.groups_created} groups for class ${selectedClass}`);
    }

    console.log('Assigning students to groups...');
    const response = await fetch(`${API_BASE_URL}/csv/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const result = await response.json();
      setSubmitSuccess(true);
      alert(`Groups created and assignments submitted successfully! Created groups 1-${numGroups} for ${csvStudents.length} students.`);
    } else {
      const errorData = await response.json();
      console.error('❌ Response error:', errorData);
      alert(`Failed to submit assignments: ${errorData.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('🔥 Fetch error:', error);
    alert(`Failed to submit: ${error || 'Please try again.'}`);
  } finally {
    setIsSubmitting(false);
  }
};

  const downloadCSV = () => {
    if (!selectedClass || csvStudents.length === 0) {
      alert('Please select a class and upload student data first');
      return;
    }

    const csvContent = csvStudents
      .map(student => `${student.group_id},${student.email}`)
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `group_assignments_class_${selectedClass}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const clearData = () => {
    setCsvStudents([]);
    setValidationErrors([]);
    setSubmitSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-northeasternWhite font-rubik">
        <NavbarAdmin />
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-northeasternWhite font-rubik">
        <NavbarAdmin />
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
            <p className="text-gray-600">You must be logged in to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-northeasternWhite font-rubik">
      <NavbarAdmin />
      <div className="max-w-3xl mx-auto bg-northeasternWhite border-northeasternBlack border-4 justify-center rounded-md items-center p-6 mt-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">CSV Group Assignment</h1>
          
          {/* Class Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class to Assign Groups:
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a class...</option>
              {classes.map((cls) => (
                <option key={cls.crn} value={cls.crn}>
                  {cls.class_name} (CRN: {cls.crn})
                </option>
              ))}
            </select>
          </div>

          {/* CSV Upload */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload CSV with Student Emails</h2>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-4 ${
                dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your CSV file here or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-500 underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-sm text-gray-500">CSV must have an "Email" column</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">CSV Format:</h3>
              <p className="text-blue-800 text-sm mb-2">Must include "Email" column with @northeastern.edu addresses</p>
              <div className="text-blue-800 text-xs font-mono bg-white p-2 rounded">
                Email,Name<br/>
                john.doe@northeastern.edu,John Doe<br/>
                jane.smith@northeastern.edu,Jane Smith
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-900 mb-3">Errors:</h3>
              {validationErrors.map((error, index) => (
                <div key={index} className="text-red-800 text-sm">
                  Row {error.row}: {error.error}
                </div>
              ))}
            </div>
          )}

          {/* Submit Success Message */}
          {submitSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-semibold">
                ✅ Group assignments submitted successfully!
              </p>
            </div>
          )}

          {/* Group Assignment Interface */}
          {csvStudents.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Assign Groups ({csvStudents.length} students):
              </h3>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <div className="space-y-2 p-4">
                  {csvStudents.map((student, index) => (
                    <div key={`${student.email}-${index}`} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <span className="text-sm font-medium">{student.email}</span>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">Group:</label>
                        <input
                          type="number"
                          min="1"
                          value={student.group_id}
                          onChange={(e) => updateStudentGroup(student.email, parseInt(e.target.value) || 1)}
                          className="w-20 p-2 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {csvStudents.length > 0 && (
            <div className="flex space-x-4">
              <button
                onClick={handleSubmit}
                disabled={!selectedClass || isSubmitting || submitSuccess}
                className={`px-6 py-3 rounded-lg font-semibold ${
                  !selectedClass || isSubmitting || submitSuccess
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit Group Assignments'
                )}
              </button>
              
              <button
                onClick={downloadCSV}
                disabled={!selectedClass}
                className={`px-6 py-3 rounded-lg font-semibold ${
                  selectedClass
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Download CSV
              </button>
              
              <button
                onClick={clearData}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
              >
                Clear Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
