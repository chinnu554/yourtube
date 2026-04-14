export const PLAN_CONFIG = {
  free: {
    name: "Free",
    amount: 0,
    currency: "INR",
    watchLimitMinutes: 5,
    isPremium: false,
  },
  bronze: {
    name: "Bronze",
    amount: 1000,
    currency: "INR",
    watchLimitMinutes: 7,
    isPremium: true,
  },
  silver: {
    name: "Silver",
    amount: 5000,
    currency: "INR",
    watchLimitMinutes: 10,
    isPremium: true,
  },
  gold: {
    name: "Gold",
    amount: 10000,
    currency: "INR",
    watchLimitMinutes: null,
    isPremium: true,
  },
};

export const getPlanConfig = (plan = "free") =>
  PLAN_CONFIG[plan] || PLAN_CONFIG.free;
