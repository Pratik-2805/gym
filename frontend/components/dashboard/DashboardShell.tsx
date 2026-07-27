"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import PasskeyManager from '@/components/dashboard/PasskeyManager';
import {
  Dumbbell,
  Users,
  CreditCard,
  CheckSquare,
  Bot,
  MessageCircle,
  Settings,
  LogOut,
  UserCheck,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  ChevronDown,
} from 'lucide-react';
import { connectSocket, getSocket } from '@/lib/socket';
import CallModal from '@/components/inbox/callModal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface DashboardShellProps {
  children: React.ReactNode;
  gym?: any;
  activeUser: any;
}

export default function DashboardShell({ children, gym, activeUser }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const [gymName, setGymName] = useState(gym?.name || 'fit');
  const [gymLogo, setGymLogo] = useState<string | null>(null);

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({ Settings: false });
  const toggleSubmenu = (label: string) => setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));

  useEffect(() => {
    if (gym?.name) {
      setGymName(gym.name);
    }
  }, [gym?.name]);

  // Global Inbound Call State
  const [incomingCall, setIncomingCall] = useState<any>(null);

  useEffect(() => {
    if (!gym?.id) return;
    
    connectSocket();
    const socket = getSocket();

    const handleCallEvent = (eventData: any) => {
      console.log("Global call event:", eventData);
      if (
        eventData.event === "connect" &&
        eventData.direction === "USER_INITIATED" &&
        eventData.sdp
      ) {
        setIncomingCall(eventData);
      } else if (eventData.event === "terminate" && incomingCall?.callId === eventData.callId) {
        setIncomingCall(null);
      }
    };

    socket.on("whatsapp_call_event", handleCallEvent);

    return () => {
      socket.off("whatsapp_call_event", handleCallEvent);
    };
  }, [gym?.id, incomingCall?.callId]);

  const sidebarLinks = [
    { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4 shrink-0" />, href: `/dashboard` },
    { label: 'Members', icon: <Users className="h-4 w-4 shrink-0" />, href: `/dashboard/members` },
    { label: 'Plans', icon: <CreditCard className="h-4 w-4 shrink-0" />, href: `/dashboard/plans` },
    { label: 'Payments', icon: <CheckSquare className="h-4 w-4 shrink-0" />, href: `/dashboard/payments` },
    { label: 'Chatbot', icon: <Bot className="h-4 w-4 shrink-0" />, href: `/dashboard/chatbot` },
    { label: 'Inbox', icon: <MessageCircle className="h-4 w-4 shrink-0" />, href: `/dashboard/inbox` },
    { label: 'Templates', icon: <FileText className="h-4 w-4 shrink-0" />, href: `/dashboard/templates` },
    { 
      label: 'Settings', 
      icon: <Settings className="h-4 w-4 shrink-0" />, 
      subLinks: [
        { label: 'General', href: `/dashboard/settings/general` },
        { label: 'WhatsApp Setup', href: `/dashboard/settings/whatsapp` }
      ]
    },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 font-sans text-zinc-100 relative overflow-hidden">
      {/* Background Lights */}
      <div className="absolute left-0 top-0 h-[400px] w-[400px] rounded-full bg-cyan-600/5 blur-[100px]" />
      <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-violet-600/5 blur-[100px]" />

      {/* Sidebar Panel */}
      <aside 
        className={`hidden border-r border-zinc-805 bg-zinc-950/80 backdrop-blur-md md:flex flex-col z-10 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className={`flex h-16 items-center border-b border-zinc-805 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-between px-4'}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center overflow-hidden">
                <Dumbbell className="h-6 w-6 text-cyan-400 shrink-0" />
                <span className={`text-lg font-black tracking-tight text-zinc-100 uppercase whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[120px] opacity-100 ml-2'}`}>
                  Fit<span className="text-cyan-400">Flow</span>
                </span>
              </div>
              <button 
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shrink-0"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsCollapsed(false)}
              className="group p-2 rounded-xl text-cyan-400 hover:bg-zinc-800 hover:text-zinc-300 transition-all flex items-center justify-center w-10 h-10"
              title="Expand Sidebar"
            >
              <Dumbbell className="h-6 w-6 group-hover:hidden" />
              <PanelLeftOpen className="h-5 w-5 hidden group-hover:block" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 w-full min-h-[300px]">
          <nav className="flex flex-col space-y-1 px-3 py-4 overflow-y-auto overflow-x-hidden bg-transparent">
            {sidebarLinks.map((link) => {
              const isActive = link.href 
                ? pathname.startsWith(link.href) 
                : link.subLinks?.some(sub => pathname.startsWith(sub.href));
                
              if (link.subLinks) {
                return (
                  <div key={link.label} className="flex flex-col space-y-1">
                    <button
                      onClick={() => toggleSubmenu(link.label)}
                      title={isCollapsed ? link.label : undefined}
                      className={`flex items-center justify-between rounded-xl py-3 text-xs font-semibold transition-all duration-300 ${
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                      } ${
                        isActive 
                          ? 'text-cyan-400' 
                          : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100'
                      }`}
                    >
                      <div className="flex items-center">
                        {link.icon}
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[150px] opacity-100 ml-3'}`}>
                          {link.label}
                        </span>
                      </div>
                      {!isCollapsed && (
                        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-300 ${openSubmenus[link.label] ? 'rotate-180 text-cyan-400' : ''}`} />
                      )}
                    </button>
                    <div className={`flex flex-col space-y-1 overflow-hidden transition-all duration-300 ${openSubmenus[link.label] && !isCollapsed ? 'max-h-40 opacity-100 mb-2' : 'max-h-0 opacity-0'}`}>
                      {link.subLinks.map(sub => {
                        const isSubActive = pathname.startsWith(sub.href);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`flex items-center rounded-xl py-2 pl-11 pr-4 text-xs font-semibold transition-all duration-300 ${
                              isSubActive
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                                : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100 border border-transparent'
                            }`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href!}
                  title={isCollapsed ? link.label : undefined}
                  className={`flex items-center rounded-xl py-3 text-xs font-semibold transition-all duration-300 ${
                    isCollapsed ? 'justify-center px-0' : 'px-4'
                  } ${
                    isActive 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                      : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100 border border-transparent'
                  }`}
                >
                  {link.icon}
                  <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[150px] opacity-100 ml-3'}`}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Details */}
        <div className={`border-t border-zinc-805 transition-all duration-300 bg-zinc-950/40 ${isCollapsed ? 'flex flex-col items-center gap-4 p-2 py-4' : 'p-4'}`}>
          <div
            className={`flex items-center p-1.5 rounded-xl w-full text-left ${isCollapsed ? 'mb-0 justify-center' : 'mb-4'}`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 font-extrabold text-xs shrink-0" title={activeUser.name}>
              {activeUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div className={`overflow-hidden transition-all duration-300 flex-1 ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[150px] opacity-100 ml-3'}`}>
              <span className="block text-xs font-bold text-zinc-100 truncate">{activeUser.name}</span>
              <span className="flex items-center gap-1 text-[9px] font-semibold text-zinc-500 mt-0.5 uppercase tracking-wider">
                <UserCheck className="h-2.5 w-2.5 text-cyan-400 shrink-0" /> {activeUser.role}
              </span>
            </div>
          </div>

          <form action="/api/auth/logout" method="POST" className={isCollapsed ? 'w-full flex justify-center' : 'w-full'}>
            <button
              type="submit"
              title={isCollapsed ? "Sign Out" : undefined}
              className={`flex items-center justify-center rounded-xl border border-zinc-805 bg-zinc-850/30 text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-300 ${
                isCollapsed ? 'w-10 h-10' : 'w-full px-4 py-2'
              }`}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" /> 
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[100px] opacity-100 ml-2'}`}>
                Sign Out
              </span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden z-10 min-w-0">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-805 bg-zinc-950/80 px-6 md:px-8 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {gymLogo ? (
                <img src={gymLogo} alt="Gym Logo" className="h-6 w-6 object-contain rounded border border-zinc-805" />
              ) : null}
              <span className="text-sm font-extrabold text-zinc-100 truncate max-w-[150px] sm:max-w-none">
                {gymName}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
            <ThemeToggle />
            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">
              🟢 System Online
            </span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-zinc-950/20">{children}</main>
      </div>

      {/* Global Inbound Call Modal */}
      {incomingCall && (
        <CallModal
          isOpen={!!incomingCall}
          onClose={() => setIncomingCall(null)}
          
          conversationId={incomingCall.conversationId}
          recipientName={incomingCall.memberName}
          recipientPhone={incomingCall.memberPhone}
          isInbound={true}
          inboundCallId={incomingCall.callId}
          inboundSdp={incomingCall.sdp}
        />
      )}
      <ToastContainer theme="dark" position="bottom-right" />
    </div>
  );
}
