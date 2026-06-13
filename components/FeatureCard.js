import Image from 'next/image';

export default function FeatureCard({ title, description, buttonText, buttonVariant, icon, image, alt, capacity, onBook }) {
  const isSecondary = buttonVariant === 'secondary';

  return (
    <article className="room-card group h-full min-w-0">
      <div className="room-card__image-wrap">
        <Image
          src={image}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 320px, (min-width: 768px) 45vw, 100vw"
          className="room-card__image"
          priority={!isSecondary}
        />
        <div className="room-card__icon-badge" aria-hidden="true">
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        {capacity && (
          <span className="absolute bottom-4 right-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {capacity}
          </span>
        )}
      </div>

      <div className="room-card__body">
        <div className="brand-accent-line brand-accent-line--card" aria-hidden="true" />
        <h2 className="room-card__title">{title}</h2>
        <p className="room-card__description">{description}</p>
        <div className="room-card__cta">
          <button type="button" onClick={onBook} className="btn-brand">
            <span>{buttonText}</span>
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              {isSecondary ? 'bolt' : 'arrow_forward'}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
