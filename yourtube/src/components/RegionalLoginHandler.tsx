import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { DropdownMenuSeparator } from "./ui/dropdown-menu";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { User, Loader2 } from "lucide-react";

const RegionalLoginHandler = () => {
  const { login, SOUTHERN_STATES, getCurrentState, handlegooglesignin } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [authStep, setAuthStep] = useState<"initial" | "request_otp" | "verify_otp">("initial");
  
  const [region, setRegion] = useState("Unknown");
  const [contactType, setContactType] = useState<"email" | "mobile">("email");
  const [contactValue, setContactValue] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const startLoginFlow = async () => {
    setIsOpen(true);
    setIsLocating(true);
    setAuthStep("initial");
    
    try {
      const state = await getCurrentState();
      setRegion(state);
      
      if (SOUTHERN_STATES.includes(state)) {
        setContactType("email");
      } else {
        setContactType("mobile");
      }
      setAuthStep("request_otp");
    } catch (e) {
      toast.error("Unable to verify your location. Defaulting to email login.");
      setContactType("email");
      setAuthStep("request_otp");
    } finally {
      setIsLocating(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactValue.trim()) return;

    setIsLoading(true);
    try {
      await axiosInstance.post("/user/send-otp", {
        contact: contactValue.trim(),
        type: contactType
      });
      toast.success(`OTP sent to your ${contactType}!`);
      setAuthStep("verify_otp");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue.trim()) return;

    setIsLoading(true);
    try {
      const res = await axiosInstance.post("/user/verify-otp", {
        contact: contactValue.trim(),
        otp: otpValue.trim()
      });
      
      if (res.data && res.data.result) {
        login(res.data.result);
        toast.success("Logged in successfully!");
        setIsOpen(false); // Close dialog
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 px-3 sm:px-4" onClick={(e) => {
          e.preventDefault();
          startLoginFlow();
        }}>
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">Sign in</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to YourTube</DialogTitle>
          <DialogDescription>
            {isLocating ? "Verifying your region to provide the best login experience..." : 
              authStep === "request_otp" ? `Enter your ${contactType === "email" ? "Email Address" : "Mobile Number"} to receive an OTP.` :
              "Enter the 6-digit OTP sent to you."
            }
          </DialogDescription>
        </DialogHeader>

        {isLocating ? (
          <div className="flex justify-center p-6">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : authStep === "request_otp" ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div className="space-y-2">
              <Input
                type={contactType === "email" ? "email" : "tel"}
                placeholder={contactType === "email" ? "name@example.com" : "+91 9999999999"}
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send OTP
            </Button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>
            
            <Button type="button" variant="outline" className="w-full" onClick={() => {
              setIsOpen(false);
              handlegooglesignin();
            }}>
              Continue with Google (Fallback)
            </Button>
          </form>
        ) : authStep === "verify_otp" ? (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                maxLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Log in
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setAuthStep("request_otp")}>
              Back
            </Button>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default RegionalLoginHandler;
