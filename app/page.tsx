import Link from 'next/link'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#faf8f5' }}>
      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <span
          className="text-xl tracking-widest uppercase"
          style={{ fontFamily: 'var(--font-cormorant)', color: '#3d3530', letterSpacing: '0.15em' }}
        >
          PLACECARD
        </span>
        <Link
          href="/dashboard"
          className="text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: '#3d3530' }}
        >
          Log in
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 -mt-16">
        <div className="text-center max-w-xl">
          {/* Decorative image */}
          <div className="mx-auto mb-8 w-48 h-48 rounded-full overflow-hidden shadow-lg">
            <Image
              src="/table-setting.jpg"
              alt="Elegant table setting"
              width={192}
              height={192}
              className="w-full h-full object-cover"
              priority
            />
          </div>

          <h1
            className="mb-4 italic"
            style={{
              fontFamily: 'var(--font-cormorant)',
              fontSize: '2.75rem',
              fontWeight: 400,
              color: '#3d3530',
              lineHeight: 1.15,
            }}
          >
            Every seat, thoughtfully placed.
          </h1>

          <p className="text-lg mb-10" style={{ color: '#8a7f74' }}>
            Your wedding seating chart, done in minutes.
          </p>

          <Link
            href="/dashboard"
            className="inline-block px-10 py-4 rounded-lg font-medium text-base transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#3d3530', color: '#faf8f5' }}
          >
            Get PLACECARD &mdash; $12
          </Link>

          <p className="mt-3 text-xs" style={{ color: '#8a7f74' }}>
            One-time purchase. Yours forever.
          </p>
        </div>
      </main>

      {/* Value props */}
      <section className="px-8 py-12 max-w-2xl mx-auto w-full">
        <div className="flex justify-center gap-12 text-center text-sm" style={{ color: '#8a7f74' }}>
          <div>
            <p className="font-medium mb-1" style={{ color: '#3d3530' }}>Drag, drop, done</p>
            <p>Build your chart visually</p>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ color: '#3d3530' }}>See the full picture</p>
            <p>Every table, every guest, at a glance</p>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ color: '#3d3530' }}>Works for any event</p>
            <p>Weddings, dinners, galas</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center">
        <span
          className="text-xs tracking-widest uppercase"
          style={{ fontFamily: 'var(--font-cormorant)', color: '#8a7f74', letterSpacing: '0.15em' }}
        >
          PLACECARD
        </span>
      </footer>
    </div>
  )
}
