import Link from "next/link";

export default function Header() {
  return (
    <header className="topbar">
      <Link href="/" className="brand brand-logo-link" aria-label="Electropico Splits home">
        <img className="brand-logo" src="/electropico-logo.svg" alt="Electropico Records" />
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
