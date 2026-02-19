interface DateHeaderProps {
  date: string;   // YYYY-MM-DD
  isFirst?: boolean;
}

export default function DateHeader({ date, isFirst = false }: DateHeaderProps) {
  // Append T00:00:00 to prevent UTC-to-local date shift
  const d = new Date(date + "T00:00:00");
  const formatted = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <h2
      className={`font-serif text-2xl font-medium text-charcoal mb-4 ${
        isFirst ? "mt-0" : "mt-12"
      }`}
    >
      {formatted}
    </h2>
  );
}
