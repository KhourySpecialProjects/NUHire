import React, { useEffect } from 'react';
const EnvDebugger = () => {
    useEffect(() => {
        console.log("=== COMPLETE ENV DEBUG ===");
        console.log("Node ENV:", process.env.NODE_ENV);
        console.log("All process.env:", process.env);
        console.log("Object.keys(process.env):", Object.keys(process.env));
        
        // Check specific variables
        console.log("REACT_APP_KEYCLOAK_URL:", process.env.REACT_APP_KEYCLOAK_URL);
        console.log("REACT_APP_API_BASE_URL:", process.env.REACT_APP_API_BASE_URL);
        console.log("REACT_APP_NEXT_PUBLIC_API_BASE_URL:", process.env.REACT_APP_NEXT_PUBLIC_API_BASE_URL);
        
        // Check if any REACT_APP variables exist
        const reactAppVars = Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'));
        console.log("Found REACT_APP_ variables:", reactAppVars);
        
        // Check if running in development vs production
        console.log("Build mode:", process.env.NODE_ENV);
        console.log("Is production build:", process.env.NODE_ENV === 'production');
        
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