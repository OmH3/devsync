import mongoose from "mongoose";
import { config } from "./app.config.js";

const connectDatabase = async ()=>{
    try {
        await mongoose.connect(config.MONGO_URI);
        console.log("Database connected successfully");
    } catch (error) {
        console.error("Error connecting to the database:", error.message);
        process.exit(1);
    }
}

export default connectDatabase;