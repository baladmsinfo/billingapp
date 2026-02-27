// // middleware/auth.global.ts
// export default defineNuxtRouteMiddleware((to) => {
//   const pinSession = useCookie('pin_session');

//   // If visiting PIN page and session exists, redirect to dashboard
//   if (to.path === '/' && pinSession.value) {
//     return navigateTo('/pos/dashboard');
//   }

//   // For other pages, if session is missing, redirect to PIN page
//   if (to.path !== '/' && !pinSession.value) {
//     return navigateTo('/');
//   }

//   // Optional: session expiry check (1 day)
//   const now = Date.now();
//   const oneDay = 24 * 60 * 60 * 1000;
//   if (pinSession.value?.logged_in_at && now - pinSession.value.logged_in_at > oneDay) {
//     pinSession.value = null;
//     return navigateTo('/');
//   }
// });


// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const loginSession = useCookie("login_session");

  const isLoggedIn = !!loginSession.value;
  const publicPages = ["/", "/register"]; // <-- allowed without login

  /* ---------------------------------------------------------
     1️⃣ If user is logged in and visits login/register → redirect
  --------------------------------------------------------- */
  if (isLoggedIn && publicPages.includes(to.path)) {
    return navigateTo("/pos/dashboard");
  }

  /* ---------------------------------------------------------
     2️⃣ If user is NOT logged in
         - Allow only "/" (login) and "/register"
         - Block everything else
  --------------------------------------------------------- */
  if (!isLoggedIn && !publicPages.includes(to.path)) {
    return navigateTo("/");
  }

  /* ---------------------------------------------------------
     3️⃣ Session Expiry Check (Optional)
  --------------------------------------------------------- */
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (
    isLoggedIn &&
    loginSession.value?.logged_in_at &&
    now - loginSession.value.logged_in_at > oneDay
  ) {
    loginSession.value = null;
    return navigateTo("/");
  }

  // Allow route
});