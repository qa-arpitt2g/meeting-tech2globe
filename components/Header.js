import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner container">
        <Link href="/" className="header-logo-link" aria-label="Tech2Globe — Home">
          <Image
            src="/assets/tech2globe-logo.webp"
            alt="Tech2Globe"
            width={160}
            height={48}
            style={{ objectFit: 'contain', height: '40px', width: 'auto' }}
            priority
          />
        </Link>
      </div>
    </header>
  );
}
