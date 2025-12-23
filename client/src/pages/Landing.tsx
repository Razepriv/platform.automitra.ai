import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Play, Check, Star, ArrowRight, Mic, Globe, Zap, Shield, BarChart, MessageSquare, Phone, Users, Menu, X, Sparkles, Wand2 } from 'lucide-react';

export default function Landing() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setEmail('');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#030014] text-white overflow-x-hidden font-sans selection:bg-purple-500/30">
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '7s' }} />
        <div className="absolute top-[30%] left-[50%] transform -translate-x-1/2 w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[100px]" />
        
        {/* Stars/Particles */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#030014]/80 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">auto mitra ai</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-300 hover:text-white transition">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-300 hover:text-white transition">How it Works</a>
              <a href="#pricing" className="text-sm font-medium text-gray-300 hover:text-white transition">Pricing</a>
              <button onClick={() => setLocation('/login')} className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition backdrop-blur-sm">
                Log In
              </button>
              <button onClick={() => setLocation('/signup')} className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-sm font-medium shadow-lg shadow-purple-500/25 transition transform hover:scale-105">
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-[#030014] border-b border-white/10 p-4 flex flex-col gap-4">
            <a href="#features" className="text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>How it Works</a>
            <a href="#pricing" className="text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>Pricing</a>
            <button onClick={() => setLocation('/login')} className="w-full py-3 rounded-lg bg-white/5 border border-white/10">Log In</button>
            <button onClick={() => setLocation('/signup')} className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600">Get Started</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-sm font-medium text-purple-200">Unlock Your Communication Potential</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            Fastest & Easiest Way to <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x">
              Automate Voice Calls
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Generate intelligent AI voice agents instantly. Automate support, sales, and surveys with natural-sounding conversations in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button onClick={() => setLocation('/signup')} className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-lg shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)] hover:shadow-[0_0_60px_-15px_rgba(168,85,247,0.6)] transition-all transform hover:-translate-y-1">
              <span className="flex items-center gap-2">
                Start 7 Days Trial <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button className="px-8 py-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-lg backdrop-blur-sm transition-all flex items-center gap-2">
              <Play className="w-5 h-5 fill-current" /> Watch Demo
            </button>
          </div>

          {/* Dashboard Preview / Hero Image */}
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-30"></div>
            <div className="relative bg-[#0a051e] border border-white/10 rounded-2xl p-2 shadow-2xl overflow-hidden">
              <div className="bg-[#0f0826] rounded-xl p-6 md:p-8 border border-white/5">
                {/* Mock UI */}
                <div className="grid grid-cols-12 gap-6">
                  {/* Sidebar Mock */}
                  <div className="col-span-3 hidden md:flex flex-col gap-4 border-r border-white/5 pr-6">
                    <div className="h-8 w-24 bg-white/10 rounded-lg mb-4"></div>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-10 w-full bg-white/5 rounded-lg"></div>
                    ))}
                  </div>
                  
                  {/* Main Content Mock */}
                  <div className="col-span-12 md:col-span-9">
                    <div className="flex justify-between mb-8">
                      <div className="h-8 w-48 bg-white/10 rounded-lg"></div>
                      <div className="h-8 w-8 bg-purple-500/20 rounded-full"></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="h-32 bg-gradient-to-br from-purple-900/20 to-transparent border border-purple-500/20 rounded-xl p-4 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition"></div>
                        <div className="h-8 w-8 bg-purple-500 rounded-lg mb-3 flex items-center justify-center">
                          <Mic className="w-4 h-4" />
                        </div>
                        <div className="h-4 w-24 bg-white/10 rounded mb-2"></div>
                        <div className="h-3 w-16 bg-white/5 rounded"></div>
                      </div>
                      <div className="h-32 bg-gradient-to-br from-pink-900/20 to-transparent border border-pink-500/20 rounded-xl p-4 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-pink-500/5 group-hover:bg-pink-500/10 transition"></div>
                        <div className="h-8 w-8 bg-pink-500 rounded-lg mb-3 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="h-4 w-24 bg-white/10 rounded mb-2"></div>
                        <div className="h-3 w-16 bg-white/5 rounded"></div>
                      </div>
                    </div>

                    {/* Waveform Visualization */}
                    <div className="h-24 bg-[#050210] rounded-xl border border-white/5 flex items-center justify-center gap-1 px-8">
                      {[...Array(40)].map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full animate-pulse"
                          style={{ 
                            height: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.05}s`
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-purple-300 mb-4">
              <Sparkles className="w-4 h-4" /> Features
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Your go-to tool for crafting <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                Viral Conversations using AI
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Wand2,
                title: "Instant Agent Creation",
                desc: "Generate custom voice agents in seconds with simple text prompts.",
                color: "from-purple-500 to-indigo-500"
              },
              {
                icon: Globe,
                title: "Multi-Language Support",
                desc: "Communicate globally with support for 50+ languages and dialects.",
                color: "from-pink-500 to-rose-500"
              },
              {
                icon: Zap,
                title: "Real-time Latency",
                desc: "Experience natural conversations with sub-second response times.",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: BarChart,
                title: "Deep Analytics",
                desc: "Track sentiment, duration, and success rates with precision.",
                color: "from-emerald-500 to-teal-500"
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                desc: "Bank-grade encryption and compliance for your sensitive data.",
                color: "from-orange-500 to-amber-500"
              },
              {
                icon: Phone,
                title: "Seamless Integration",
                desc: "Connect with your CRM and tools via webhooks and API.",
                color: "from-violet-500 to-purple-500"
              }
            ].map((feature, i) => (
              <div key={i} className="group relative p-1 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 hover:from-purple-500/50 hover:to-pink-500/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative h-full bg-[#0a051e] rounded-xl p-8 border border-white/5 group-hover:border-transparent transition-colors">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#050210] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-purple-300 mb-4">
              <Zap className="w-4 h-4" /> How it works
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Turn scripts into <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                conversations in seconds
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Define Your Agent",
                desc: "Choose a persona, voice, and language. Set the context and goals for the conversation."
              },
              {
                step: "02",
                title: "Upload Knowledge",
                desc: "Upload PDFs or documents to train your agent on your specific business knowledge."
              },
              {
                step: "03",
                title: "Deploy & Scale",
                desc: "Get a phone number and start handling thousands of calls simultaneously."
              }
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="bg-[#0f0826] border border-white/10 rounded-2xl p-8 h-full hover:border-purple-500/50 transition-colors duration-300">
                  <div className="text-6xl font-bold text-white/5 mb-6">{item.step}</div>
                  <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                  
                  {/* Visual Element for Step */}
                  <div className="mt-8 h-32 bg-[#050210] rounded-xl border border-white/5 flex items-center justify-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
                    {i === 0 && <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 blur-xl opacity-50 animate-pulse"></div>}
                    {i === 1 && <div className="w-20 h-24 bg-white/5 rounded border border-white/10 transform rotate-12"></div>}
                    {i === 2 && <div className="flex gap-2"><div className="w-2 h-12 bg-green-500 rounded-full"></div><div className="w-2 h-8 bg-green-500/50 rounded-full"></div><div className="w-2 h-16 bg-green-500 rounded-full"></div></div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / Social Proof */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-white/10 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-12 relative z-10">
              Powerful tool for boosting <br />
              <span className="text-purple-400">business growth</span>
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
              {[
                { label: "Active Calls", value: "10M+" },
                { label: "AI Agents", value: "50k+" },
                { label: "Uptime", value: "99.9%" },
                { label: "Countries", value: "120+" }
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-400 text-sm uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-8">
            Experience the <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Magic</span>
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Create endless AI conversations simultaneously with automatic speech recognition, natural language understanding, and voice synthesis.
          </p>
          
          <div className="bg-[#0f0826] border border-white/10 rounded-2xl p-8 max-w-md mx-auto shadow-2xl shadow-purple-900/20">
            <form onSubmit={handleNewsletterSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#050210] border border-white/10 rounded-lg px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-500/25"
              >
                {isLoading ? 'Processing...' : 'Start Free Trial'}
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-4">No credit card required. 14-day free trial.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8 bg-[#02010a] relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">auto mitra ai</span>
          </div>
          
          <div className="flex gap-8 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition">Privacy Policy</a>
            <a href="#" className="hover:text-white transition">Terms of Service</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>

          <div className="text-sm text-gray-500">
            &copy; 2025 auto mitra ai. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
