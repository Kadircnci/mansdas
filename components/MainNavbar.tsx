"use client";

import { Button } from "./ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import NavAuth from "./nav-auth";

export default function MainNavbar() {
  const pathname = usePathname();
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [role, setRole] = useState<string | null>(null);
  
  useEffect(() => {
    const check = async () => {
      const t = localStorage.getItem("access_token");
      setHasToken(!!t);
      if (t) {
        try {
          const res = await apiFetch("/auth/me");
          if (res.ok) {
            const data = await res.json();
            setRole(data.user?.role ?? null);
          }
        } catch {}
      } else {
        setRole(null);
      }
    };
    check();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "access_token") check();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };
  
  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Sosyal Medya Yönetimi</h1>
              <p className="text-sm text-purple-600 font-medium">Kamu Kurumları İçin</p>
            </div>
          </Link>
          
          {/* Navigation Menu */}
          <nav className="hidden md:flex space-x-8">
            <Link href="/">
              <Button 
                variant="ghost" 
                className={
                  isActive('/') && !pathname.includes('hakkimizda') 
                    ? "text-purple-600 bg-purple-50" 
                    : "text-gray-700 hover:text-purple-600 hover:bg-purple-50"
                }
              >
                Ana Sayfa
              </Button>
            </Link>
            
            <Link href="/hakkimizda">
              <Button 
                variant="ghost" 
                className={
                  isActive('/hakkimizda') 
                    ? "text-purple-600 bg-purple-50" 
                    : "text-gray-700 hover:text-purple-600 hover:bg-purple-50"
                }
              >
                Hakkımızda
              </Button>
            </Link>
            
            {/* Authenticated user links */}
            {hasToken && (
              <Link href="/icerik-planlama">
                <Button 
                  variant="ghost" 
                  className={
                    isActive('/icerik-planlama') 
                      ? "text-purple-600 bg-purple-50" 
                      : "text-gray-700 hover:text-purple-600 hover:bg-purple-50"
                  }
                >
                  İçerik Planlama
                </Button>
              </Link>
            )}
            
            <NavAuth />
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <NavAuth />
          </div>
        </div>
      </div>
    </header>
  );
}