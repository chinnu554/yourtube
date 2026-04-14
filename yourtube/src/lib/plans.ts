export const PLAN_CONFIG = {
  free: {
    name: "Free",
    priceLabel: "Rs. 0",
    watchLimitMinutes: 5,
  },
  bronze: {
    name: "Bronze",
    priceLabel: "Rs. 10",
    watchLimitMinutes: 7,
  },
  silver: {
    name: "Silver",
    priceLabel: "Rs. 50",
    watchLimitMinutes: 10,
  },
  gold: {
    name: "Gold",
    priceLabel: "Rs. 100",
    watchLimitMinutes: null,
  },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIG;

export const getPlanConfig = (plan?: string | null) =>
  PLAN_CONFIG[(plan as PlanKey) || "free"] || PLAN_CONFIG.free;
