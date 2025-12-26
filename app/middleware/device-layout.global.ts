export default defineNuxtRouteMiddleware((to) => {
  // 🚫 Skip auth pages
  if (to.meta.layout === "auth") return;

  const device = useDevice();
  const layout = useState("layout", () => "default");

  if (device.isMobile) layout.value = "mobile";
  else layout.value = "default";
});
