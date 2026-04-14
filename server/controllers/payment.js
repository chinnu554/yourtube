import crypto from "crypto";
import mongoose from "mongoose";
import payment from "../Modals/payment.js";
import users from "../Modals/Auth.js";
import { getPlanConfig } from "../config/plans.js";
import { sendPlanInvoiceEmail } from "../services/invoiceEmail.js";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const ensureRazorpayConfig = () => {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are not configured.");
  }
};

export const createpremiumorder = async (req, res) => {
  const { userId, plan = "gold" } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user." });
  }

  try {
    ensureRazorpayConfig();
    const selectedPlan = String(plan).toLowerCase();
    const planConfig = getPlanConfig(selectedPlan);

    if (selectedPlan === "free") {
      return res.status(400).json({ message: "Free plan does not require payment." });
    }

    const existingUser = await users.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: "User unavailable." });
    }

    if (existingUser.currentPlan === selectedPlan) {
      return res.status(200).json({
        alreadyPremium: true,
        message: `You are already on the ${planConfig.name} plan.`,
      });
    }

    const authHeader = Buffer.from(
      `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: planConfig.amount,
        currency: planConfig.currency,
        receipt: `${selectedPlan}_${Date.now()}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Order creation failed with status ${response.status}`);
    }

    const order = await response.json();

    await payment.create({
      userid: userId,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: selectedPlan,
      status: "created",
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      plan: selectedPlan,
      planName: planConfig.name,
      watchLimitMinutes: planConfig.watchLimitMinutes,
    });
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({
      message:
        error.message || "Unable to start premium payment right now.",
    });
  }
};

export const verifypremiumpayment = async (req, res) => {
  const {
    userId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user." });
  }

  try {
    ensureRazorpayConfig();

    const existingPayment = await payment.findOne({
      userid: userId,
      razorpayOrderId: razorpay_order_id,
    });

    if (!existingPayment) {
      return res.status(404).json({ message: "Payment order unavailable." });
    }

    const planConfig = getPlanConfig(existingPayment.plan);

    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      await payment.findByIdAndUpdate(existingPayment._id, {
        $set: {
          status: "failed",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
      });

      return res.status(400).json({ message: "Payment verification failed." });
    }

    await payment.findByIdAndUpdate(existingPayment._id, {
      $set: {
        status: "paid",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
    });

    const activatedAt = new Date();
    const updatedUser = await users.findByIdAndUpdate(
      userId,
      {
        $set: {
          isPremium: planConfig.isPremium,
          premiumPlan: existingPayment.plan,
          currentPlan: existingPayment.plan,
          watchLimitMinutes:
            planConfig.watchLimitMinutes === null
              ? null
              : planConfig.watchLimitMinutes,
          premiumActivatedAt: activatedAt,
          premiumPaymentId: razorpay_payment_id,
        },
      },
      { new: true }
    );

    const emailResult = await sendPlanInvoiceEmail({
      email: updatedUser?.email,
      userName: updatedUser?.name,
      plan: existingPayment.plan,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
      activatedAt,
    }).catch((error) => {
      console.error("Invoice email error:", error);
      return { sent: false, reason: "Email delivery failed." };
    });

    return res.status(200).json({
      message: `${planConfig.name} plan unlocked successfully.`,
      result: updatedUser,
      invoiceEmailSent: emailResult?.sent || false,
    });
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({
      message:
        error.message || "Unable to verify premium payment right now.",
    });
  }
};
