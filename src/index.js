import dotenv from "dotenv";
import connectDB from "./db/database-connect.js";

dotenv.config({
    path: "./.env"
});

connectDB();

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