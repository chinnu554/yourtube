import express from "express";
import { login, updateprofile } from "../controllers/auth.js";
import { sendOtp, verifyOtp } from "../controllers/otp.js";
const routes = express.Router();

routes.post("/login", login);
routes.post("/send-otp", sendOtp);
routes.post("/verify-otp", verifyOtp);
routes.patch("/update/:id", updateprofile);
export default routes;
