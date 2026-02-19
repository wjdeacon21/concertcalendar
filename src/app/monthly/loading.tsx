export default function MonthlyLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      <div className="relative h-14 w-14">
        <div
          className="h-full w-full rounded-full border-4 border-charcoal/20 bg-charcoal"
          style={{ animation: "spin 3s linear infinite" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-cream" />
        </div>
      </div>
      <p className="font-serif text-lg text-charcoal/60">Loading your calendar…</p>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
