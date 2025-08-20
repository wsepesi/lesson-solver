import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-landing-blue text-white border-b border-landing-blue">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <Link href="/" className="text-lg font-medium hover:text-white/90 transition-colors">
            Lesson Solver
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="text-white/90 hover:text-white transition-colors text-sm">
              Login
            </Link>
            <Link href="/signup" className="text-white/90 hover:text-white transition-colors text-sm">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-3xl font-bold text-landing-blue mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg max-w-none text-gray-700">
          <p className="text-lg mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Agreement to Terms</h2>
            <p className="mb-4">
              By accessing and using Lesson Solver, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Description of Service</h2>
            <p className="mb-4">
              Lesson Solver is a web-based scheduling application that helps teachers and instructors organize lesson schedules for their students using constraint satisfaction algorithms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">User Accounts</h2>
            <p className="mb-4">To use our service, you must:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Be responsible for all activities that occur under your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Acceptable Use</h2>
            <p className="mb-4">You agree not to use the service to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Upload or transmit illegal, harmful, or offensive content</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Attempt to gain unauthorized access to other accounts</li>
              <li>Use the service for any commercial purpose without permission</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Data and Privacy</h2>
            <p className="mb-4">
              Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information when you use our service. By using our service, you agree to the collection and use of information in accordance with our Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Service Availability</h2>
            <p className="mb-4">
              We strive to provide reliable service but cannot guarantee 100% uptime. We reserve the right to:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Modify or discontinue the service with reasonable notice</li>
              <li>Perform maintenance that may temporarily affect service availability</li>
              <li>Suspend service for security or technical reasons</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Subscription and Billing</h2>
            <p className="mb-4">
              For paid plans:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Subscriptions are billed in advance on a recurring basis</li>
              <li>You can cancel your subscription at any time</li>
              <li>Refunds are provided in accordance with our refund policy</li>
              <li>Price changes will be communicated with advance notice</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Intellectual Property</h2>
            <p className="mb-4">
              The service and its original content, features, and functionality are owned by Lesson Solver and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Limitation of Liability</h2>
            <p className="mb-4">
              In no event shall Lesson Solver be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Termination</h2>
            <p className="mb-4">
              We may terminate or suspend your account and access to the service immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Governing Law</h2>
            <p className="mb-4">
              These Terms shall be interpreted and governed by the laws of the jurisdiction in which Lesson Solver operates, without regard to conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new Terms of Service on this page and updating the "last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms of Service, please contact us at{" "}
              <a href="mailto:willsepesi@gmail.com" className="text-landing-blue hover:underline">
                willsepesi@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-landing-blue text-white py-4 border-t border-landing-blue mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm">
            <div className="flex gap-6 mb-2 md:mb-0">
              <Link href="/privacy" className="text-white/80 hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="text-white/80 hover:text-white transition-colors">Terms</Link>
              <a href="mailto:willsepesi@gmail.com" className="text-white/80 hover:text-white transition-colors">Contact</a>
            </div>
            <div className="text-white/60">
              © 2024 Lesson Solver
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}