export default class CircuitBreaker {
    constructor(requestFunction, options = {}) {
        // Function to make the external request
        this.requestFunction = requestFunction;

        // Configuration options
        this.failureThreshold = options.failureThreshold || 3; // Number of failures to open the circuit
        this.cooldownPeriod = options.cooldownPeriod || 10000; // Time to stay open before testing again
        this.requestTimeout = options.requestTimeout || 5000; // Timeout for each request

        // Internal Circuit Breaker state
        this.state = "CLOSED"; // Other states: "OPEN", "HALF_OPEN"
        this.failureCount = 0;
        this.nextAttempt = Date.now(); // When the breaker is ready to be tested again if open
    }

    async fire(...args) {
        // Handle circuit breaker state
        console.log({
            state: this.state, nextAttempt: this.nextAttempt, failureCount: this.failureCount
        })
        if (this.state === "OPEN") {
            if (Date.now() > this.nextAttempt) {
                this.state = "HALF_OPEN";
            } else {
                throw new Error("Circuit is open. Request blocked.");
            }
        }

        try {
            // Attempt the request with a timeout
            const result = await this.requestWithTimeout(...args);
            this.successHandler();
            return result;
        } catch (error) {
            this.failureHandler();
            throw error;
        }
    }

    async requestWithTimeout(...args) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error("Request timed out"));
            }, this.requestTimeout);

            this.requestFunction(...args)
                .then((result) => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch((error) => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }

    successHandler() {
        this.failureCount = 0;
        this.state = "CLOSED";
    }

    failureHandler() {
        this.failureCount += 1;
        if (this.failureCount >= this.failureThreshold) {
            this.state = "OPEN";
            this.nextAttempt = Date.now() + this.cooldownPeriod;
        }
    }
}
