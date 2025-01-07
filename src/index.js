import dotenv from "dotenv";
import connectDB from "./db/database-connect.js";

dotenv.config({
    path: "./.env"
});

connectDB()
.then(() => {
    app.on("error", (error) => {
        console.log("Error: ", error);
        throw error;
    });
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
// Establishes a connection to a MongoDB database using 'dotenv' for environment variables and handles potential errors during connection and server startup.
        console.log(`Application listening on Port: ${port}`);
    });
})
.catch((error) => {
    console.log("MongoDB connection failed! ", error);
})

// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";

// import express from "express";
// const app = express();

// ;(async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         app.on("error", (error) => {
//             console.error("Error: ", error);
//             throw error;
//         });
//         app.listen(process.env.PORT, () => {
//             console.log(`App running on port: ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.error("Error: ", error);
//         throw error;
//     }
// })();