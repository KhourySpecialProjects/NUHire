import React, { useEffect } from 'react';
const EnvDebugger = () => {
    useEffect(() => {
        console.log("=== COMPLETE ENV DEBUG ===");
        console.log("Node ENV:", process.env.NODE_ENV);
        console.log("All process.env:", process.env);
        console.log("Object.keys(process.env):", Object.keys(process.env));
        
        // Check specific variables
        console.log("NEXT_PUBLIC_API_BASE_URL:", process.env.NEXT_PUBLIC_API_BASE_URL);
        
        // Check if any REACT_APP variables exist
        const envs = Object.keys(process.env)
        console.log("Found env variables:", envs);
    }, []);
    
    return (
        <div style={{ padding: '20px', background: '#f0f0f0', margin: '10px' }}>
            <h3>Environment Debug</h3>
            <p>NODE_ENV: {process.env.NODE_ENV}</p>
            <p>REACT_APP_KEYCLOAK_URL: {process.env.REACT_APP_KEYCLOAK_URL || 'UNDEFINED'}</p>
            <p>Total env vars: {Object.keys(process.env).length}</p>
            <details>
                <summary>All env vars</summary>
                <pre>{JSON.stringify(process.env, null, 2)}</pre>
            </details>
        </div>
    );
};

// Use this component in your main component temporarily
export default EnvDebugger;