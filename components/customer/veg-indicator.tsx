export function VegIndicator({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      title={isVeg ? "Vegetarian" : "Non-vegetarian"}
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className={`inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border ${
        isVeg
          ? "border-emerald-600 dark:border-emerald-400"
          : "border-rose-600 dark:border-rose-400"
      }`}
    >
      <span
        className={`size-2 rounded-full ${
          isVeg
            ? "bg-emerald-600 dark:bg-emerald-400"
            : "bg-rose-600 dark:bg-rose-400"
        }`}
      />
    </span>
  );
}

