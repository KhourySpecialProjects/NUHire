'use client';

import React from 'react'
import Navbar from '../components/navbar'
import { useProgress } from '../components/useProgress';
import { useProgressManager } from '../components/progress';

export default function EmployerPannel() {
    useProgress();

    const {updateProgress, fetchProgress} = useProgressManager();

    const completeAssignment = () => {
      
      localStorage.setItem("progress", "employerPannel");
      window.location.href = '/dashboard';
    }
      return (
        <div>
          <Navbar />
          <h1>Here is a video about what an employer would do...</h1>
          <button onClick={completeAssignment}>Back to Dashboard</button>
        </div>
      )
      
};