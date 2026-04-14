import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  username: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  isPremium: { type: Boolean, default: false },
  premiumPlan: { type: String, default: "free" },
  currentPlan: { type: String, default: "free" },
  watchLimitMinutes: { type: Number, default: 5 },
  premiumActivatedAt: { type: Date, default: null },
  premiumPaymentId: { type: String, default: null },
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);
