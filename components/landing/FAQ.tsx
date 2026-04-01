"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/ui/Motion";

const faqs = [
  {
    question: "Who is Audit Trail for?",
    answer:
      "SaaS companies that use GitHub and need compliance evidence for enterprise deals, SOC 2 audits, or security questionnaires. Especially teams of 5-50 engineers with no dedicated compliance person. If your product lives in GitHub repos, Audit Trail turns your existing developer activity into compliance evidence automatically.",
  },
  {
    question: "What does Audit Trail NOT cover?",
    answer:
      "Audit Trail covers the technical SDLC controls that live in your GitHub repos: change management, access control, vulnerability management, and security testing. It does NOT cover HR controls (background checks, offboarding), physical security, vendor/third-party risk management, or written policies. For those, Audit Trail tells you exactly what's missing so you know where to focus. We're honest about scope. Most compliance frameworks require more than GitHub can evidence, and we show you the gap clearly.",
  },
  {
    question: "Which frameworks do you support?",
    answer:
      "Six frameworks with strong GitHub evidence coverage: SOC 2 (5 controls), ISO 27001:2022 (10 controls), NIST CSF 2.0 (7 controls), NIST SP 800-53 Rev 5 (7 controls), ACSC Essential Eight (5 controls), and PCI DSS 4.0 (5 controls). Free plans include 2 frameworks; Pro ($5/mo) unlocks all 6. We focus on frameworks where GitHub activity produces meaningful evidence rather than spreading thin across standards we can't properly support.",
  },
  {
    question: "What methodology do you use?",
    answer:
      "Our assessment methodology is based on NIST SP 800-53A Rev 5 (Assessing Security and Privacy Controls). We evaluate controls across three dimensions: design adequacy (is the control configured correctly?), operating consistency (is it applied consistently over time?), and evidence quality (how strong is the evidence?). Our continuous monitoring approach follows NIST SP 800-137. Every score shows its methodology and can be drilled into.",
  },
  {
    question: "What GitHub permissions do you need?",
    answer:
      "Read-only access to repository contents, pull requests, code reviews, deployments, environments, Dependabot alerts, code scanning alerts, and secret scanning alerts. We use a GitHub App with the minimum required scopes. We never write to or modify your repositories.",
  },
  {
    question: "Is my source code secure?",
    answer:
      "We never store your source code. We only extract metadata: commit hashes, PR numbers, branch names, timestamps, and authors. All data is encrypted in transit (TLS 1.3) and at rest. Hosted on Vercel and Supabase with enterprise-grade security.",
  },
  {
    question: "How often do you sync data?",
    answer:
      "Evidence updates in real time via GitHub App webhooks. The moment a commit is pushed, a PR is merged, or a Dependabot alert is created, it appears in your dashboard. A daily background sync catches anything missed.",
  },
  {
    question: "Will auditors accept these reports?",
    answer:
      "Our reports are designed for auditor review. Each includes timestamped evidence, control mappings, and source references. The PDF format includes an executive summary and control-by-control breakdown with NIST-grounded assessment methodology. We recommend sharing reports with your auditor during audit planning.",
  },
  {
    question: "What's included in the free plan?",
    answer:
      "Up to 2 repositories, 2 compliance frameworks, the full evidence dashboard, gap analysis with prioritised action steps, basic compliance alerts, and control notes. Exports, the auditor portal, and shareable reports are Pro features at $5/mo.",
  },
  {
    question: "Can I use Audit Trail for partner or investor due diligence?",
    answer:
      "Yes. Generate a shareable compliance package: your framework scores, evidence summary, and control coverage. Send it as a link. No back-and-forth questionnaires. Works for vendor security reviews, enterprise sales, and M&A due diligence.",
  },
  {
    question: "Do you offer enterprise plans?",
    answer:
      "Yes. Enterprise includes SSO, custom framework mappings (IRAP, HIPAA, custom frameworks), dedicated support, and SLAs. Contact us to discuss.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 bg-white px-6">
      <div className="max-w-2xl mx-auto">
        <FadeIn direction="up" className="text-center mb-12">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">FAQ</p>
          <h2 className="text-2xl font-semibold text-gray-900">Common questions</h2>
        </FadeIn>

        <FadeIn direction="up" delay={0.2}>
          <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden bg-white">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`border-b border-gray-100 last:border-b-0 ${openIndex === index ? "bg-accent-light/30" : ""} transition-colors duration-200`}
              >
                <button
                  id={`faq-button-${index}`}
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-panel-${index}`}
                  className="w-full text-left py-4 px-5 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                >
                  <span className="text-sm font-medium text-gray-900 pr-4">{faq.question}</span>
                  <motion.svg
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-4 h-4 text-accent flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </motion.svg>
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      id={`faq-panel-${index}`}
                      role="region"
                      aria-labelledby={`faq-button-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed pr-12">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={0.4}>
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">
              More questions?{" "}
              <a href="/contact" className="text-accent hover:underline">
                Get in touch
              </a>
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
