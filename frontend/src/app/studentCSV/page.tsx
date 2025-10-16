'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import NavbarAdmin from '../components/navbar-admin';

interface CSVRow {
  groupNumber: number;
  email: string;
  rowIndex: number;
}

interface ValidationError {
  row: number;
  column: string;
  value: string;
  error: string;
}

export default function StudentCSVPage() {
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Email validation regex
  const emailRegex = /^[^\s@]+\.[^\s@]+@northeastern.edu$/;

  const validateCSVData = (data: string[][]): { validRows: CSVRow[], errors: ValidationError[] } => {
    const validRows: CSVRow[] = [];
    const errors: ValidationError[] = [];

    data.forEach((row, index) => {
      const rowNumber = index + 1;
      
      // Skip empty rows
      if (row.length === 0 || (row.length === 1 && row[0].trim() === '')) {
        return;
      }

      // Check if row has at least 2 columns
      if (row.length < 2) {
        errors.push({
          row: rowNumber,
          column: 'Row',
          value: row.join(','),
          error: 'Row must have at least 2 columns (Group Number, Email)'
        });
        return;
      }

      const groupNumberStr = row[0]?.trim();
      const emailStr = row[1]?.trim();

      // Validate group number (first column)
      if (!groupNumberStr) {
        errors.push({
          row: rowNumber,
          column: 'Group Number',
          value: groupNumberStr || '',
          error: 'Group number cannot be empty'
        });
      } else {
        console.log('Validating group number:', groupNumberStr);
        const groupNumber = parseInt(groupNumberStr);
        console.log('Parsed group number:', groupNumber);
        if (isNaN(groupNumber) || groupNumber <= 0) {
          errors.push({
            row: rowNumber,
            column: 'Group Number',
            value: groupNumberStr,
            error: 'Group number must be a positive integer'
          });
        } else {
          // Valid group number, now validate email
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
            // Both group number and email are valid
            validRows.push({
              groupNumber: groupNumber,
              email: emailStr,
              rowIndex: rowNumber
            });
          }
        }
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
      // For now, we'll just simulate a successful upload
      console.log('Uploading CSV data:', csvData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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

  const clearData = () => {
    setCsvData([]);
    setValidationErrors([]);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <NavbarAdmin />
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Upload Student CSV</h1>
          
          {/* Upload Area */}
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
                  CSV format: Group Number, Email Address
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
              <li>• First column: Group Number (positive integer)</li>
              <li>• Second column: Email Address (valid email format)</li>
              <li>• No header row needed</li>
              <li>• Example: 1, student@example.com</li>
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
                        Group Number
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
                        <td className="px-4 py-2 text-sm text-gray-900">{row.groupNumber}</td>
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
                ✅ CSV data uploaded successfully! Redirecting to dashboard...
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
  );
}