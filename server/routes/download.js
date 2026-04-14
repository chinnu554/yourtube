import express from "express";
import { downloadvideo, getdownloads } from "../controllers/download.js";

const routes = express.Router();

routes.get("/:userId", getdownloads);
routes.post("/:videoId", downloadvideo);

export default routes;
