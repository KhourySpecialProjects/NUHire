

import { useEffect } from "react";

const allowedRoutes: Record<string, string[]> = {
  "/job_description": ["job_description", "res_1", "res_2", "interview", "offer", "employer"],
  "/res_1": ["res_1", "res_2", "interview", "offer", "employer"],
  "/res_2": ["res_2", "interview", "offer", "employer"],
  "/interview": ["interview", "offer", "employer"],
  "/offer": ["offer", "employer"],
  "/employer": ["employer"],
};

export const useProgress = () => {
  useEffect(() => {
    const progress = localStorage.getItem("progress") || "none"; 
    const currentPath = window.location.pathname;

    if (!(currentPath in allowedRoutes)) return;


    if (!allowedRoutes[currentPath].includes(progress)) {
      window.location.replace(`/${progress}`); 
    }
  }, []);
};