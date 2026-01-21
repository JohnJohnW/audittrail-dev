import Link from "next/link";

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Check your email
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          We sent you a sign-in link. Click it to access your dashboard.
        </p>
        
        <div className="bg-gray-50 rounded-md p-4 mb-6">
          <p className="text-xs text-gray-500">
            The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
          </p>
        </div>
        
        <Link
          href="/auth/signin"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
