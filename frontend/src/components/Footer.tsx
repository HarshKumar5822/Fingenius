import React from 'react';
import { Heart, Sparkles, Shield, Github, Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterProps {
  className?: string;
  variant?: 'landing' | 'dashboard' | 'compact';
}

export function Footer({ className = '', variant = 'landing' }: FooterProps) {
  const currentYear = new Date().getFullYear();

  if (variant === 'dashboard') {
    return (
      <footer className={`mt-auto py-6 px-6 border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm transition-colors ${className}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-gray-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-medium">
            <span className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              FinGenius
            </span>
            <span>•</span>
            <span>Created by <strong className="text-gray-900 dark:text-white font-bold hover:text-primary transition-colors">Harsh Kumar</strong></span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-400 dark:text-slate-500">© {currentYear} FinGenius. All rights reserved.</span>
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full font-medium text-[11px] border border-emerald-200 dark:border-emerald-800/50">
              <Shield className="w-3 h-3" />
              Bank Grade Security
            </div>
          </div>
        </div>
      </footer>
    );
  }

  if (variant === 'compact') {
    return (
      <footer className={`py-4 text-center text-xs text-gray-500 dark:text-slate-400 ${className}`}>
        <p className="flex items-center justify-center gap-1.5">
          <span>Created by</span>
          <span className="font-bold text-gray-900 dark:text-white">Harsh Kumar</span>
          <span className="text-red-500">❤️</span>
        </p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
          © {currentYear} FinGenius • All Rights Reserved
        </p>
      </footer>
    );
  }

  return (
    <footer className={`bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="FinGenius" className="w-9 h-9 object-contain bg-white rounded-lg p-1" />
              <span className="text-2xl font-black text-white tracking-tight">FinGenius</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your AI-powered personal & family financial assistant. Manage budgets, parse bank statements, track investments, and achieve financial freedom.
            </p>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-white">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Created by Harsh Kumar
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Core Features</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/signup" className="hover:text-white transition-colors">GeniusAI Advisory</Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition-colors">50/30/20 Budgeting</Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition-colors">Bank Statement Parser</Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition-colors">Family Circles</Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition-colors">Investment Portfolio</Link>
              </li>
            </ul>
          </div>

          {/* Solution & Security */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">User Login</Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition-colors">Create Free Account</Link>
              </li>
              <li className="flex items-center gap-1.5 text-emerald-400 text-xs mt-2">
                <Shield className="w-4 h-4" />
                Encrypted & Secure API
              </li>
            </ul>
          </div>

          {/* Creator Details */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Project Creator</h4>
            <p className="text-sm text-slate-300 font-semibold mb-2">
              Harsh Kumar
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Designed & Built with cutting-edge fullstack technologies (React, Node.js, Express, MongoDB & Groq AI).
            </p>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer" title="Developer Portfolio">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer" title="Fullstack Application">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {currentYear} FinGenius. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <span>Written & Created by</span>
            <span className="font-bold text-white bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Harsh Kumar</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline ml-0.5" />
          </div>
        </div>
      </div>
    </footer>
  );
}
