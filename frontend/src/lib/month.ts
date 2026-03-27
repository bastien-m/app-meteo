export const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => {
  const date = new Date(2000, i, 1);
  return {
    short: date.toLocaleDateString("fr-FR", { month: "short" }),
    long: date.toLocaleDateString("fr-FR", { month: "long" }),
  };
});
