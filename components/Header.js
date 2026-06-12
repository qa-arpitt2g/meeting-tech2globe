import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full bg-white/85 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-center px-4 sm:h-[72px] sm:px-6 lg:h-20 lg:px-8">
        <Link href="/" className="inline-flex max-w-full items-center justify-center" aria-label="Tech2Globe Home">
          <Image
            src="/assets/tech2globe-logo.webp"
            alt="Tech2Globe"
            width={180}
            height={54}
            className="h-9 w-auto max-w-[180px] object-contain sm:h-10 lg:h-11"
            priority
          />
        </Link>
      </div>
    </header>
  );
}
