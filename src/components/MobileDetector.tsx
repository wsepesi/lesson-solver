"use client";

export default function MobileDetector() {
  return (
    <div className="md:hidden fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Desktop Required</h1>
        <p className="text-lg text-gray-600 mb-6">
          Please view this site on a desktop or laptop computer for the best experience.
        </p>
        <p className="text-sm text-gray-500">
          Cadenza requires a larger screen for optimal scheduling functionality.
        </p>
      </div>
    </div>
  );
}