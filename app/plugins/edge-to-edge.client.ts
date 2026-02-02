import { defineNuxtPlugin } from '#app'
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support'

export default defineNuxtPlugin(() => {
  if (process.client) {
    const enableEdgeToEdge = async () => {
      try {
        await EdgeToEdge.enable({
          statusBarBackgroundColor: '#00000000',
          navigationBarBackgroundColor: '#00000000',
        })
      } catch (err) {
        console.warn('Edge-to-edge not available:', err)
      }
    }

    enableEdgeToEdge()
  }
})