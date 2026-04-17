import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, createContext, useEffect, useContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

const resolveStateFromCoordinates = async (latitude, longitude) => {
  try {
    const endpoint = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
    endpoint.searchParams.set("latitude", latitude.toString());
    endpoint.searchParams.set("longitude", longitude.toString());
    endpoint.searchParams.set("localityLanguage", "en");

    const response = await fetch(endpoint.toString(), { headers: { Accept: "application/json" } });
    if (!response.ok) return "Unknown";

    const payload = await response.json();
    return payload?.principalSubdivision || "Unknown";
  } catch (error) {
    // using console.warn to avoid turbopack hard overlay in dev on network failures
    console.warn("Error resolving state:", error?.message || error);
    return "Unknown";
  }
};

const getCurrentState = async () => {
  if (typeof window === "undefined" || !navigator.geolocation) return "Unknown";

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      });
    });

    return await resolveStateFromCoordinates(
      position.coords.latitude,
      position.coords.longitude
    );
  } catch (error) {
    console.error("Geolocation error:", error);
    return "Unknown";
  }
};

const SOUTHERN_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana"
];

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRegion, setUserRegion] = useState("Unknown");

  const evaluateAndApplyTheme = async () => {
    try {
      const state = await getCurrentState();
      setUserRegion(state);

      // Check current time in IST
      const now = new Date();
      // Format time directly in IST
      const istTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: false, hour: 'numeric', minute: 'numeric' });
      // istTimeStr example: "10:30" or "24:00" or "9:15"
      const [hourStr, minStr] = istTimeStr.split(":");
      const hour = parseInt(hourStr, 10);
      const min = parseInt(minStr, 10);
      const isBetween10and12IST = (hour === 10) || (hour === 11) || (hour === 12 && min === 0);

      const isSouthernState = SOUTHERN_STATES.includes(state);

      if (isSouthernState && isBetween10and12IST) {
        document.documentElement.classList.remove("dark");
      } else {
        document.documentElement.classList.add("dark");
      }
    } catch (e) {
      console.error(e);
      document.documentElement.classList.add("dark"); // Default fallback
    }
  };

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
    // Apply theme whenever logged in
    evaluateAndApplyTheme();
  };

  const logout = async () => {
    setUser(null);
    setUserRegion("Unknown");
    localStorage.removeItem("user");
    // Re-apply the location/time based theme rule for signed-out sessions too.
    await evaluateAndApplyTheme();
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      const response = await axiosInstance.post("/user/login", payload);
      login(response.data.result);
    } catch (error) {
      console.error(error);
    }
  };

  // Add a generic function so components can trigger auth changes manually 
  const updateAuthToken = (userdata) => {
    login(userdata);
  }

  useEffect(() => {
    // Call it immediately on access
    evaluateAndApplyTheme();

    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      const localUser = localStorage.getItem("user");
      if (localUser) {
        setUser(JSON.parse(localUser));
        return;
      }
      
      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);
          login(response.data.result);
        } catch (error) {
          console.error(error);
          logout();
        }
      }
    });
    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout, handlegooglesignin, userRegion, getCurrentState, SOUTHERN_STATES }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
