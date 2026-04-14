import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <div className="min-h-screen bg-white text-black">
        <title>Your-Tube Clone</title>
        <Header />
        <Toaster />
        <div className="flex min-h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="min-w-0 flex-1 pb-20 lg:pb-0">
            <Component {...pageProps} />
          </main>
        </div>
      </div>
    </UserProvider>
  );
}
