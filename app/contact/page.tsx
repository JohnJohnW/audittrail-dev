import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact - Vigil Sec",
  description:
    "Get in touch with the Vigil Sec team for enterprise plans, questions, or partnership inquiries.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Get in touch</h1>
          <p className="text-gray-500 text-sm">
            Questions about enterprise plans, custom frameworks, or anything else? We read every
            message.
          </p>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
