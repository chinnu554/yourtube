import mongoose from "mongoose";

const paymentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    plan: {
      type: String,
      default: "free",
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("payment", paymentschema);
