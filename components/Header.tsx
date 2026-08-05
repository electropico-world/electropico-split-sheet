import Link from "next/link";

function ElectropicoLogoMark() {
  return (
    <span className="brand-inline-logo" aria-hidden="true">
      <svg viewBox="0 0 220 80" focusable="false">
        <path d="M12 55 L34 18 L59 13 L91 25 L134 22 L173 31 L208 19 L191 47 L210 70 L156 63 L114 71 L70 61 L31 68 Z" />
        <path d="M31 55 L46 28 L57 24 L83 33 L131 30 L172 38 L190 31 L179 47 L191 62 L154 56 L113 64 L72 55 L39 61 Z" className="fill" />
        <path d="M52 43 L43 59 L60 50" className="bolt" />
        <path d="M151 38 L145 53 L161 43" className="bolt" />
        <circle cx="175" cy="36" r="4" />
        <text x="72" y="50">ELECTROPICO</text>
      </svg>
    </span>
  );
}

export default function Header() {
  return (
    <header className="topbar">
      <Link href="/" className="brand brand-logo-link" aria-label="Electropico Splits home">
        <ElectropicoLogoMark />
        <span className="brand-title">SPLITS</span>
      </Link>
      <div className="nav-actions">
        <Link className="btn btn-secondary" href="/agreements/new">New agreement</Link>
        <form action="/api/auth/logout" method="post">
          <button className="btn" type="submit">Log out</button>
        </form>
      </div>
    </header>
  );
}
