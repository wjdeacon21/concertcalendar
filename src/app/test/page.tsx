export default function TestPage() {
  return (
    <div className="p-12 space-y-8">
      <h1 className="font-serif text-4xl font-medium leading-tight text-charcoal">
        Your music. Your city. This week.
      </h1>

      <p className="font-sans text-base leading-relaxed text-charcoal">
        This is body text using the Nunito sans font. It should feel friendly,
        readable, and warm — never harsh or mechanical.
      </p>

      <div className="bg-pine text-cream rounded-xl px-6 py-4 inline-block font-sans font-medium">
        Pine Green on Warm Cream — bg-pine text-cream
      </div>

      <div className="bg-clay text-cream rounded-xl px-6 py-4 inline-block font-sans font-medium">
        Soft Clay accent — bg-clay text-cream
      </div>

      <div className="bg-mustard text-charcoal rounded-xl px-6 py-4 inline-block font-sans font-medium">
        Muted Mustard highlight — bg-mustard text-charcoal
      </div>
    </div>
  );
}
