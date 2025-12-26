// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const pinSession = useCookie('pin_session');

  // If visiting PIN page and session exists, redirect to dashboard
  if (to.path === '/' && pinSession.value) {
    return navigateTo('/pos/dashboard');
  }

  // For other pages, if session is missing, redirect to PIN page
  if (to.path !== '/' && !pinSession.value) {
    return navigateTo('/');
  }

  // Optional: session expiry check (1 day)
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  if (pinSession.value?.logged_in_at && now - pinSession.value.logged_in_at > oneDay) {
    pinSession.value = null;
    return navigateTo('/');
  }
});