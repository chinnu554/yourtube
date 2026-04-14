import express from "express";
import {
  createpremiumorder,
  verifypremiumpayment,
} from "../controllers/payment.js";

const routes = express.Router();

routes.post("/create-order", createpremiumorder);
routes.post("/verify", verifypremiumpayment);

export default routes;
