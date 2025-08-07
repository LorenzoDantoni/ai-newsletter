"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const DashboardPage = () => {
  const router = useRouter();
  return (
    <div>
      <div>
        <div>
          <h1>Your Newsletter Dashboard</h1>
          <p>Manage your personalized news letter preferences</p>
        </div>

        <div>
          <div>
            <h2>Current Preferences</h2>
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No preferences set yet</p>
              <Link
                href="/select"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Set Up Newsletter
              </Link>
            </div>
          </div>

          <div>
            <h2>Actions</h2>
            <div>
              <button onClick={() => router.push("/select")}>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                  Update Preferences
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
