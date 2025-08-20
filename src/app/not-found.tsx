import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h2 className="text-2xl font-bold">Not Found</h2>
      <p className="mt-4 text-gray-600">Could not find requested resource</p>
      <Link
        href="/"
        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Return Home
      </Link>
    </main>
  );
}