class ApiError extends Error {
    constructor(
        statusCode,
        message="Something went wrong.",
        errors=[],
        stack=""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };


// The purpose of creating a custom error class like ApiError is to provide more detailed error information, especially for APIs. Here's why it's useful:
// Custom Error Handling: By using ApiError, you can include custom properties like statusCode and errors, which give more information about what went wrong.
// Consistency: Instead of throwing generic JavaScript errors, you can throw this custom error with a standard structure, making error handling more consistent in your application.
// Stack Traces: By capturing and customizing stack traces, you can easily track the origin of the error and debug it efficiently.

// here's an Example of Usage:

// const { ApiError } = require('./ApiError');

// function someApiFunction() {
//     // Simulating an error
//     throw new ApiError(400, "Invalid input", ["Email is required", "Password is too short"]);
// }

// try {
//     someApiFunction();
// } catch (error) {
//     if (error instanceof ApiError) {
//         console.error(`Error: ${error.message}`);
//         console.error(`Status: ${error.statusCode}`);
//         console.error(`Details: ${JSON.stringify(error.errors)}`);
//     } else {
//         console.error("An unexpected error occurred");
//     }
// }