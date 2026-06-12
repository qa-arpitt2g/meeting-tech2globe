import Image from 'next/image';

const buttonClass = 'bg-gradient-to-r from-blue-700 to-sky-500';

export default function FeatureCard({ title, description, buttonText, buttonVariant, icon, image, alt, capacity, onBook }) {
  const isSecondary = buttonVariant === 'secondary';
  const iconClass = isSecondary ? 'text-violet-600 bg-violet-50' : 'text-blue-700 bg-blue-50';

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-lg bg-white shadow-lg shadow-slate-200/80 ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 sm:aspect-[4/3] lg:aspect-[16/10]">
        <Image
          src={image}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 592px, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
          priority={!isSecondary}
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/45 to-transparent" />
        <div className={`absolute left-4 top-4 grid h-12 w-12 place-items-center rounded-lg ${iconClass} shadow-lg sm:h-14 sm:w-14`}>
          <span className="material-symbols-outlined text-[28px]" aria-hidden="true">{icon}</span>
        </div>
        {capacity && (
          <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {capacity}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6 lg:p-7">
        <h2 className="font-sans text-2xl font-bold leading-tight text-slate-950 sm:text-[26px] lg:text-3xl">
          {title}
        </h2>
        <p className="mt-3 flex-1 text-sm leading-6 text-slate-600 sm:text-base">
          {description}
        </p>
        <button
          type="button"
          onClick={onBook}
          className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg ${buttonClass} px-5 py-3 text-center text-base font-semibold text-white shadow-md transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        >
          <span>{buttonText}</span>
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            {isSecondary ? 'bolt' : 'arrow_forward'}
          </span>
        </button>
      </div>
    </article>
  );
}
