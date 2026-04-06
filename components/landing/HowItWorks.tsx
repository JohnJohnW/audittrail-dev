"use client";

import { FadeIn, StaggerChildren } from "@/components/ui/Motion";

export function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Connect once",
      description:
        "Install the GitHub App. Read-only access. Your source code never leaves GitHub.",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      number: "2",
      title: "Agent investigates",
      description:
        "Our AI agent runs through every compliance control \u2014 analysing your PR reviews, branch protection, deployment approvals, and vulnerability patch rates. It reasons about whether your evidence is sufficient or just present.",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
    },
    {
      number: "3",
      title: "Narratives and drafts generated",
      description:
        "For each control, the agent writes an auditor-ready narrative grounded in your actual evidence. For policy gaps, it drafts your Information Security Policy, Access Control Policy, and Incident Response Plan. For technical gaps, it opens a draft remediation PR.",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
    },
    {
      number: "4",
      title: "Human review and export",
      description:
        "You review what the agent produced, sign off on the narratives, complete the controls that require human action (access reviews, vendor assessments), and export the audit package. Your auditor gets a professionally documented, timestamped evidence package.",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gray-50 px-6">
      <div className="max-w-5xl mx-auto">
        <FadeIn direction="up" className="text-center mb-14">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">How it works</p>
          <h2 className="text-2xl font-semibold text-gray-900">
            From GitHub App install to audit-ready package. Four steps.
          </h2>
        </FadeIn>

        <div className="relative">
          {/* Connecting line - positioned between icons on desktop */}
          <div className="hidden md:block absolute top-6 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-0.5 bg-gradient-to-r from-accent/40 via-accent/20 to-accent/40" />

          <StaggerChildren className="grid md:grid-cols-4 gap-8" staggerDelay={0.15}>
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                {/* Icon with number badge */}
                <div className="relative inline-flex mb-4">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-accent text-accent flex items-center justify-center shadow-sm">
                    {step.icon}
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent text-white text-xs font-medium flex items-center justify-center shadow-sm">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </StaggerChildren>
        </div>

        <FadeIn direction="up" delay={0.5} className="mt-14">
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              The AI handles everything that lives in your code and configuration. Controls that
              require human judgment — quarterly access reviews, vendor risk assessments, security
              awareness training, board sign-off — are structured and scheduled by the agent,
              completed by your team. This is the correct design for a compliance program auditors
              will trust.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
