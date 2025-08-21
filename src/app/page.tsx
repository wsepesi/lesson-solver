import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-landing-background font-arimo">
      {/* Header */}
      <header className="bg-landing-blue text-white border-b border-landing-blue">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <div className="text-lg font-medium">Lesson Solver</div>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="text-white/90 hover:text-white transition-colors text-sm">
              Login
            </Link>
            <Link href="/signup">
              <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-landing-blue text-sm px-3 py-1">
                Sign Up
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 text-center border-b border-landing-blue/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold text-landing-blue mb-8">
            Many-to-one scheduling made easy
          </h1>
          
          {/* Video Demo Placeholder */}
          {/* <div className="bg-white border border-landing-blue/20 h-64 flex items-center justify-center mb-8">
            <div className="text-landing-blue text-center">
              <div className="text-4xl mb-2">▶</div>
              <p className="text-sm">Demo placeholder</p>
            </div>
          </div> */}

          {/* ASCII Music Notes Animation */}
          <div className="bg-white border border-landing-blue/20 h-64 flex flex-col justify-center overflow-hidden mb-8 relative">
            <div className="text-landing-blue/60 whitespace-nowrap text-xs" style={{fontFamily: 'monospace', letterSpacing: '0.05em'}}>
              {/* Top three new rows */}
              <div className="animate-music-drift-gentle flex items-center mb-1 opacity-15" style={{animationDelay: '-22s'}}>
                <span style={{marginRight: '1.3rem'}}>♪</span>
                <span style={{marginRight: '0.7rem'}}>♩</span>
                <span style={{marginRight: '2.9rem'}}>♫</span>
                <span style={{marginRight: '0.2rem'}}>♪</span>
                <span style={{marginRight: '1.8rem'}}>♬</span>
                <span style={{marginRight: '0.6rem'}}>♩</span>
                <span style={{marginRight: '2.4rem'}}>♫</span>
                <span style={{marginRight: '1.1rem'}}>♪</span>
                <span style={{marginRight: '0.4rem'}}>♬</span>
                <span style={{marginRight: '2.7rem'}}>♩</span>
                <span style={{marginRight: '0.9rem'}}>♪</span>
                <span style={{marginRight: '1.5rem'}}>♫</span>
              </div>
              
              <div className="animate-music-drift-flutter flex items-center mb-1 opacity-20" style={{animationDelay: '-17s'}}>
                <span style={{marginRight: '0.8rem'}}>♬</span>
                <span style={{marginRight: '2.1rem'}}>♪</span>
                <span style={{marginRight: '0.3rem'}}>♩</span>
                <span style={{marginRight: '1.9rem'}}>♫</span>
                <span style={{marginRight: '0.7rem'}}>♪</span>
                <span style={{marginRight: '2.5rem'}}>♬</span>
                <span style={{marginRight: '1.2rem'}}>♩</span>
                <span style={{marginRight: '0.5rem'}}>♫</span>
                <span style={{marginRight: '2.8rem'}}>♪</span>
                <span style={{marginRight: '0.9rem'}}>♬</span>
                <span style={{marginRight: '1.6rem'}}>♩</span>
              </div>
              
              <div className="animate-music-drift-drift flex items-center mb-1 opacity-25" style={{animationDelay: '-9s'}}>
                <span style={{marginRight: '2.3rem'}}>♫</span>
                <span style={{marginRight: '0.4rem'}}>♪</span>
                <span style={{marginRight: '1.7rem'}}>♬</span>
                <span style={{marginRight: '0.8rem'}}>♩</span>
                <span style={{marginRight: '2.6rem'}}>♫</span>
                <span style={{marginRight: '0.1rem'}}>♪</span>
                <span style={{marginRight: '1.4rem'}}>♬</span>
                <span style={{marginRight: '0.6rem'}}>♩</span>
                <span style={{marginRight: '2.2rem'}}>♫</span>
                <span style={{marginRight: '1.8rem'}}>♪</span>
                <span style={{marginRight: '0.3rem'}}>♬</span>
              </div>
              
              {/* Original rows */}
              <div className="animate-music-drift-erratic flex items-center mb-2 opacity-35" style={{animationDelay: '-8s'}}>
                <span style={{marginRight: '0.3rem'}}>♪</span>
                <span style={{marginRight: '1.7rem'}}>♩</span>
                <span style={{marginRight: '0.8rem'}}>♪</span>
                <span style={{marginRight: '2.4rem'}}>♫</span>
                <span style={{marginRight: '0.5rem'}}>♬</span>
                <span style={{marginRight: '1.2rem'}}>♪</span>
                <span style={{marginRight: '0.9rem'}}>♩</span>
                <span style={{marginRight: '2.1rem'}}>♫</span>
                <span style={{marginRight: '0.4rem'}}>♪</span>
                <span style={{marginRight: '1.6rem'}}>♬</span>
                <span style={{marginRight: '0.7rem'}}>♩</span>
                <span style={{marginRight: '2.8rem'}}>♪</span>
                <span style={{marginRight: '0.6rem'}}>♫</span>
                <span style={{marginRight: '1.3rem'}}>♬</span>
                <span style={{marginRight: '0.2rem'}}>♪</span>
              </div>
              
              <div className="animate-music-drift-jittery flex items-center mb-2 opacity-45" style={{animationDelay: '-15s'}}>
                <span style={{marginRight: '1.1rem'}}>♬</span>
                <span style={{marginRight: '0.4rem'}}>♪</span>
                <span style={{marginRight: '2.3rem'}}>♩</span>
                <span style={{marginRight: '0.8rem'}}>♫</span>
                <span style={{marginRight: '1.9rem'}}>♪</span>
                <span style={{marginRight: '0.3rem'}}>♬</span>
                <span style={{marginRight: '1.5rem'}}>♩</span>
                <span style={{marginRight: '0.7rem'}}>♫</span>
                <span style={{marginRight: '2.6rem'}}>♪</span>
                <span style={{marginRight: '0.9rem'}}>♬</span>
                <span style={{marginRight: '1.4rem'}}>♩</span>
                <span style={{marginRight: '0.5rem'}}>♪</span>
                <span style={{marginRight: '2.1rem'}}>♫</span>
              </div>
              
              <div className="animate-music-drift-random flex items-center mb-2 opacity-60" style={{animationDelay: '-3s'}}>
                <span style={{marginRight: '0.6rem'}}>♪</span>
                <span style={{marginRight: '2.2rem'}}>♫</span>
                <span style={{marginRight: '0.9rem'}}>♬</span>
                <span style={{marginRight: '1.7rem'}}>♩</span>
                <span style={{marginRight: '0.4rem'}}>♪</span>
                <span style={{marginRight: '2.8rem'}}>♫</span>
                <span style={{marginRight: '1.1rem'}}>♬</span>
                <span style={{marginRight: '0.7rem'}}>♩</span>
                <span style={{marginRight: '1.8rem'}}>♪</span>
                <span style={{marginRight: '0.3rem'}}>♫</span>
                <span style={{marginRight: '2.5rem'}}>♬</span>
                <span style={{marginRight: '1.3rem'}}>♩</span>
                <span style={{marginRight: '0.8rem'}}>♪</span>
              </div>
              
              <div className="animate-music-drift-jittery flex items-center mb-2 opacity-55" style={{animationDelay: '-11s'}}>
                <span style={{marginRight: '1.8rem'}}>♫</span>
                <span style={{marginRight: '0.5rem'}}>♬</span>
                <span style={{marginRight: '2.4rem'}}>♪</span>
                <span style={{marginRight: '0.9rem'}}>♩</span>
                <span style={{marginRight: '1.6rem'}}>♫</span>
                <span style={{marginRight: '0.2rem'}}>♬</span>
                <span style={{marginRight: '2.1rem'}}>♪</span>
                <span style={{marginRight: '1.2rem'}}>♩</span>
                <span style={{marginRight: '0.7rem'}}>♫</span>
                <span style={{marginRight: '2.9rem'}}>♬</span>
                <span style={{marginRight: '0.4rem'}}>♪</span>
                <span style={{marginRight: '1.5rem'}}>♩</span>
              </div>
              
              <div className="animate-music-drift-chaotic flex items-center mb-1 opacity-25" style={{animationDelay: '-6s'}}>
                <span style={{marginRight: '2.2rem'}}>♬</span>
                <span style={{marginRight: '0.1rem'}}>♪</span>
                <span style={{marginRight: '1.8rem'}}>♩</span>
                <span style={{marginRight: '0.6rem'}}>♫</span>
                <span style={{marginRight: '2.7rem'}}>♪</span>
                <span style={{marginRight: '0.3rem'}}>♬</span>
                <span style={{marginRight: '1.4rem'}}>♩</span>
                <span style={{marginRight: '0.8rem'}}>♫</span>
                <span style={{marginRight: '2.3rem'}}>♪</span>
                <span style={{marginRight: '0.5rem'}}>♬</span>
                <span style={{marginRight: '1.9rem'}}>♩</span>
                <span style={{marginRight: '0.2rem'}}>♪</span>
                <span style={{marginRight: '2.6rem'}}>♫</span>
                <span style={{marginRight: '1.1rem'}}>♬</span>
              </div>
              
              {/* Bottom three new rows */}
              <div className="animate-music-drift-glide flex items-center mb-1 opacity-20" style={{animationDelay: '-13s'}}>
                <span style={{marginRight: '0.9rem'}}>♪</span>
                <span style={{marginRight: '2.4rem'}}>♬</span>
                <span style={{marginRight: '0.6rem'}}>♩</span>
                <span style={{marginRight: '1.7rem'}}>♫</span>
                <span style={{marginRight: '0.2rem'}}>♪</span>
                <span style={{marginRight: '2.9rem'}}>♬</span>
                <span style={{marginRight: '1.3rem'}}>♩</span>
                <span style={{marginRight: '0.5rem'}}>♫</span>
                <span style={{marginRight: '2.1rem'}}>♪</span>
                <span style={{marginRight: '0.8rem'}}>♬</span>
                <span style={{marginRight: '1.6rem'}}>♩</span>
              </div>
              
              <div className="animate-music-drift-flow flex items-center mb-1 opacity-15" style={{animationDelay: '-19s'}}>
                <span style={{marginRight: '1.5rem'}}>♫</span>
                <span style={{marginRight: '0.4rem'}}>♪</span>
                <span style={{marginRight: '2.7rem'}}>♬</span>
                <span style={{marginRight: '0.7rem'}}>♩</span>
                <span style={{marginRight: '1.9rem'}}>♫</span>
                <span style={{marginRight: '0.3rem'}}>♪</span>
                <span style={{marginRight: '2.5rem'}}>♬</span>
                <span style={{marginRight: '1.1rem'}}>♩</span>
                <span style={{marginRight: '0.6rem'}}>♫</span>
                <span style={{marginRight: '2.8rem'}}>♪</span>
                <span style={{marginRight: '0.9rem'}}>♬</span>
              </div>
              
              <div className="animate-music-drift-whisper flex items-center opacity-10" style={{animationDelay: '-25s'}}>
                <span style={{marginRight: '2.1rem'}}>♪</span>
                <span style={{marginRight: '0.8rem'}}>♩</span>
                <span style={{marginRight: '1.4rem'}}>♫</span>
                <span style={{marginRight: '0.3rem'}}>♬</span>
                <span style={{marginRight: '2.6rem'}}>♪</span>
                <span style={{marginRight: '1.7rem'}}>♩</span>
                <span style={{marginRight: '0.5rem'}}>♫</span>
                <span style={{marginRight: '2.3rem'}}>♬</span>
                <span style={{marginRight: '0.9rem'}}>♪</span>
                <span style={{marginRight: '1.2rem'}}>♩</span>
                <span style={{marginRight: '0.7rem'}}>♫</span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3 justify-center">
            <Link href="/signup">
              <Button className="bg-landing-blue text-white hover:bg-landing-blue-hover px-6 py-2">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="border-landing-blue text-landing-blue hover:bg-landing-blue hover:text-white px-6 py-2">
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Strip */}
      <section className="py-4 border-t border-b border-landing-blue">
        <div className="overflow-hidden">
          <div className="flex animate-scroll whitespace-nowrap">
            <div className="flex items-center space-x-12 px-8">
              <span className="text-landing-blue text-sm">&ldquo;Saved me hours every week&rdquo;</span>
              <span className="text-landing-blue text-sm">&ldquo;Perfect for 40+ students&rdquo;</span>
              <span className="text-landing-blue text-sm">&ldquo;Finally understands teaching constraints&rdquo;</span>
              <span className="text-landing-blue text-sm">&ldquo;Brilliant constraint solving&rdquo;</span>
              <span className="text-landing-blue text-sm">&ldquo;Automatic scheduling is incredible&rdquo;</span>
              {/* Duplicate for seamless loop */}
              <span className="text-landing-blue text-sm">&ldquo;Saved me hours every week&rdquo;</span>
              <span className="text-landing-blue text-sm">&ldquo;Perfect for 40+ students&rdquo;</span>
              <span className="text-landing-blue text-sm">&ldquo;Finally understands teaching constraints&rdquo;</span>
              <span className="text-landing-blue text-sm">&ldquo;Brilliant constraint solving&rdquo;</span>
              <span className="text-landing-blue text-sm">&ldquo;Automatic scheduling is incredible&rdquo;</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 border-t border-landing-blue">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-landing-blue text-center mb-12">
            Pricing
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="border border-landing-blue/20 p-6 text-center">
              <div className="text-xl font-semibold text-landing-blue mb-2">Trial</div>
              <div className="text-3xl font-bold text-landing-blue mb-4">$0</div>
              <ul className="text-sm space-y-2 mb-6 text-landing-blue">
                <li className="italic">Get started with the trial plan:</li>
                <li>Up to 5 students</li>
                <li>1 studio</li>
                <li>3 solves</li>
                <li>Basic support</li>
              </ul>
              <Button variant="outline" className="w-full border-landing-blue text-landing-blue hover:bg-landing-blue hover:text-white">
                Try Free
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="border-2 border-landing-blue p-6 text-center relative">
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <span className="bg-landing-blue text-white px-3 py-1 text-xs">Popular</span>
              </div>
              <div className="text-xl font-semibold text-landing-blue mb-2">Pro</div>
              <div className="text-3xl font-bold text-landing-blue mb-4">$50 / year</div>
              <ul className="text-sm space-y-2 mb-6 text-landing-blue">
                <li className="italic">Save time and energy with Pro:</li>
                <li>50 studios</li>
                <li>50 students per studio</li>
                <li>100 solves per year</li>
                <li>Priority support</li>
              </ul>
              <Button className="w-full bg-landing-blue text-white hover:bg-landing-blue-hover">
                Get Pro
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="border border-landing-blue/20 p-6 text-center">
              <div className="text-xl font-semibold text-landing-blue mb-2">Enterprise</div>
              <div className="text-3xl font-bold text-landing-blue mb-4">Custom</div>
              <ul className="text-sm space-y-2 mb-6 text-landing-blue">
                <li className="italic">Bring ease to the whole department:</li>
                <li>Unlimited studios & students</li>
                <li>Unlimited solves</li>
                <li>Dedicated support</li>
                <li>Custom integrations</li>
              </ul>
              <Button variant="outline" className="w-full border-landing-blue text-landing-blue hover:bg-landing-blue hover:text-white">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-landing-blue text-white py-4 border-t border-landing-blue">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm">
            <div className="flex gap-6 mb-2 md:mb-0">
              <a href="/privacy" className="text-white/80 hover:text-white transition-colors">Privacy</a>
              <a href="/terms" className="text-white/80 hover:text-white transition-colors">Terms</a>
              <a href="mailto:willsepesi@gmail.com" className="text-white/80 hover:text-white transition-colors">Contact</a>
            </div>
            <div className="text-white/60">
              {/* © 2024 Lesson Solver */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}