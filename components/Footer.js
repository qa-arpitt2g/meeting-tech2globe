export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-6 text-center text-sm font-medium text-slate-600 sm:px-6 lg:px-8">
        <p>
          &copy; 2026{' '}
          <a
            href="https://www.tech2globe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-900 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Tech2Globe
          </a>
        </p>
      </div>
    </footer>
  );
}
