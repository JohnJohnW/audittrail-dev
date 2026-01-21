import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 py-8 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium text-gray-900">
            AuditTrail<span className="text-accent">.dev</span>
          </Link>
          
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <a href="#pricing" className="hover:text-gray-900 transition-colors">
              Pricing
            </a>
            <Link href="/status" className="hover:text-gray-900 transition-colors">
              Status
            </Link>
            <a href="mailto:hello@audittrail.dev" className="hover:text-gray-900 transition-colors">
              Contact
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} AuditTrail. Built in Sydney.
          </p>
        </div>
      </div>
    </footer>
  );
}
