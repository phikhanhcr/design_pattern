import express from 'express'

import fetch from 'node-fetch';
import CircuitBreaker from './circuit_breaker.js';
const app = express();

// Define the external API request function
const externalApiCall = async () => {
    const response = await fetch("http://localhost:3000/local/common");
    if (!response.ok) {
        throw new Error("API call failed");
    }
    return await response.json();
};

// Instantiate Circuit Breaker with the external API function and options
const circuitBreaker = new CircuitBreaker(externalApiCall, {
    failureThreshold: 3,     // Open circuit after 3 failures
    cooldownPeriod: 10000,   // Stay open for 10 seconds before retrying
    requestTimeout: 5000     // Request timeout of 5 seconds
});

// Route using the Circuit Breaker
app.get("/data", async (req, res) => {
    try {
        const result = await circuitBreaker.fire();
        console.log({ result })
        res.json({ result });
    } catch (error) {
        res.status(503).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
