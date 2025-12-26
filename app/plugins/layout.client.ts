export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide('setLayout', (name: string) => {
    const layout = useState('layout', () => name);
    layout.value = name;
  });   
});
