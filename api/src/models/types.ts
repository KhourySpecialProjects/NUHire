// src/models/types.ts

import { Request } from 'express';
import { Session } from 'express-session';

// User Types
export interface User {
  id: number;
  f_name: string;
  l_name: string;
  email: string;
  affiliation: 'student' | 'admin';
  group_id?: number;
  class?: number;
  current_page?: 'dashboard' | 'resumepage' | 'resumepage2' | 'jobdes' | 'interviewpage' | 'makeofferpage';
  seen?: number;
  keycloakProfile?: any;
}

export interface AuthRequest extends Request {
  user?: User;
  session: Session & { 
    passport?: { user?: number | string };
    isModerator?: boolean;
  };
}
// Resume Types
export interface Resume {
  student_id: number;
  group_id: number;
  class: number;
  timespent: number;
  resume_number: number;
  vote: string;
  checked?: boolean;
}

export interface ResumePdf {
  id: number;
  title: string;
  file_path: string;
}

// Interview Types
export interface Interview {
  student_id: number;
  group_id: number;
  class: number;
  question1: string;
  question2: string;
  question3: string;
  question4: string;
  candidate_id: number;
}

export interface InterviewStatus {
  student_id: number;
  finished: boolean;
  group_id: number;
  class: number;
}

export interface InterviewPopup {
  candidate_id: number;
  group_id: number;
  class: number;
  question1: number;
  question2: number;
  question3: number;
  question4: number;
}

// Candidate Types
export interface Candidate {
  id: number;
  resume_id: number;
  f_name: string;
  l_name: string;
  interview?: string;
}

// Job Types
export interface JobDescription {
  id: number;
  title: string;
  file_path: string;
}

export interface JobAssignment {
  group: number;
  class: number;
  job: string;
}

// Group Types
export interface GroupInfo {
  class_id: number;
  group_id: number;
  started: number;
  max_students?: number;
}

// Offer Types
export interface Offer {
  id: number;
  group_id: number;
  class_id: number;
  candidate_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at?: Date;
}

// Moderator Types
export interface Moderator {
  admin_email: string;
  crn: number;
  nom_groups?: number;
}

// Note Types
export interface Note {
  id: number;
  user_email: string;
  content: string;
  created_at: Date;
}

// Progress Types
export interface Progress {
  crn: number;
  group_id: number;
  step: string;
  email: string;
}

// Socket Event Types
export interface SocketEvents {
  // Connection events
  adminOnline: { adminEmail: string };
  studentOnline: { studentId: string };
  joinGroup: string;
  joinClass: { classId: number };
  
  // Checkbox events
  check: {
    group_id: string;
    resume_number: number;
    checked: boolean;
  };
  checkint: {
    group_id: string;
    interview_number: number;
    checked: boolean;
  };
  
  // Page change events
  studentPageChanged: {
    studentId: string;
    currentPage: string;
  };
  
  // Popup events
  sendPopupToGroups: {
    groups: number[];
    headline: string;
    message: string;
    class?: number;
    candidateId?: number;
  };
  
  // Rating events
  updateRatingsWithPresetBackend: {
    classId: number;
    groupId: number;
    candidateId: number;
    vote: string;
    isNoShow: boolean;
  };
  
  // Offer events
  makeOfferRequest: {
    classId: number;
    groupId: number;
    candidateId: number;
  };
  makeOfferResponse: {
    classId: number;
    groupId: number;
    candidateId: number;
    accepted: boolean;
  };
  
  // Navigation events
  moveGroup: {
    classId: number;
    groupId: number;
    targetPage: string;
  };
  
  // Interview events
  submitInterview: {
    currentVideoIndex: number;
    nextVideoIndex: number;
    isLastInterview: boolean;
    groupId: number;
    classId: number;
  };
  
  // Selection events
  offerSelected: {
    candidateId: number;
    groupId: number;
    classId: number;
    roomId: string;
    checked: boolean;
  };
  offerSubmitted: {
    candidateId: number;
    groupId: number;
    classId: number;
    roomId: string;
  };
  
  // Completion events
  userCompletedResReview: { groupId: number };
  confirmOffer: {
    groupId: number;
    classId: number;
    candidateId: number;
    studentId: string;
    roomId: string;
  };
  teamConfirmSelection: {
    groupId: number;
    classId: number;
    studentId: string;
    roomId: string;
  };
  teamUnconfirmSelection: {
    groupId: number;
    classId: number;
    studentId: string;
    roomId: string;
  };
  
  // Preset votes
  sentPresetVotes: {
    student_id: number;
    group_id: number;
    class: number;
    question1: number;
    question2: number;
    question3: number;
    question4: number;
    candidate_id: number;
  };
  
  // Group assignment
  allowGroupAssignment: {
    classId: number;
    message: string;
  };
  groupAssignmentClosed: {
    classId: number;
    message: string;
  };
}

// Database Query Result Types
export interface QueryResult<T = any> {
  affectedRows: number;
  insertId: number;
  changedRows: number;
  fieldCount: number;
  serverStatus: number;
  warningCount: number;
}

// CSV Import Types
export interface CSVAssignment {
  email: string;
  group_id: number;
}

export interface CSVImportResult {
  email: string;
  group_id?: number;
  action?: 'inserted' | 'updated';
  affectedRows?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

// File Upload Types
export interface FileUploadData {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}