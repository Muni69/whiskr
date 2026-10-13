import { CheckCircle2, Clock, AlertTriangle, MinusCircle } from "lucide-react";

const STATUS_MAP = {
  Published: { className: "badge--published", icon: CheckCircle2 },
  Draft: { className: "badge--draft", icon: Clock },
  Synced: { className: "badge--synced", icon: CheckCircle2 },
  "Not connected": { className: "badge--muted", icon: MinusCircle },
  Error: { className: "badge--error", icon: AlertTriangle },
};

export default function StatusBadge({ status, withIcon = true }) {
  const config = STATUS_MAP[status] || { className: "badge--muted", icon: MinusCircle };
  const Icon = config.icon;
  return (
    <span className={`badge ${config.className}`}>
      {withIcon && <Icon size={13} strokeWidth={2.2} />}
      {status || "Unknown"}
    </span>
  );
}
