export default function StatusCard({ icon, label, value }) {
  return (
    <div className="status-card">
      <div className="status-icon" aria-hidden="true">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="status-label">{label}</p>
        <p className="status-value">{value}</p>
      </div>
    </div>
  );
}
