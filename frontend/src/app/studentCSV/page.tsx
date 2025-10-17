'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavbarAdmin from '../components/navbar-admin';

const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

interface CSVRow {
  email: string;
  rowIndex: number;
}

interface ValidationError {
  row: number;
  column: string;
  value: string;
  error: string;
}

interface ClassInfo {
  crn: number;
  class_name: string;
}

interface Student {
  email: string;
  name?: string;
  group_id?: number;
}

interface User {
  email: string;
  // add other user properties as needed
}

export default function StudentCSVPage() {
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [showAssignment, setShowAssignment] = useState(false);
  const [user, setUser] = useState<User | null>(null); // Add user state
  const [loading, setLoading] = useState(true); // Add loading state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Email validation regex
  const emailRegex = /^[^\s@]+\.[^\s@]+@northeastern.edu$/;

  // Fetch user first, then fetch classes
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
          // Redirect to login if user is not authenticated
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

  // Fetch classes when user is loaded
  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.email) return;

      try {
        const response = await fetch(`${API_BASE_URL}/moderator-classes-full/${user.email}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const classData = await response.json();
          console.log('Classes fetched:', classData);
          setClasses(classData);
        } else {
          console.error('Failed to fetch classes');
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    fetchClasses();
  }, [user]);

  // Fetch students when class is selected
  const handleClassChange = async (classId: string) => {
    setSelectedClass(classId);
    if (classId) {
      try {
        const response = await fetch(`${API_BASE_URL}/students?class=${classId}`, { 
          credentials: 'include' 
        });
        
        if (response.ok) {
          const studentData = await response.json();
          setStudents(studentData);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    }
  };

  // Show loading state while fetching user
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-northeasternWhite font-rubik">
        <NavbarAdmin />
        <div className="max-w-6xl mx-auto p-4">
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

  // Show error state if no user
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-northeasternWhite font-rubik">
        <NavbarAdmin />
        <div className="max-w-6xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
              <p className="text-gray-600">You must be logged in to access this page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const validateCSVData = (data: string[][]): { validRows: CSVRow[], errors: ValidationError[] } => {
    const validRows: CSVRow[] = [];
    const errors: ValidationError[] = [];

    // Find the email column index
    const headers = data[0]?.map(h => h.trim().toLowerCase());
    const emailColumnIndex = headers?.findIndex(h => h === 'email');

    if (emailColumnIndex === -1 || emailColumnIndex === undefined) {
      errors.push({
        row: 0,
        column: 'Header',
        value: '',
        error: 'Email column not found in CSV headers'
      });
      return { validRows, errors };
    }

    // Start from index 1 to skip header row
    data.slice(1).forEach((row, index) => {
      const rowNumber = index + 2; // +2 because we sliced at 1 and index is 0-based
      
      // Skip empty rows
      if (row.length === 0 || (row.length === 1 && row[0].trim() === '')) {
        return;
      }

      const emailStr = row[emailColumnIndex]?.trim().toLowerCase();

      if (!emailStr) {
        errors.push({
          row: rowNumber,
          column: 'Email',
          value: emailStr || '',
          error: 'Email address cannot be empty'
        });
      } else if (!emailRegex.test(emailStr)) {
        errors.push({
          row: rowNumber,
          column: 'Email',
          value: emailStr,
          error: 'Invalid email address format'
        });
      } else {
        // Email is valid
        validRows.push({
          email: emailStr,
          rowIndex: rowNumber
        });
      }
    });

    return { validRows, errors };
  };

  const parseCSV = (csvText: string): string[][] => {
    const lines = csvText.split('\n');
    const result: string[][] = [];

    lines.forEach(line => {
      if (line.trim()) {
        // Simple CSV parsing (handles basic cases)
        const row = line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
        result.push(row);
      }
    });

    return result;
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;

    // Check if file is CSV
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setValidationErrors([{
        row: 0,
        column: 'File',
        value: file.name,
        error: 'Please upload a CSV file'
      }]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      
      try {
        const parsedData = parseCSV(csvText);
        const { validRows, errors } = validateCSVData(parsedData);
        
        setCsvData(validRows);
        setValidationErrors(errors);
        setUploadSuccess(false);
      } catch (error) {
        setValidationErrors([{
          row: 0,
          column: 'File',
          value: file.name,
          error: 'Error parsing CSV file. Please check the file format.'
        }]);
      }
    };

    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (csvData.length === 0) {
      setValidationErrors([{
        row: 0,
        column: 'Data',
        value: '',
        error: 'No valid data to submit. Please upload and validate a CSV file first.'
      }]);
      return;
    }

    setIsUploading(true);
    
    try {
      // Here you would send the data to your API
      console.log('Uploading CSV data:', csvData);
      
      setUploadSuccess(true);
      setIsUploading(false);
      
      // Optional: Redirect after successful upload
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
    } catch (error) {
      setValidationErrors([{
        row: 0,
        column: 'Upload',
        value: '',
        error: 'Failed to upload data. Please try again.'
      }]);
      setIsUploading(false);
    }
  };

  const handleGroupAssignment = () => {
    if (!selectedClass || students.length === 0) {
      alert('Please select a class with students first');
      return;
    }
    
    // Initialize assigned students with current students and default group 1
    const studentsWithGroups = students.map(student => ({
      ...student,
      group_id: student.group_id || 1
    }));
    setAssignedStudents(studentsWithGroups);
    setShowAssignment(true);
  };

  const updateStudentGroup = (email: string, groupNumber: number) => {
    setAssignedStudents(prev => 
      prev.map(student => 
        student.email === email 
          ? { ...student, group_id: groupNumber }
          : student
      )
    );
  };

  const downloadCSV = () => {
    if (assignedStudents.length === 0) {
      alert('No group assignments to download');
      return;
    }

    // Create CSV content (no headers, just group number and email)
    const csvContent = assignedStudents
      .map(student => `${student.group_id || 1},${student.email}`)
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `group_assignments_class_${selectedClass}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const saveGroupAssignments = async () => {
    if (!selectedClass || assignedStudents.length === 0) {
      alert('No assignments to save');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/assign-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          class_id: selectedClass,
          assignments: assignedStudents.map(student => ({
            email: student.email,
            group_number: student.group_id
          }))
        }),
      });

      if (response.ok) {
        alert('Group assignments saved successfully!');
        // Refresh students to show updated assignments
        await handleClassChange(selectedClass);
      } else {
        const errorData = await response.json();
        alert(`Failed to save assignments: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving group assignments:', error);
      alert('Failed to save assignments. Please try again.');
    }
  };

  const clearData = () => {
    setCsvData([]);
    setValidationErrors([]);
    setUploadSuccess(false);
    setShowAssignment(false);
    setAssignedStudents([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-northeasternWhite font-rubik">
      <NavbarAdmin />
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Group Assignment Manager</h1>
          
          {/* User Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Logged in as:</strong> {user.email}
            </p>
          </div>
          
          {/* Class Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class:
            </label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
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

          {/* Rest of your existing JSX remains the same... */}
          {/* Current Students */}
          {students.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Students in Class ({students.length} total):
                </h3>
                <button
                  onClick={handleGroupAssignment}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Assign Groups
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {students.map((student, index) => (
                    <div key={index} className="text-sm text-gray-700 bg-white p-2 rounded">
                      {student.email} 
                      {student.group_id && (
                        <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          Group {student.group_id}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Group Assignment Interface */}
          {showAssignment && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Assign Groups to Students:</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {assignedStudents.map((student, index) => (
                  <div key={index} className="flex items-center space-x-4 bg-white p-3 rounded">
                    <span className="flex-1 text-sm">{student.email}</span>
                    <label className="text-sm text-gray-600">Group:</label>
                    <input
                      type="number"
                      min="1"
                      value={student.group_id || 1}
                      onChange={(e) => updateStudentGroup(student.email, parseInt(e.target.value) || 1)}
                      className="w-20 p-1 border border-gray-300 rounded text-center"
                    />
                  </div>
                ))}
              </div>
              <div className="flex space-x-4 mt-4">
                <button
                  onClick={saveGroupAssignments}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Save Assignments
                </button>
                <button
                  onClick={downloadCSV}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => setShowAssignment(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Divider */}
          {students.length > 0 && (
            <div className="border-t border-gray-300 my-6"></div>
          )}

          {/* CSV Upload Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Or Upload CSV with Student Emails</h2>
            
            <div className="mb-8">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
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
                  <p className="text-sm text-gray-500 mb-4">
                    CSV must have an "Email" column
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Format Instructions */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">CSV Format Requirements:</h3>
              <ul className="text-blue-800 space-y-1">
                <li>• Must have a header row with "Email" column</li>
                <li>• Email must be a Northeastern email (@northeastern.edu)</li>
                <li>• Example CSV:</li>
                <li className="ml-4 font-mono text-sm bg-white px-2 py-1 rounded">
                  Email,Name<br/>
                  john.doe@northeastern.edu,John Doe<br/>
                  jane.smith@northeastern.edu,Jane Smith
                </li>
              </ul>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-lg font-semibold text-red-900 mb-3">Validation Errors:</h3>
                <div className="max-h-40 overflow-y-auto">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="text-red-800 text-sm mb-1">
                      <strong>Row {error.row}:</strong> {error.error}
                      {error.value && (
                        <span className="text-red-600"> (Value: "{error.value}")</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Valid Data Preview */}
            {csvData.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  Valid Data ({csvData.length} records):
                </h3>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Row
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Email Address
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{row.rowIndex}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Success Message */}
            {uploadSuccess && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-semibold">
                  ✅ CSV data uploaded successfully!
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSubmit}
                disabled={csvData.length === 0 || isUploading || uploadSuccess}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${
                  csvData.length === 0 || isUploading || uploadSuccess
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </div>
                ) : (
                  `Upload ${csvData.length} Records`
                )}
              </button>

              <button
                onClick={clearData}
                disabled={isUploading}
                className="flex-1 sm:flex-none py-3 px-6 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}