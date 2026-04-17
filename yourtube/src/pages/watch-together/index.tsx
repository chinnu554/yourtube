import WatchTogetherRoom from "@/components/WatchTogetherRoom";
import { useRouter } from "next/router";

const WatchTogetherPage = () => {
  const router = useRouter();
  const room = typeof router.query.room === "string" ? router.query.room : "";

  return <WatchTogetherRoom initialRoomId={room} />;
};

export default WatchTogetherPage;
