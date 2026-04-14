import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  Download,
  ThumbsUp,
  History,
  User,
  Crown,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";

const Sidebar = () => {
  const { user } = useUser();

  const [isdialogeopen, setisdialogeopen] = useState(false);
  return (
    <>
    <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-64 shrink-0 overflow-y-auto border-r bg-white p-2 lg:block">
      <nav className="space-y-1">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start">
            <Home className="w-5 h-5 mr-3" />
            Home
          </Button>
        </Link>
        <Link href="/explore">
          <Button variant="ghost" className="w-full justify-start">
            <Compass className="w-5 h-5 mr-3" />
            Explore
          </Button>
        </Link>
        <Link href="/subscriptions">
          <Button variant="ghost" className="w-full justify-start">
            <PlaySquare className="w-5 h-5 mr-3" />
            Subscriptions
          </Button>
        </Link>

        {user && (
          <>
            <div className="border-t pt-2 mt-2">
              <Link href="/history">
                <Button variant="ghost" className="w-full justify-start">
                  <History className="w-5 h-5 mr-3" />
                  History
                </Button>
              </Link>
              <Link href="/liked">
                <Button variant="ghost" className="w-full justify-start">
                  <ThumbsUp className="w-5 h-5 mr-3" />
                  Liked videos
                </Button>
              </Link>
              <Link href="/watch-later">
                <Button variant="ghost" className="w-full justify-start">
                  <Clock className="w-5 h-5 mr-3" />
                  Watch later
                </Button>
              </Link>
              <Link href="/downloads">
                <Button variant="ghost" className="w-full justify-start">
                  <Download className="w-5 h-5 mr-3" />
                  Downloads
                </Button>
              </Link>
              <Link href="/premium">
                <Button variant="ghost" className="w-full justify-start">
                  <Crown className="w-5 h-5 mr-3" />
                  {user?.isPremium ? "Premium active" : "Premium"}
                </Button>
              </Link>
              {user?.channelname ? (
                <Link href={`/channel/${user._id}`}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="w-5 h-5 mr-3" />
                    Your channel
                  </Button>
                </Link>
              ) : (
                <div className="px-2 py-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setisdialogeopen(true)}
                  >
                    Create Channel
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </aside>
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
      <div className="grid grid-cols-4 gap-1">
        <Link href="/">
          <Button variant="ghost" className="h-auto w-full flex-col gap-1 px-2 py-2 text-xs">
            <Home className="h-4 w-4" />
            Home
          </Button>
        </Link>
        <Link href="/history">
          <Button variant="ghost" className="h-auto w-full flex-col gap-1 px-2 py-2 text-xs">
            <History className="h-4 w-4" />
            History
          </Button>
        </Link>
        <Link href="/liked">
          <Button variant="ghost" className="h-auto w-full flex-col gap-1 px-2 py-2 text-xs">
            <ThumbsUp className="h-4 w-4" />
            Liked
          </Button>
        </Link>
        <Link href="/watch-later">
          <Button variant="ghost" className="h-auto w-full flex-col gap-1 px-2 py-2 text-xs">
            <Clock className="h-4 w-4" />
            Later
          </Button>
        </Link>
      </div>
    </nav>
    </>
  );
};

export default Sidebar;
