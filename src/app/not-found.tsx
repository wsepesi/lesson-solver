import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-landing-background font-arimo">
      <h2 className="text-2xl font-bold text-landing-blue">Not Found</h2>
      <p className="mt-4 text-landing-blue/70">Could not find requested resource</p>
      <Link
        href="/"
        className="mt-4 rounded-md bg-landing-blue px-4 py-2 text-white hover:bg-landing-blue-hover transition-colors"
      >
        Return Home
      </Link>
    </main>
  );
}