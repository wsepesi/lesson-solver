import Link from "next/link";

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-landing-blue mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none text-gray-700">
          <p className="text-lg mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Our Commitment to Your Privacy</h2>
            <p className="mb-4">
              At Lesson Solver, we take your privacy seriously. We are committed to protecting your personal information and being transparent about how we collect, use, and protect your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Data We Collect</h2>
            <p className="mb-4">We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Account information (email address, name)</li>
              <li>Studio and student scheduling data</li>
              <li>Usage information to improve our services</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">How We Use Your Data</h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide and improve our scheduling services</li>
              <li>Communicate with you about your account</li>
              <li>Ensure the security and integrity of our platform</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Data Security</h2>
            <p className="mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>All data is encrypted in transit and at rest</li>
              <li>We use secure, industry-standard databases</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and authentication protocols</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Data Training and AI</h2>
            <p className="mb-4">
              <strong>We do not use your data to train AI models or machine learning systems.</strong> Your scheduling data, student information, and personal details remain private and are used solely to provide our scheduling services to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Data Sharing</h2>
            <p className="mb-4">
              We do not sell, rent, or share your personal information with third parties, except:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>When required by law or legal process</li>
              <li>To protect our rights, property, or safety</li>
              <li>With your explicit consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibent text-landing-blue mb-4">Data Retention</h2>
            <p className="mb-4">
              We retain your data only as long as necessary to provide our services. When you delete your account, we will permanently delete your personal information within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Contact Us</h2>
            <p className="mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us at{" "}
              <a href="mailto:willsepesi@gmail.com" className="text-landing-blue hover:underline">
                willsepesi@gmail.com
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-landing-blue mb-4">Changes to This Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "last updated" date.
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