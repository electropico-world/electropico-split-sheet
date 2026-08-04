import type { AgreementStatus } from "@/lib/types";

export default function StatusBadge({ status }: { status: AgreementStatus }) {
  return <span className={`status ${status}`}>{status === "pending" ? "Waiting for signatures" : status}</span>;
}
