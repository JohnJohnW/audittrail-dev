"use client";

import { useState } from "react";

const faqs = [
  {
    question: "What GitHub access do you need?",
    answer:
      "Read-only access to repositories. We never modify your code or settings. You can revoke access at any time from your GitHub settings.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. We use read-only GitHub tokens, encrypt data in transit and at rest, and never store your source code. We only store metadata (commit hashes, PR numbers, branch names).",
  },
  {
    question: "Which compliance frameworks do you support?",
    answer:
      "ISO 27001:2022, Essential Eight, SOC 2 Type II, NIST CSF, and GDPR. We're actively adding more based on customer demand.",
  },
  {
    question: "Can I export reports?",
    answer:
      "Yes. Pro plans include unlimited PDF and CSV exports. Free tier lets you view evidence but not export.",
  },
  {
    question: "Do you offer enterprise plans?",
    answer:
      "Yes. Contact us for custom pricing, SSO, dedicated support, and custom framework mappings.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 bg-gray-50 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
            FAQ
          </p>
          <h2 className="text-2xl font-semibold text-gray-900">
            Common questions
          </h2>
        </div>

        <div className="space-y-0">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 last:border-b-0">
              <button
                className="w-full text-left py-4 flex items-center justify-between gap-4"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="text-sm font-medium text-gray-900">
                  {faq.question}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openIndex === index && (
                <div className="pb-4 text-sm text-gray-500 leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
