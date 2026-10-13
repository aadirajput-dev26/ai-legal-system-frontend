'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, FileText, Scale, Shield, Zap, Mail, MessageSquare, ChevronRight, CheckCircle2, Play } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const opacity1 = useTransform(scrollY, [0, 500], [1, 0]);

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden font-sans">
      
      {/* Background Video */}
      <div className="fixed inset-0 z-0">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute min-w-full min-h-full object-cover opacity-20 filter blur-[2px]"
          poster="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2000&auto=format&fit=crop"
        >
          {/* Using a placeholder cinematic abstract video */}
          <source src="https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-connection-lines-loop-22287-large.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0c]/60 via-[#0c0c0c]/80 to-[#0c0c0c]" />
        
        {/* Animated Orbs */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/30 rounded-full blur-[128px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/4 -right-32 w-[30rem] h-[30rem] bg-violet-600/20 rounded-full blur-[128px]" 
        />
      </div>

      {/* macOS-style Menu Bar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl rounded-2xl transition-all duration-300 ${
          isScrolled 
            ? 'bg-[#111111]/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] py-3' 
            : 'bg-transparent border-transparent py-5'
        }`}
      >
        <div className="flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-semibold text-xl tracking-tight text-white">LegalDesk</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
          </div>

          <div className="flex items-center gap-4">
            {!loading && user ? (
              <Link 
                href="/dashboard"
                className="text-sm font-medium bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2 rounded-xl transition-all"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">
                  Log in
                </Link>
                <Link 
                  href="/login" 
                  className="text-sm font-medium bg-white text-black px-4 py-2 rounded-xl hover:bg-neutral-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-32 pb-20 px-6 sm:px-12 flex flex-col items-center">
        <motion.div 
          style={{ y: y1, opacity: opacity1 }}
          className="text-center max-w-4xl mx-auto mt-16 sm:mt-24"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-300 mb-8 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            LegalDesk AI 2.0 is now live
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-5xl sm:text-7xl font-heading font-bold tracking-tight mb-8 leading-[1.1]"
          >
            The future of law is <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">
              intelligent & seamless.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg sm:text-xl text-neutral-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed"
          >
            A premium, AI-native operating system designed exclusively for modern legal teams. Automate casework, draft instantly, and collaborate beautifully.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link 
              href={user ? "/dashboard" : "/login"}
              className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-2xl font-semibold flex items-center justify-center gap-2 hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] group"
            >
              Start Building your Practice
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-all duration-300 backdrop-blur-md">
              <Play className="w-4 h-4" />
              Watch Demo
            </button>
          </motion.div>
        </motion.div>

        {/* Realistic Inbox Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl mt-24 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/20 to-transparent blur-[100px] -z-10" />
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#111111]/80 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
            
            {/* Mac Window Header */}
            <div className="h-12 border-b border-white/5 flex items-center px-4 bg-white/5">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="mx-auto flex gap-6 text-xs text-neutral-500 font-medium">
                <span className="text-white">Inbox</span>
                <span>Active Cases</span>
                <span>Drafts</span>
              </div>
            </div>

            {/* Mockup Content */}
            <div className="flex h-[400px] sm:h-[500px]">
              {/* Sidebar */}
              <div className="w-64 border-r border-white/5 p-4 hidden sm:block">
                <div className="text-xs font-semibold text-neutral-500 mb-4 uppercase tracking-wider">Favorites</div>
                <div className="space-y-1">
                  {['All Updates', 'Client Messages', 'Court Notices', 'Internal'].map((item, i) => (
                    <div key={item} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${i === 0 ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 transition-colors'}`}>
                      {i === 0 ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              {/* List */}
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                  <div className="font-medium text-sm">Recent Activity</div>
                  <div className="px-2 py-1 bg-white/5 rounded-md border border-white/10 text-xs text-neutral-400">Filter</div>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col gap-1 p-2">
                  {[
                    { title: "Smith vs. State - Trial Date Confirmed", time: "10:42 AM", tag: "Urgent", color: "text-red-400 bg-red-400/10 border-red-400/20" },
                    { title: "AI Draft: Non-Disclosure Agreement", time: "09:15 AM", tag: "AI Generated", color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" },
                    { title: "Client Update: Johnson Corporate", time: "Yesterday", tag: "Message", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" }
                  ].map((email, i) => (
                    <div key={i} className="flex flex-col p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-sm text-neutral-200">{email.title}</div>
                        <div className="text-xs text-neutral-500">{email.time}</div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${email.color}`}>
                          {email.tag}
                        </span>
                        <span className="text-xs text-neutral-500 line-clamp-1">
                          Click to view details and required actions for this case item...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features Section */}
        <div id="features" className="w-full max-w-5xl mt-40 z-10 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-heading font-bold mb-4">Precision meets intelligence</h2>
            <p className="text-neutral-400 text-lg">Everything you need to run a modern legal practice.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "AI-Powered Drafting", desc: "Generate complex contracts, briefs, and legal notices in seconds using our proprietary legal AI models." },
              { icon: Shield, title: "Enterprise Security", desc: "Bank-grade encryption, SOC2 compliance, and granular access controls keep your client data completely secure." },
              { icon: FileText, title: "Smart Case Management", desc: "Unified timelines, automated deadlines, and intelligent document clustering for every matter you handle." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group relative rounded-3xl bg-white/[0.03] border border-white/[0.08] p-8 overflow-hidden hover:bg-white/[0.05] transition-all duration-500 hover:border-white/[0.15]"
              >
                {/* Liquid Glass Overlay Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -inset-px rounded-3xl border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 [mask-image:linear-gradient(to_bottom_right,white,transparent_40%)]" />
                
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 group-hover:text-indigo-300 transition-all duration-500 shadow-[0_0_0_rgba(99,102,241,0)] group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#0a0a0a] pt-20 pb-10 mt-20">
        <div className="max-w-5xl mx-auto px-6 sm:px-12 grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Scale className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-semibold text-xl tracking-tight text-white">LegalDesk</span>
            </div>
            <p className="text-neutral-400 text-sm max-w-sm">
              The premium AI operating system for modern law firms and legal professionals. Work smarter, not harder.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-neutral-500">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-white mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-neutral-500">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 sm:px-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500">
          <p>© 2026 LegalDesk Systems, Inc. All rights reserved.</p>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
