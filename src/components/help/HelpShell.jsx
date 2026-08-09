import { Link } from "react-router-dom";
import Logo from "../shared/Logo";
import { brand } from "../../data/constants";

// Marketing-side shell for the public Help Centre pages — same dark header /
// footer treatment as Landing and Pricing so the docs feel like the same site.
export default function HelpShell({ children }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/">
          <Logo light />
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            to="/help"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Help Centre
          </Link>
          <Link
            to="/help/faq"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white sm:block"
          >
            FAQ
          </Link>
          <Link
            to="/pricing"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white sm:block"
          >
            Pricing
          </Link>
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Log in
          </Link>
        </nav>
      </header>

      {children}

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        <p>
          {brand.domain} ·{" "}
          <a href={`mailto:${brand.supportEmail}`} className="hover:text-slate-300">
            {brand.supportEmail}
          </a>
        </p>
        <p className="mt-2 text-xs">{brand.copyright}</p>
        <p className="mt-2">
          <Link to="/" className="hover:text-slate-300">
            ← Back to home
          </Link>
        </p>
      </footer>
    </div>
  );
}
