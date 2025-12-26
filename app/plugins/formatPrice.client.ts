export default defineNuxtPlugin(() => {
  const formatPrice = (amount: number | string) => {
    const value = Number(amount || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(value);
  };
  return {
    provide: {
      formatPrice,
    },
  };
});
