import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between p-3 font-medium">
        <Link
          href="/meeting"
          className="text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300"
        >
          Nouvelle réunion
        </Link>
        <div className="flex items-center gap-3">
          <SignedIn>
            <div className="flex items-center gap-5">
              <Link
                href="/meeting/meetings"
                className="text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300"
              >
                Mes réunions
              </Link>
              <UserButton />
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton />
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
