import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-zinc-800">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-50">
          PromptBridge
        </Link>
        <nav className="flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-50"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
