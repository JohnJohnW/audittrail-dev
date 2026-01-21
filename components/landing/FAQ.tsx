"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";

const faqs = [
  {
    question: "What GitHub permissions do you need?",
    answer:
      "Read-only access to repositories, commits, pull requests, and branch protection settings. We use OAuth with the minimum required scopes. We never write to or modify your repositories. You can revoke access anytime from GitHub Settings.",
  },
  {
    question: "Is my source code secure?",
    answer:
      "We never store your source code. We only extract metadata: commit hashes, PR numbers, branch names, timestamps, and authors. All data is encrypted in transit (TLS 1.3) and at rest. We're hosted on Vercel and Supabase with enterprise-grade security.",
  },
  {
    question: "Which compliance controls can you evidence?",
    answer:
      "We map to change management, access control, and audit trail controls. For ISO 27001, that includes A.8.32 (Change Management), A.8.4 (Access to Source Code), and secure development lifecycle controls. For ACSC Essential Eight, we cover application control, patching, and administrative privilege restrictions. Full control mappings are available in the dashboard.",
  },
  {
    question: "Why only Australian frameworks?",
    answer:
      "We've built AuditTrail specifically for Australian businesses. ISO 27001 is the most common information security standard here, and Essential Eight is mandated by the ACSC for government suppliers. By focusing on these frameworks, we provide deeper, more accurate control mappings.",
  },
  {
    question: "Will auditors accept these reports?",
    answer:
      "Our reports are designed for auditor review. Each report includes timestamped evidence, control mappings, and source references. The PDF format includes an executive summary and control-by-control breakdown. We recommend reviewing reports with your auditor during the planning phase.",
  },
  {
    question: "How often do you sync data?",
    answer:
      "We sync repository data daily via automated jobs. You can also trigger manual syncs from the dashboard anytime. Initial sync typically completes within a few minutes depending on repository size.",
  },
  {
    question: "Can I use this for my certification audit?",
    answer:
      "Yes. AuditTrail generates evidence that supports certification audits for ISO 27001 and Essential Eight assessments. However, we're one part of your compliance program—you'll still need policies, risk assessments, and other controls that Git activity can't evidence.",
  },
  {
    question: "Do you offer enterprise plans?",
    answer:
      "Yes. Enterprise includes SSO, custom framework mappings (including IRAP), dedicated support, and SLAs. Contact us at hello@audittrail.dev to discuss your requirements.",
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
              <a href="mailto:hello@audittrail.dev" className="text-accent hover:underline">
                Get in touch
              </a>
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
