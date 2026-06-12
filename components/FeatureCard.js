import Image from 'next/image';

export default function FeatureCard({ title, description, features, buttonText, buttonVariant, icon, image, alt, onBook }) {
  const isSecondary = buttonVariant === 'secondary';
  return (
    <article className={`feature-card${isSecondary ? ' secondary-card' : ''}`}>
      {/* Image with Wave */}
      <div className="feature-card-image-wrapper">
        <Image src={image} alt={alt} fill className="feature-card-image" unoptimized loading={isSecondary ? 'lazy' : 'eager'} />
        <svg className="wave-overlay" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="#ffffff" d="M0,128L80,144C160,160,320,192,480,186.7C640,181,800,139,960,138.7C1120,139,1280,181,1360,202.7L1440,224L1440,320L0,320Z"></path>
          <path fill="none" stroke={isSecondary ? '#8b5cf6' : '#3b82f6'} strokeWidth="8" d="M0,128L80,144C160,160,320,192,480,186.7C640,181,800,139,960,138.7C1120,139,1280,181,1360,202.7L1440,224"></path>
        </svg>
      </div>

      {/* Floating Icon */}
      <div className="feature-card-icon-floating" aria-hidden="true">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      {/* Content */}
      <div className="feature-card-content">
        <h2>{title}</h2>
        <p>{description}</p>
        <ul className="feature-list">
          {features.map((feature) => (
            <li key={feature}>
              <div className="feature-list-icon">
                <span className="material-symbols-outlined">check</span>
              </div>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {/* CTA */}
        <button
          type="button"
          onClick={onBook}
          className={`feature-button ${isSecondary ? 'feature-button-secondary' : 'feature-button-primary'}`}
        >
          {buttonText}
          <span className="material-symbols-outlined">{isSecondary ? 'bolt' : 'arrow_forward'}</span>
        </button>
      </div>
    </article>
  );
}
