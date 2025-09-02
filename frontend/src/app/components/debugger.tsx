import React, { useEffect } from 'react';
const EnvDebugger = () => {
    useEffect(() => {
        console.log("=== COMPLETE ENV DEBUG ===");
        console.log("Node ENV:", process.env.NODE_ENV);
        console.log("All process.env:", process.env);
        console.log("Object.keys(process.env):", Object.keys(process.env));
        
        console.log("NEXT_PUBLIC_API_BASE_URL:", process.env.NEXT_PUBLIC_API_BASE_URL);
        
        const envs = Object.keys(process.env)
        console.log("Found env variables:", envs);
    }, []);
    
    return (
        <div style={{ padding: '20px', background: '#f0f0f0', margin: '10px' }}>
        </div>
    );
};

// Use this component in your main component temporarily
export default EnvDebugger;