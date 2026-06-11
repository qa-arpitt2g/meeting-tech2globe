import Image from 'next/image';

export default function FeatureCard({ title, description, features, buttonText, buttonVariant, icon, image, alt, onBook }) {
  const isSecondary = buttonVariant === 'secondary';
  return (
    <article className={`feature-card${isSecondary ? ' secondary-card' : ''}`}>
      {/* Subtle background image */}
      <div className="feature-card-background" aria-hidden="true">
        <Image src={image} alt={alt} fill className="feature-card-image" unoptimized loading={isSecondary ? 'lazy' : 'eager'} />
      </div>

      {/* Content */}
      <div className="feature-card-content">
        <div className="feature-card-icon" aria-hidden="true">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <h2>{title}</h2>
        <p>{description}</p>
        <ul className="feature-list">
          {features.map((feature) => (
            <li key={feature}>
              <span className="material-symbols-outlined">check_circle</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA — opens booking modal on the same page */}
      <button
        type="button"
        onClick={onBook}
        className={`feature-button ${isSecondary ? 'feature-button-secondary' : 'feature-button-primary'}`}
      >
        {buttonText}
        <span className="material-symbols-outlined">{isSecondary ? 'bolt' : 'arrow_forward'}</span>
      </button>
    </article>
  );
}
