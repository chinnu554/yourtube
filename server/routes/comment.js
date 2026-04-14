import express from "express";
import {
  deletecomment,
  editcomment,
  getallcomment,
  postcomment,
  reacttocomment,
  translatecomment,
} from "../controllers/comment.js";


const routes = express.Router();
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);
routes.post("/react/:id", reacttocomment);
routes.post("/translate/:id", translatecomment);
export default routes;
