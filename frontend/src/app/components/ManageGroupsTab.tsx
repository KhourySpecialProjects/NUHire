'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from './socketContext';
import Popup from './popup';

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
  jobAssignment?: string;
  progress?: string;
}

interface ClassInfo {
  crn: number;
  class_name: string;
}

interface User {
  email: string;
}

interface JobOption {
  id: number;
  title: string;
}

export function ManageGroupsTab() {
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
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [popup, setPopup] = useState<{ headline: string; message: string } | null>(null);
  const socket = useSocket();
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [addStudentEmail, setAddStudentEmail] = useState('');
  const [addStudentGroupId, setAddStudentGroupId] = useState<number | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [assignJobModalOpen, setAssignJobModalOpen] = useState(false);
  const [selectedGroupForJob, setSelectedGroupForJob] = useState<number | null>(null);
  const [availableJobs, setAvailableJobs] = useState<JobOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isAssigningJob, setIsAssigningJob] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; data: any } | null>(null);
    
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

  const fetchGroupJobAndProgress = async (groupId: number, classId: string) => {
    try {
      const jobResponse = await fetch(`${API_BASE_URL}/jobs/assignment/${groupId}/${classId}`, {
        credentials: 'include'
      });
      
      let jobAssignment = 'No job assigned';
      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        jobAssignment = jobData.job || 'No job assigned';
      }

      const progressResponse = await fetch(`${API_BASE_URL}/groups/getProgress/${classId}/${groupId}`, {
        credentials: 'include'
      });
      
      let progress = 'none';
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        progress = progressData.progress || 'none';
      }

      return { jobAssignment, progress };
    } catch (error) {
      console.error(`Error fetching job/progress for group ${groupId}:`, error);
      return { jobAssignment: 'No job assigned', progress: 'none' };
    }
  };

  const fetchGroupStartStatuses = async (classId: string, groupIds: number[]) => {
    const statusPromises = groupIds.map(async (groupId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/groups/started/${classId}/${groupId}`, {
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

  const organizeStudentsIntoGroups = async (studentList: Student[], groupIds: number[]) => {
    const groupMap = new Map<number | null, Student[]>();
    
    groupIds.forEach(groupId => {
      groupMap.set(groupId, []);
    });
    
    studentList.forEach(student => {
      const groupKey = student.group_id;
      if (groupKey !== null && groupIds.includes(groupKey)) {
        groupMap.get(groupKey)!.push(student);
      } else if (groupKey === null) {
        if (!groupMap.has(null)) {
          groupMap.set(null, []);
        }
        groupMap.get(null)!.push(student);
      }
    });

    const groupsArray: Group[] = [];
    
    const startStatuses = selectedClass ? await fetchGroupStartStatuses(selectedClass, groupIds) : [];
    const jobProgressPromises = groupIds.map(groupId => 
      fetchGroupJobAndProgress(groupId, selectedClass)
    );
    const jobProgressData = await Promise.all(jobProgressPromises);
    
    groupIds.forEach((groupId, index) => {
      const students = groupMap.get(groupId) || [];
      const statusInfo = startStatuses.find(s => s.groupId === groupId);
      const { jobAssignment, progress } = jobProgressData[index];
      
      groupsArray.push({
        group_id: groupId,
        students: students.sort((a, b) => {
          const aName = a.f_name || '';
          const bName = b.f_name || '';
          return aName.localeCompare(bName);
        }),
        isStarted: statusInfo ? statusInfo.started : false,
        jobAssignment,
        progress
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
        isStarted: false,
        jobAssignment: 'N/A',
        progress: 'N/A'
      });
    }
    
    groupsArray.sort((a, b) => {
      if (a.group_id === -1) return 1; 
      if (b.group_id === -1) return -1;
      return a.group_id - b.group_id;
    });

    setGroups(groupsArray);
  };

  const refreshGroupsAndStudents = async () => {
    if (!selectedClass) return;

    try {
      const [studentResponse, groupsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/groups/students-by-class/${selectedClass}`, {
          credentials: 'include'
        }),
        fetch(`${API_BASE_URL}/groups?class=${selectedClass}`, {
          credentials: 'include'
        })
      ]);

      if (studentResponse.ok && groupsResponse.ok) {
        const studentData = await studentResponse.json();
        const groupData = await groupsResponse.json();
        
        const groupNumbers = Array.isArray(groupData) 
          ? groupData.map(Number).sort((a, b) => a - b)
          : [];

        setStudents(studentData);
        setAvailableGroups(groupNumbers);
        
        if (groupNumbers.length > 0) {
          await organizeStudentsIntoGroups(studentData, groupNumbers);
        }
      }
    } catch (error) {
      console.error('Error refreshing groups and students:', error);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleUserAdded = () => {
      console.log('User added event received, refreshing data...');
      refreshGroupsAndStudents();
    };

    socket.on('userAdded', handleUserAdded);

    return () => {
      socket.off('userAdded', handleUserAdded);
    };
  }, [socket, selectedClass]);

  useEffect(() => {
    if (!socket || !selectedClass) return;

    const handleProgressUpdated = async (data: { crn: string; group_id: number; step: string; email: string }) => {
      console.log('Progress updated event received:', data);
      
      if (data.crn === selectedClass) {
        try {
          const { jobAssignment, progress } = await fetchGroupJobAndProgress(data.group_id, selectedClass);
          
          setGroups(prevGroups => 
            prevGroups.map(group => 
              group.group_id === data.group_id 
                ? { ...group, progress }
                : group
            )
          );
          
          console.log(`Updated progress for group ${data.group_id} to: ${progress}`);
        } catch (error) {
          console.error('Error refreshing progress:', error);
        }
      }
    };

    socket.on('progressUpdated', handleProgressUpdated);

    return () => {
      socket.off('progressUpdated', handleProgressUpdated);
    };
  }, [socket, selectedClass]);

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
    const fetchStudentsAndOrganize = async () => {
      if (!selectedClass) {
        setStudents([]);
        setGroups([]);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/groups/students-by-class/${selectedClass}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const studentData = await response.json();
          setStudents(studentData);
          
          if (availableGroups.length > 0) {
            await organizeStudentsIntoGroups(studentData, availableGroups);
          }
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudentsAndOrganize();
  }, [selectedClass, availableGroups]);

  // Fetch available jobs when modal opens
  useEffect(() => {
    const fetchJobs = async () => {
      if (!assignJobModalOpen) return;

      try {
        const response = await fetch(`${API_BASE_URL}/jobs`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const jobsData = await response.json();
          setAvailableJobs(jobsData);
          if (jobsData.length > 0) {
            setSelectedJobId(jobsData[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };

    fetchJobs();
  }, [assignJobModalOpen]);

  const assignJobToGroup = async () => {
    if (!selectedGroupForJob || !selectedJobId || !selectedClass) return;

    setIsAssigningJob(true);

    try {
      const selectedJob = availableJobs.find(job => job.id === selectedJobId);
      
      if (!selectedJob) {
        setPopup({ headline: 'Error', message: 'Selected job not found.' });
        setIsAssigningJob(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/jobs/update-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          job_group_id: selectedGroupForJob,
          class_id: selectedClass,
          job: selectedJob.title
        }),
      });

      if (response.ok) {
        await refreshGroupsAndStudents();
        
        setPopup({ headline: 'Success', message: 'Job assigned successfully!' });
        setAssignJobModalOpen(false);
        setSelectedGroupForJob(null);
        setSelectedJobId(null);
      } else {
        const errorData = await response.json();
        setPopup({ headline: 'Error', message: `Failed to assign job: ${errorData.error || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error assigning job:', error);
      setPopup({ headline: 'Error', message: 'Failed to assign job. Please try again.' });
    } finally {
      setIsAssigningJob(false);
    }
  };

  const createNewGroup = async () => {
    if (!selectedClass) return;

    setIsCreatingGroup(true);

    try {
      const maxGroupNumber = Math.max(...availableGroups, 0);
      const nextGroupNumber = maxGroupNumber + 1;

      const response = await fetch(`${API_BASE_URL}/groups/create-single-group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          class_id: selectedClass,
          group_id: nextGroupNumber
        }),
      });

      if (response.ok) {
        await refreshGroupsAndStudents();
        
        setPopup({ headline: 'Success', message: `Group ${nextGroupNumber} created successfully!` });
      } else {
        const errorData = await response.json();
        setPopup({ headline: 'Error', message: `Failed to create group: ${errorData.error || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error creating group:', error);
      setPopup({ headline: 'Error', message: 'Failed to create group. Please try again.' });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
  };

  const reassignStudent = async (studEmail: string, newGroup: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/reassign-student`, {
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
        await refreshGroupsAndStudents();
        
        setReassignModalOpen(false);
        setSelectedStudent(null);
        setPopup({ headline: 'Success', message: 'Student reassigned successfully!' });
      } else {
        const errorData = await response.json();
        setPopup({ headline: 'Error', message: `Failed to reassign student: ${errorData.error || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error reassigning student:', error);
      setPopup({ headline: 'Error', message: 'Failed to reassign student. Please try again.' });
    }
  };

  const removeStudentFromGroup = async (email: string) => {
    setConfirmAction({ type: 'removeStudent', data: email });
    setConfirmModalOpen(true);
  };

  const deleteStudent = async (email: string) => {
    setConfirmAction({ type: 'deleteStudent', data: email });
    setConfirmModalOpen(true);
  };

  const startAllGroups = async () => {
    setConfirmAction({ type: 'startAllGroups', data: null });
    setConfirmModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setConfirmModalOpen(false);

    switch (confirmAction.type) {
      case 'removeStudent':
        await executeRemoveStudent(confirmAction.data);
        break;
      case 'deleteStudent':
        await executeDeleteStudent(confirmAction.data);
        break;
      case 'startAllGroups':
        await executeStartAllGroups();
        break;
    }

    setConfirmAction(null);
  };

  const executeRemoveStudent = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/remove-from-group`, {
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
        await refreshGroupsAndStudents();
        
        setPopup({ headline: 'Success', message: 'Student removed from group successfully!' });
      } else {
        const errorData = await response.json();
        setPopup({ headline: 'Error', message: `Failed to remove student: ${errorData.error || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error removing student:', error);
      setPopup({ headline: 'Error', message: 'Failed to remove student. Please try again.' });
    }
  };

  const executeDeleteStudent = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/delete-student`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          class_id: selectedClass
        }),
      });
      if (response.ok) {
        await refreshGroupsAndStudents();
        
        setPopup({ headline: 'Success', message: 'Student deleted successfully!' });
      } else {
        const errorData = await response.json();
        setPopup({ headline: 'Error', message: `Failed to delete student: ${errorData.error || 'Unknown error'}` });
      }
    } catch (error) {
      setPopup({ headline: 'Error', message: 'Failed to delete student. Please try again.' });
    }
  };

  const executeStartAllGroups = async () => {
    setIsStartingAll(true);

    try {
      const response = await fetch(`${API_BASE_URL}/groups/start-all-groups`, {
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
        setGroups(prev => prev.map(group => ({ ...group, isStarted: true })));
        setPopup({ headline: 'Success', message: 'All groups started successfully!' });
      } else {
        const errorData = await response.json();
        setPopup({ headline: 'Error', message: `Failed to start all groups: ${errorData.error || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error starting all groups:', error);
      setPopup({ headline: 'Error', message: 'Failed to start all groups. Please try again.' });
    } finally {
      setIsStartingAll(false);
    }
  };
  
  const startGroup = async (groupId: number) => {
    setStartingGroups(prev => new Set(prev).add(groupId));

    try {
      const response = await fetch(`${API_BASE_URL}/groups/start-group`, {
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
        setPopup({ headline: 'Success', message: `Group ${groupId} started successfully!` });
      } else {
        const errorData = await response.json();
        setPopup({ headline: 'Error', message: `Failed to start group: ${errorData.error || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error starting group:', error);
      setPopup({ headline: 'Error', message: 'Failed to start group. Please try again.' });
    } finally {
      setStartingGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-northeasternWhite font-rubik">
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

  if (!user) {
    return (
      <div className="flex flex-col h-full overflow-auto bg-northeasternWhite font-rubik">
        <div className="w-full p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
            <p className="text-gray-600">You must be logged in to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-northeasternWhite font-rubik">
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

  return (
    <div className="bg-northeasternWhite font-rubik">
      <div className="w-full p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">📚 Manage Groups 📚</h1>
            {selectedClass && (
              <div className="flex space-x-3">
                <button
                  onClick={createNewGroup}
                  disabled={isCreatingGroup}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isCreatingGroup
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-northeasternRed text-northeasternWhite hover:bg-northeasternWhite hover:text-northeasternRed'
                  }`}
                >
                  {isCreatingGroup ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    '➕ New Group'
                  )}
                </button>
                {groups.length > 0 && (
                  <button
                    onClick={startAllGroups}
                    disabled={isStartingAll || groups.every(g => g.isStarted)}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      isStartingAll || groups.every(g => g.isStarted)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-northeasternRed text-northeasternWhite hover:bg-northeasternWhite hover:text-northeasternRed'
                    }`}
                  >
                    {isStartingAll ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                        Starting All...
                      </div>
                    ) : (
                      '🚀 Start All Groups'
                    )}
                  </button>
                )}
              </div>
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
              <div className="flex justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full gap-4">
                  {groups.map((group) => (
                    <div key={group.group_id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col h-full min-w-[400px]">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {group.group_id !== -1 ? `Group ${group.group_id}` : 'No Group'}
                          </h3>
                        </div>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {group.students.length} student{group.students.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {group.group_id !== -1 && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-gray-600 uppercase">Job Assignment</p>
                            <p className="text-sm text-gray-800">{group.jobAssignment}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase">Progress</p>
                            <p className="text-sm text-gray-800 capitalize">{group.progress?.replace('_', ' ')}</p>
                          </div>
                        </div>
                      )}

                        <div className="flex-1 flex flex-col justify-center mb-4">
                          {group.students.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center min-h-[120px]">
                              <p className="text-gray-400 text-base italic text-center">No students in this group</p>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                              {group.students.map((student) => (

                              <div key={student.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="mb-3">
                                  <p className="font-medium text-gray-900 text-base">
                                    {student.f_name && student.l_name 
                                      ? `${student.f_name} ${student.l_name}`
                                      : student.f_name || student.l_name || 'No Name'
                                    }
                                  </p>
                                  <p className="text-sm text-gray-600 truncate" title={student.email}>
                                    {student.email}
                                  </p>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => {
                                      setSelectedStudent(student);
                                      setNewGroupId(availableGroups.length > 0 ? availableGroups[0] : 1);
                                      setReassignModalOpen(true);
                                    }}
                                    className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 py-2 px-3 rounded-md text-sm font-medium transition-colors"
                                    title="Reassign student"
                                  >
                                    ↻ Reassign
                                  </button>
                                  {group.group_id === -1 ? (
                                    <button
                                      onClick={() => deleteStudent(student.email)}
                                      className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 py-2 px-3 rounded-md text-sm font-medium transition-colors"
                                      title="Delete student"
                                    >
                                      × Delete
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => removeStudentFromGroup(student.email)}
                                      className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 py-2 px-3 rounded-md text-sm font-medium transition-colors"
                                      title="Remove from group"
                                    >
                                      × Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setAddStudentGroupId(group.group_id);
                            setAddStudentEmail('');
                            setAddStudentModalOpen(true);
                          }}
                          className="w-full mt-2 bg-green-100 text-green-700 hover:bg-green-200 py-2 px-3 rounded-md text-sm font-medium transition-colors"
                        >
                          ➕ Add Student to Group
                        </button>
                      </div>
                      <div className="mt-auto pt-4 border-t border-gray-100 space-y-2">
                        {group.group_id !== -1 && (
                          <button
                            onClick={() => {
                              setSelectedGroupForJob(group.group_id);
                              setAssignJobModalOpen(true);
                            }}
                            className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors bg-northeasternRed text-white hover:bg-red-700"
                          >
                            💼 Assign Job
                          </button>
                        )}
                        <button
                          onClick={() => startGroup(group.group_id)}
                          disabled={group.isStarted || startingGroups.has(group.group_id)}
                          className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                            group.isStarted || startingGroups.has(group.group_id)
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {startingGroups.has(group.group_id) ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Starting...
                            </div>
                          ) : group.isStarted ? (
                            '✅ Started'
                          ) : (
                            '🚀 Start Group'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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

      {/* Assign Job Modal */}
      {assignJobModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Assign Job to Group {selectedGroupForJob}</h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Job:
            </label>
            <select
              value={selectedJobId || ''}
              onChange={e => setSelectedJobId(parseInt(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
            >
              {availableJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
            <div className="flex space-x-3">
              <button
                onClick={assignJobToGroup}
                disabled={isAssigningJob || !selectedJobId}
                className={`flex-1 bg-northeasternRed text-white py-2 px-4 rounded-lg hover:bg-red-700 ${isAssigningJob ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isAssigningJob ? 'Assigning...' : 'Assign Job'}
              </button>
              <button
                onClick={() => {
                  setAssignJobModalOpen(false);
                  setSelectedGroupForJob(null);
                  setSelectedJobId(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {addStudentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add Student to Group {addStudentGroupId}</h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Email:
            </label>
            <input
              type="email"
              value={addStudentEmail}
              onChange={e => setAddStudentEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="Enter student email"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={async () => {
                  if (!addStudentEmail || !addStudentGroupId) return;
                  setIsAddingStudent(true);
                  try {
                    const response = await fetch(`${API_BASE_URL}/groups/add-student`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        email: addStudentEmail,
                        class_id: selectedClass,
                        group_id: addStudentGroupId,
                      }),
                    });
                    if (response.ok) {
                      await refreshGroupsAndStudents();
                      setPopup({ headline: 'Success', message: 'Student added successfully!' });
                      setAddStudentModalOpen(false);
                    } else {
                      const errorData = await response.json();
                      setPopup({ headline: 'Error', message: `Failed to add student: ${errorData.error || 'Unknown error'}` });
                    }
                  } catch (error) {
                    setPopup({ headline: 'Error', message: 'Failed to add student. Please try again.' });
                  } finally {
                    setIsAddingStudent(false);
                  }
                }}
                disabled={isAddingStudent || !addStudentEmail}
                className={`flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 ${isAddingStudent ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isAddingStudent ? 'Adding...' : 'Add Student'}
              </button>
              <button
                onClick={() => setAddStudentModalOpen(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Confirm Action</h3>
            <p className="text-gray-600 mb-6">
              {confirmAction?.type === 'removeStudent' && 'Are you sure you want to remove this student from their group?'}
              {confirmAction?.type === 'deleteStudent' && 'Are you sure you want to permanently delete this student?'}
              {confirmAction?.type === 'startAllGroups' && 'Are you sure you want to start all groups? This action cannot be undone.'}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmAction}
                className="flex-1 bg-northeasternRed text-white py-2 px-4 rounded-lg hover:bg-red-700"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setConfirmModalOpen(false);
                  setConfirmAction(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Student Modal */}
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
              Current group: Group {selectedStudent.group_id}
              {(() => {
                const currentGroup = groups.find(g => g.group_id === selectedStudent.group_id);
                return currentGroup?.isStarted ? (
                  <span className="ml-2 text-green-600 text-sm">✅ Started</span>
                ) : (
                  <span className="ml-2 text-gray-500 text-sm">⏳ Not Started</span>
                );
              })()}
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
                {availableGroups.map((groupId) => (
                  <option key={groupId} value={groupId}>
                    Group {groupId}
                  </option>
                ))}
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

      {/* Popup */}
      {popup && (
        <Popup
          headline={popup.headline}
          message={popup.message}
          onDismiss={() => setPopup(null)}
        />
      )}
    </div>
  );
}