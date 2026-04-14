import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";
import { Compass } from "lucide-react";

export default function ExplorePage() {
  return (
    <main className="mx-auto w-full max-w-screen-2xl px-3 py-4 sm:px-4 lg:px-6">
      <section className="mb-6 rounded-2xl border bg-gradient-to-r from-orange-50 via-amber-50 to-white p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-orange-100 p-2 text-orange-600">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Explore</h1>
            <p className="text-sm text-gray-600">
              Discover videos across trending topics and fresh uploads.
            </p>
          </div>
        </div>
      </section>
      <CategoryTabs />
      <Videogrid />
    </main>
  );
}
