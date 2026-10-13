export default function StatCard({ label, value, icon: Icon, tone = "neutral" }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__icon" aria-hidden="true">
        {Icon && <Icon size={18} strokeWidth={1.9} />}
      </div>
      <div className="stat-card__body">
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__label">{label}</span>
      </div>
    </div>
  );
}
