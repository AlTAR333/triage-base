import Link from "next/link";

export default function Nav() {
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/">Chat</Link>
      <Link href="/triage">Triage</Link>
      <Link href="/smoke">Smoke test</Link>
      <Link href="/admin">Admin</Link>
    </nav>
  );
}
