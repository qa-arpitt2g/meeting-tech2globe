import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner container">
        <Link href="/" aria-label="Tech2Globe — Home">
          <Image
            src="/assets/tech2globe-logo.webp"
            alt="Tech2Globe"
            width={120}
            height={36}
            style={{ objectFit: 'contain', height: '32px', width: 'auto' }}
          />
        </Link>
        <nav className="footer-links">
          <a href="https://www.tech2globe.com/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <a href="https://www.tech2globe.com/cookies-privacy-policy" target="_blank" rel="noopener noreferrer">Cookie Policy</a>
        </nav>
      </div>
    </footer>
  );
}
