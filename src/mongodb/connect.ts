import mongoose from "mongoose";

const connectDB = async () => {
	const MONGO_URI = process.env.MONGO_URI

	try {
		if (MONGO_URI) {
			const conn = await mongoose.connect(MONGO_URI, {
				autoIndex: true,
				dbName: "test",
			});

			console.log(`MongoDB Connected: ${conn.connection.host}`);
		}
	} catch (err: any) {
		console.error(`MongoDB Error: ${err.message}`);
		process.exit(1);
	}
};

export default connectDB;
