'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavbarAdmin from '../components/navbar-admin';

const API_BASE_URL = "https://nuhire-api-cz6c.onrender.com";

interface Student {
  id: number;
  email: string;
  f_name: string;
  l_name: string;
  group_id: number;
  class: number;
}

interface Group {
  group_id: number;
  students: Student[];
  isStarted: boolean;
}

interface ClassInfo {
  crn: number;
  class_name: string;
}

interface User {
  email: string;
}

export default function ManageGroupsPage() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStartingAll, setIsStartingAll] = useState(false);
  const [startingGroups, setStartingGroups] = useState<Set<number>>(new Set());
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newGroupId, setNewGroupId] = useState<number>(1);
  const router = useRouter();
  const [availableGroups, setAvailableGroups] = useState<number[]>([]);


  useEffect(() => {
    console.log("Available groups updated:", availableGroups);
  }, [availableGroups]);
  
  // Fetch user authentication
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
          setClasses(classData);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    fetchClasses();
  }, [user]);

  useEffect(() => {
    const fetchStudentsAndOrganize = async () => {
      if (!selectedClass) {
        setStudents([]);
        setGroups([]);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/students-by-class/${selectedClass}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const studentData = await response.json();
          setStudents(studentData);
          if (availableGroups.length > 0) {
            await organizeStudentsIntoGroups(studentData);
          }
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudentsAndOrganize();
  }, [selectedClass, availableGroups]);

  useEffect(() => {
    const fetchAvailableGroups = async () => {
      if (!selectedClass) {
        setAvailableGroups([]);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/groups?class=${selectedClass}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const groupData = await response.json();
          console.log("Available groups from GroupsInfo:", groupData);
          // Convert to numbers and sort
          const groupNumbers = Array.isArray(groupData) 
            ? groupData.map(Number).sort((a, b) => a - b)
            : [];
          setAvailableGroups(groupNumbers);
        }
      } catch (error) {
        console.error('Error fetching available groups:', error);
        setAvailableGroups([]);
      }
    };

    fetchAvailableGroups();
  }, [selectedClass]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) {
        setStudents([]);
        setGroups([]);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/students-by-class/${selectedClass}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const studentData = await response.json();
          setStudents(studentData);
          if (availableGroups.length > 0) {
            organizeStudentsIntoGroups(studentData);
          }
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudents();
  }, [selectedClass, availableGroups]); 

  useEffect(() => {
    const organizeAsync = async () => {
      if (availableGroups.length > 0 && students.length >= 0) {
        await organizeStudentsIntoGroups(students);
      }
    };
    
    organizeAsync();
  }, [availableGroups]);

  const organizeStudentsIntoGroups = async (studentList: Student[]) => {
    const groupMap = new Map<number | null, Student[]>();
    
    availableGroups.forEach(groupId => {
      groupMap.set(groupId, []);
    });
    
    studentList.forEach(student => {
      const groupKey = student.group_id;
      if (groupKey !== null && availableGroups.includes(groupKey)) {
        groupMap.get(groupKey)!.push(student);
      } else if (groupKey === null) {
        if (!groupMap.has(null)) {
          groupMap.set(null, []);
        }
        groupMap.get(null)!.push(student);
      }
    });

    const groupsArray: Group[] = [];
    
    // Fetch start statuses for all available groups
    const startStatuses = selectedClass ? await fetchGroupStartStatuses(selectedClass, availableGroups) : [];
    
    availableGroups.forEach(groupId => {
      const students = groupMap.get(groupId) || [];
      const statusInfo = startStatuses.find(s => s.groupId === groupId);
      
      groupsArray.push({
        group_id: groupId,
        students: students.sort((a, b) => {
          const aName = a.f_name || '';
          const bName = b.f_name || '';
          return aName.localeCompare(bName);
        }),
        isStarted: statusInfo ? statusInfo.started : false // Use actual status from database
      });
    });
    
    const ungroupedStudents = groupMap.get(null) || [];
    if (ungroupedStudents.length > 0) {
      groupsArray.push({
        group_id: -1,
        students: ungroupedStudents.sort((a, b) => {
          const aName = a.f_name || '';
          const bName = b.f_name || '';
          return aName.localeCompare(bName);
        }),
        isStarted: false
      });
    }
    
    groupsArray.sort((a, b) => {
      if (a.group_id === -1) return 1; 
      if (b.group_id === -1) return -1;
      return a.group_id - b.group_id;
    });

    setGroups(groupsArray);
  };

  // Handle class selection
  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
  };

  // Reassign student to different group
  const reassignStudent = async (studEmail: string, newGroup: number) => {
    try {
      console.log('reassigning email:', studEmail);
      console.log("sending class id:", selectedClass);
      console.log("new group id:", newGroup);
      const response = await fetch(`${API_BASE_URL}/reassign-student`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: studEmail, 
          new_group_id: newGroup,
          class_id: selectedClass
        }),
      });

      if (response.ok) {
        // Refresh students data
        const studentResponse = await fetch(`${API_BASE_URL}/students-by-class/${selectedClass}`, {
          credentials: 'include'
        });
        
        if (studentResponse.ok) {
          const studentData = await studentResponse.json();
          setStudents(studentData);
          organizeStudentsIntoGroups(studentData);
        }
        
        setReassignModalOpen(false);
        setSelectedStudent(null);
        alert('Student reassigned successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to reassign student: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error reassigning student:', error);
      alert('Failed to reassign student. Please try again.');
    }
  };

  // Remove student from group
  const removeStudentFromGroup = async (email: string) => {
    if (!confirm('Are you sure you want to remove this student from their group?')) {
      return;
    }

    try {
      console.log('Removing student:', email);
      console.log("sending class id:", selectedClass);

      const response = await fetch(`${API_BASE_URL}/remove-from-group`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          class_id: selectedClass
        }),
      });

      if (response.ok) {
        // Refresh students data
        const studentResponse = await fetch(`${API_BASE_URL}/students-by-class/${selectedClass}`, {
          credentials: 'include'
        });
        
        if (studentResponse.ok) {
          const studentData = await studentResponse.json();
          setStudents(studentData);
          organizeStudentsIntoGroups(studentData);
        }
        
        alert('Student removed from group successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to remove student: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error removing student:', error);
      alert('Failed to remove student. Please try again.');
    }
  };

  const fetchGroupStartStatuses = async (classId: string, groupIds: number[]) => {
    const statusPromises = groupIds.map(async (groupId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/group/started/${classId}/${groupId}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          return { groupId, started: data.started };
        } else {
          console.error(`Failed to fetch status for group ${groupId}`);
          return { groupId, started: false };
        }
      } catch (error) {
        console.error(`Error fetching status for group ${groupId}:`, error);
        return { groupId, started: false };
      }
    });

    const statuses = await Promise.all(statusPromises);
    return statuses;
  };
  
  // Update the startGroup function
  const startGroup = async (groupId: number) => {
    setStartingGroups(prev => new Set(prev).add(groupId));

    try {
      const response = await fetch(`${API_BASE_URL}/start-group`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          group_id: groupId,
          class_id: selectedClass
        }),
      });

      if (response.ok) {
        setGroups(prev => prev.map(group => 
          group.group_id === groupId 
            ? { ...group, isStarted: true }
            : group
        ));
        alert(`Group ${groupId} started successfully!`);
      } else {
        const errorData = await response.json();
        alert(`Failed to start group: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error starting group:', error);
      alert('Failed to start group. Please try again.');
    } finally {
      setStartingGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  // Start all groups
  const startAllGroups = async () => {
    if (!confirm('Are you sure you want to start all groups? This action cannot be undone.')) {
      return;
    }

    setIsStartingAll(true);

    try {
      const response = await fetch(`${API_BASE_URL}/start-all-groups`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          class_id: selectedClass
        }),
      });

      if (response.ok) {
        // Update all groups status locally
        setGroups(prev => prev.map(group => ({ ...group, isStarted: true })));
        alert('All groups started successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to start all groups: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error starting all groups:', error);
      alert('Failed to start all groups. Please try again.');
    } finally {
      setIsStartingAll(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-northeasternWhite font-rubik">
        <NavbarAdmin />
        <div className="max-w-7xl mx-auto p-4">
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

  // Access denied state
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-northeasternWhite font-rubik">
        <NavbarAdmin />
        <div className="max-w-7xl mx-auto p-4">
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
      <div className="w-3/4 mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">👥 Manage Groups</h1>
            {selectedClass && groups.length > 0 && (
              <button
                onClick={startAllGroups}
                disabled={isStartingAll || groups.every(g => g.isStarted)}
                className={`px-6 py-3 rounded-lg font-semibold ${
                  isStartingAll || groups.every(g => g.isStarted)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isStartingAll ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting All...
                  </div>
                ) : (
                  '🚀 Start All Groups'
                )}
              </button>
            )}
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class to Manage:
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

          {selectedClass && groups.length > 0 && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Class Groups ({groups.length} groups, {students.length} students total)
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {groups.map((group) => (
                <div key={group.group_id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {`Group ${group.group_id}`}
                      </h3>
                      {group.isStarted && group.group_id !== -1 && (
                        <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          ✅ Started
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {group.students.length} student{group.students.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {group.students.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No students in this group</p>
                    ) : (
                      group.students.map((student) => (
                        <div key={student.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                          <div className="mb-3">
                            <p className="font-medium text-gray-900">
                              {student.f_name && student.l_name 
                                ? `${student.f_name} ${student.l_name}`
                                : student.f_name || student.l_name || 'No Name'
                              }
                            </p>
                            <p className="text-sm text-gray-600">{student.email}</p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setNewGroupId(availableGroups.length > 0 ? availableGroups[0] : 1);
                                setReassignModalOpen(true);
                              }}
                              className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 py-1 px-3 rounded text-xs font-medium transition-colors"
                              title="Reassign student"
                            >
                              ↻ Reassign
                            </button>
                            
                            {student.group_id !== null && (
                              <button
                                onClick={() => removeStudentFromGroup(student.email)}
                                className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 py-1 px-3 rounded text-xs font-medium transition-colors"
                                title="Remove from group"
                              >
                                × Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {group.group_id !== -1 && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startGroup(group.group_id)}
                        disabled={group.isStarted || startingGroups.has(group.group_id)}
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium ${
                          group.isStarted || startingGroups.has(group.group_id)
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {startingGroups.has(group.group_id) ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            Starting...
                          </div>
                        ) : group.isStarted ? (
                          '✅ Started'
                        ) : (
                          '🚀 Start Group'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            </div>
          )}

          {selectedClass && groups.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">No groups found for this class.</p>
              <p className="text-gray-400 text-sm mt-2">
                Students need to be imported via CSV first.
              </p>
            </div>
          )}

          {!selectedClass && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">Select a class to manage groups.</p>
            </div>
          )}
        </div>
      </div>

      {reassignModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">
              Reassign {selectedStudent.f_name && selectedStudent.l_name 
                ? `${selectedStudent.f_name} ${selectedStudent.l_name}`
                : selectedStudent.email
              }
            </h3>
            <p className="text-gray-600 mb-4">
              Current group: {selectedStudent.group_id || 'No Group'}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Group:
              </label>
              <select
                value={newGroupId}
                onChange={(e) => setNewGroupId(parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {availableGroups.map((groupId) => {
                  const existingGroup = groups.find(g => g.group_id === groupId);
                  const studentCount = existingGroup ? existingGroup.students.length : 0;
                  return (
                    <option key={groupId} value={groupId}>
                      Group {groupId} ({studentCount} student{studentCount !== 1 ? 's' : ''})
                    </option>
                  );
                })}
              </select>
              
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                <div>
                  <p className="font-medium">Moving to Group {newGroupId}:</p>
                  {(() => {
                    const targetGroup = groups.find(g => g.group_id === newGroupId);
                    if (!targetGroup || targetGroup.students.length === 0) {
                      return <p className="text-gray-500 italic">Empty group</p>;
                    }
                    return (
                      <div className="mt-1">
                        {targetGroup.students.map((student) => (
                          <p key={student.id} className="text-gray-600">
                            • {student.f_name && student.l_name 
                              ? `${student.f_name} ${student.l_name}`
                              : student.f_name || student.l_name || 'No Name'
                            }
                          </p>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => reassignStudent(selectedStudent.email, newGroupId)}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Reassign
              </button>
              <button
                onClick={() => {
                  setReassignModalOpen(false);
                  setSelectedStudent(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}