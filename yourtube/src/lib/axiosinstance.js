import axios from "axios";
import { getBackendUrl } from "./media";

const axiosInstance = axios.create({
  baseURL: getBackendUrl(),
});

export default axiosInstance;
