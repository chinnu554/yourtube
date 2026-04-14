"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, Crown, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIG, PlanKey } from "@/lib/plans";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function PremiumUpgrade() {
  const { user, login } = useUser();
  const [isLoadingPlan, setIsLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (plan: PlanKey) => {
    if (!user?._id) {
      toast.error("Sign in to upgrade your plan.");
      return;
    }

    setIsLoadingPlan(plan);
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast.error("Unable to load Razorpay checkout right now.");
        return;
      }

      const orderResponse = await axiosInstance.post("/payment/create-order", {
        userId: user._id,
        plan,
      });

      if (orderResponse.data.alreadyPremium) {
        toast.success(orderResponse.data.message);
        return;
      }

      const selectedPlan = PLAN_CONFIG[plan];
      const options = {
        key: orderResponse.data.keyId,
        amount: orderResponse.data.amount,
        currency: orderResponse.data.currency,
        name: `YourTube ${selectedPlan.name}`,
        description:
          selectedPlan.watchLimitMinutes === null
            ? "Unlimited video watching time"
            : `${selectedPlan.watchLimitMinutes} minutes watching time per video`,
        order_id: orderResponse.data.orderId,
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#dc2626",
        },
        handler: async (response: any) => {
          const verifyResponse = await axiosInstance.post("/payment/verify", {
            userId: user._id,
            ...response,
          });

          if (verifyResponse.data.result) {
            login(verifyResponse.data.result);
            toast.success(
              verifyResponse.data.invoiceEmailSent
                ? `${selectedPlan.name} plan unlocked. Invoice email sent.`
                : `${selectedPlan.name} plan unlocked successfully.`
            );
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
      });
      razorpay.open();
    } catch (error: any) {
      console.error("Plan upgrade error:", error);
      toast.error(
        error?.response?.data?.message ||
          "Unable to start plan checkout right now."
      );
    } finally {
      setIsLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-gradient-to-br from-amber-50 via-white to-rose-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
              <Crown className="h-4 w-4" />
              Upgrade Plans
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Choose the right watch-time plan for your viewing style
            </h1>
            <p className="text-sm text-gray-600">
              Free users can watch only 5 minutes per video. Upgrade to Bronze,
              Silver, or Gold for more viewing time and paid-plan benefits.
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm md:min-w-72">
            <p className="text-sm text-gray-500">Current plan</p>
            <p className="mt-1 text-3xl font-bold capitalize">
              {user?.currentPlan || user?.premiumPlan || "free"}
            </p>
            <p className="mt-1 text-xs text-gray-500">Razorpay test mode checkout</p>
            <p className="mt-4 text-sm text-gray-600">
              Every successful upgrade sends an invoice email with your plan details.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {Object.entries(PLAN_CONFIG).map(([planKey, config]) => {
          const isCurrentPlan =
            (user?.currentPlan || user?.premiumPlan || "free") === planKey;

          return (
            <div key={planKey} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-600">
                {config.name}
              </div>
              <p className="text-3xl font-bold">{config.priceLabel}</p>
              <p className="mt-2 text-sm text-gray-600">
                {config.watchLimitMinutes === null
                  ? "Unlimited watch time"
                  : `${config.watchLimitMinutes} minutes per video`}
              </p>
              <div className="mt-4 space-y-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-600" />
                  {config.watchLimitMinutes === null
                    ? "Watch without time limits"
                    : `Watch up to ${config.watchLimitMinutes} minutes`}
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-red-600" />
                  {planKey === "free"
                    ? "1 download per day"
                    : "Unlimited downloads"}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Invoice email after payment
                </div>
              </div>
              <Button
                className="mt-5 w-full rounded-full"
                variant={isCurrentPlan ? "secondary" : "default"}
                disabled={isCurrentPlan || isLoadingPlan === planKey || planKey === "free"}
                onClick={() => handleUpgrade(planKey as PlanKey)}
              >
                {planKey === "free"
                  ? "Current free plan"
                  : isCurrentPlan
                  ? "Current plan"
                  : isLoadingPlan === planKey
                  ? "Opening checkout..."
                  : `Upgrade to ${config.name}`}
              </Button>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-5">
          <Sparkles className="mb-3 h-6 w-6 text-amber-600" />
          <h2 className="font-semibold">Flexible value ladder</h2>
          <p className="mt-2 text-sm text-gray-600">
            Move from Free to Bronze, Silver, or Gold based on how much you watch.
          </p>
        </div>
        <div className="rounded-2xl border p-5">
          <CheckCircle2 className="mb-3 h-6 w-6 text-emerald-600" />
          <h2 className="font-semibold">Verified upgrades</h2>
          <p className="mt-2 text-sm text-gray-600">
            Plan upgrades apply only after Razorpay payment verification succeeds.
          </p>
        </div>
        <div className="rounded-2xl border p-5">
          <Crown className="mb-3 h-6 w-6 text-amber-600" />
          <h2 className="font-semibold">Invoice transparency</h2>
          <p className="mt-2 text-sm text-gray-600">
            Every successful plan purchase can send a confirmation email with invoice details.
          </p>
        </div>
      </section>
    </div>
  );
}
