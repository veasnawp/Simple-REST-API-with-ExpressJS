import mongoose from "mongoose";

const RecordsSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String },
    date: { type: String, required: true, unique: true },
    updatedDate: { type: String, required: false },
    amount: { type: Number, required: true },
    originalAmount: { type: Number },
    currency: { type: String },
    category: { type: String, required: true },
    childCategory: { type: String, required: false },
    paymentMethod: { type: String, required: true },
    note: { type: String, required: false },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});


const RecordsModel = mongoose.model("Records", RecordsSchema);

export default RecordsModel;