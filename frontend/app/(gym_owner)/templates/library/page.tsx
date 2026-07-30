'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, ChevronRight, Search, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const PREDEFINED_TEMPLATES = [
  {
    name: "new_member_plan",
    category: "UTILITY",
    language: "en_US",
    headerType: "NONE",
    headerText: "",
    body: "Hi {{1}}, welcome to {{2}}! Your membership for the {{3}} has been successfully activated.",
    footer: "New Member Registration",
  },
  {
    name: "plan_update",
    category: "UTILITY",
    language: "en_US",
    headerType: "NONE",
    headerText: "",
    body: "Hi {{1}}, your membership plan at {{2}} has been updated to {{3}}. If you have any questions, please contact us.",
    footer: "Plan Update",
  },
  {
    name: "welcome_message",
    category: "UTILITY",
    language: "en_US",
    headerType: "NONE",
    headerText: "",
    body: "Hi {{1}}, welcome to {{2}}! We are thrilled to have you. Let us know if you have any questions.",
    footer: "Welcome to the family",
  },
  {
    name: "price_change",
    category: "UTILITY",
    language: "en_US",
    headerType: "NONE",
    headerText: "",
    body: "Hello {{1}},\n\nThis is an important update! The price of your current subscription plan \"{{2}}\" has been updated to ₹{{3}}.\n\nIf you have any questions, feel free to contact us.",
    footer: "Thank You",
  },
  {
    name: "payment_reminder",
    category: "UTILITY",
    language: "en_US",
    headerType: "NONE",
    headerText: "",
    body: "Hi {{1}}, this is a friendly reminder that your payment of ₹{{2}} is due on {{3}}. Please ensure timely payment to avoid interruption of services.",
    footer: "Payment Reminder",
  },
  {
    name: "membership_expired",
    category: "UTILITY",
    language: "en_US",
    headerType: "NONE",
    headerText: "",
    body: "Hi {{1}}, your gym membership expired on {{2}}. Please renew your membership to continue enjoying our facilities.",
    footer: "Membership Expired",
  },
  {
    name: "class_cancelled",
    category: "UTILITY",
    language: "en_US",
    headerType: "NONE",
    headerText: "",
    body: "Hi {{1}}, unfortunately the {{2}} class scheduled for {{3}} has been cancelled. We apologize for the inconvenience.",
    footer: "Schedule Update",
  },
  {
    name: "birthday_wish",
    category: "MARKETING",
    language: "en_US",
    headerType: "NONE",
    headerText: "",
    body: "Happy Birthday {{1}}! We hope you have a fantastic day. To celebrate, enjoy a free personal training session on us!",
    footer: "Happy Birthday",
  },
  {
    name: "holiday_closure",
    category: "UTILITY",
    language: "en_US",
    headerType: "NONE",
    headerText: "",
    body: "Dear Member, please note that the gym will be closed for {{1}} from {{2}} to {{3}}.",
    footer: "Holiday Notice",
  },
  {
    name: "special_offer",
    category: "MARKETING",
    language: "en_US",
    headerType: "NONE",
    headerText: "",
    body: "Hi {{1}}, we have a special offer for you! Get {{2}} off your next renewal. Use code: {{3}}.",
    footer: "Special Offer",
  },
  {
    name: "feedback_request",
    category: "MARKETING",
    language: "en_US",
    headerType: "NONE",
    headerText: "",
    body: "Hi {{1}}, how are you enjoying your time at the gym? We would love to hear your feedback. Please share your thoughts here: {{2}}",
    footer: "Feedback Request",
  },
  {
    name: "trainer_absent",
    category: "UTILITY",
    language: "en_US",
    headerType: "NONE",
    headerText: "",
    body: "Hi {{1}}, your trainer {{2}} will be absent on {{3}}. Your session will be rescheduled. We apologize for the inconvenience.",
    footer: "Trainer Update",
  }
];

export default function TemplateLibraryPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = PREDEFINED_TEMPLATES.filter(t => 
    t.name.replace(/_/g, ' ').toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/templates" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl flex items-center gap-2">
              <LayoutGrid className="h-7 w-7 text-cyan-400" />
              Template Library
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1 ml-8">
            Browse and use predefined gym templates to get you started quickly.
          </p>
        </div>
      </div>

      <div className="relative z-20 rounded-2xl p-4 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs transition-all duration-300 bg-zinc-950/70 dark:bg-zinc-950/40">
        <div className="flex flex-1 flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <div className="relative flex-1 w-full max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search library..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
          </div>
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-850 p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-600">
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-sm">
            <span className="block font-bold text-zinc-100 text-sm">No Templates Found</span>
            <p className="text-xs text-zinc-500 leading-relaxed">
              No predefined templates match your search. Try another term.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((tpl) => (
            <div key={tpl.name} className="flex flex-col rounded-2xl border border-zinc-850 bg-zinc-900/40 backdrop-blur-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/5 hover:-translate-y-1 group">
              <div className="p-5 border-b border-zinc-800 bg-zinc-950/40 relative">
                <span className="text-[10px] font-black tracking-widest text-cyan-500 uppercase flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> {tpl.category}
                </span>
                <h3 className="text-base font-bold text-zinc-100 capitalize">
                  {tpl.name.replace(/_/g, ' ')}
                </h3>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex-1 bg-wa-chat-bg rounded-xl p-3.5 border border-black/20 ring-1 ring-black/10 relative overflow-hidden font-sans select-none flex flex-col justify-start">
                  <div className="absolute inset-0 bg-[url('/chat-bg.png')] bg-repeat bg-center opacity-30 dark:opacity-[0.5] pointer-events-none" />
                  <div className="flex flex-col items-end w-full overflow-y-auto z-10 pl-1 pr-1.5">
                    <div className="relative w-fit max-w-[95%] z-10 flex flex-col self-end">
                      <div className="absolute top-0 -right-1.5 w-0 h-0 border-t-[8px] border-t-bubble-outbound-bg border-r-[8px] border-r-transparent" />
                      <div className="bg-bubble-outbound-bg text-bubble-outbound-text rounded-lg rounded-tr-none shadow-md relative text-[11px] leading-relaxed border border-bubble-outbound-bg overflow-hidden flex flex-col">
                        <div className="p-2.5 flex flex-col">
                          <p className="text-bubble-outbound-text whitespace-pre-wrap font-normal font-sans">
                            {tpl.body}
                          </p>
                          {tpl.footer && (
                            <div className="text-[9px] text-bubble-outbound-meta mt-1 font-medium font-sans truncate text-zinc-400">
                              {tpl.footer}
                            </div>
                          )}
                          <div className="self-end text-[7px] text-bubble-outbound-meta mt-1 font-sans leading-none flex items-center gap-0.5">
                            9:30 PM <span className="text-[#53bdeb]">✓✓</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 pt-0 border-t border-zinc-800/0 mt-auto">
                <button
                  onClick={() => router.push(`/templates?useTemplate=${tpl.name}`)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600/10 border border-cyan-500/20 px-4 py-2.5 text-xs font-bold text-cyan-400 transition-all hover:bg-cyan-600 hover:text-white"
                >
                  Use Template
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
