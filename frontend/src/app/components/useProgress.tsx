

import { useEffect } from "react";

const allowedRoutes: Record<string, string[]> = {
  "/jobdes": ["job_description", "res_1", "res_2", "interview", "offer", "employer"],
  "/res-review": ["res_1", "res_2", "interview", "offer", "employer"],
  "/res-review-group": ["res_2", "interview", "offer", "employer"],
  "/interview-stage": ["interview", "offer", "employer"],
  "/makeOffer": ["offer", "employer"],
  "/employerPanel": ["employer"],
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