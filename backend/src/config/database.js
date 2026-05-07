import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI_DIRECT || process.env.MONGODB_URI;
        const conn = await mongoose.connect(uri, { family: 4 });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
