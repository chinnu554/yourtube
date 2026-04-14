import { PlaySquare } from "lucide-react";

export default function SubscriptionsPage() {
  return (
    <main className="mx-auto w-full max-w-screen-2xl px-3 py-4 sm:px-4 lg:px-6">
      <section className="rounded-2xl border bg-gradient-to-r from-sky-50 via-cyan-50 to-white p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-sky-100 p-2 text-sky-600">
            <PlaySquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Subscriptions</h1>
            <p className="text-sm text-gray-600">
              Follow your favorite creators here. No subscriptions yet.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
