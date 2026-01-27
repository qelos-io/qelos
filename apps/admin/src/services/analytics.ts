import { watch } from 'vue'
import * as Sentry from '@sentry/vue'
import { authStore } from '@/modules/core/store/auth'

interface AnalyticsUser {
  _id: string
  email?: string
  username?: string
}

declare global {
  interface Window {
    clarity?: (method: string, ...args: any[]) => void
    gtag?: (command: string, action: string, options?: any) => void
    ga?: (command: string, action: string, options?: any) => void
    dataLayer?: any[]
    SENTRY_DSN?: string
  }
}

class AnalyticsService {
  private initialized = false

  initialize(app: any, router: any) {
    if (this.initialized) return

    // Check if any analytics service is available
    const hasSentry = !!(import.meta.env?.VITE_SENTRY_DSN || window.SENTRY_DSN)
    const hasClarity = !!window.clarity
    const hasGA = !!(window.gtag || window.ga)
    const hasAnyAnalytics = hasSentry || hasClarity || hasGA

    if (!hasAnyAnalytics) {
      return
    }

    // Initialize Sentry
    this.initSentry(app, router)

    // Set up user tracking only if analytics are available
    this.setupUserTracking()

    this.initialized = true
  }

  private initSentry(app: any, router: any) {
    const dsn = import.meta.env?.VITE_SENTRY_DSN || window.SENTRY_DSN
    
    if (!dsn) return

    Sentry.init({
      app,
      dsn,
      integrations: [
        Sentry.browserTracingIntegration({ router })
      ],
    })
  }

  private setupUserTracking() {
    const storeInstance = authStore
    
    watch(() => storeInstance.user, (user) => {
      if (user) {
        this.identifyUser(user)
      } else {
        this.clearUser()
      }
    }, { immediate: true })
  }

  identifyUser(user: AnalyticsUser) {
    // Sentry user identification
    if (import.meta.env?.VITE_SENTRY_DSN || window.SENTRY_DSN) {
      Sentry.setUser({
        id: user._id,
        email: user.email,
        username: user.username
      })
    }

    // Clarity user identification
    if (window.clarity) {
      try {
        window.clarity('identify', user._id, user.username, user.email)
      } catch (error) {
        // console.error('Error identifying user with Clarity:', error)
      }
    }

    // Google Analytics user identification
    if (window.gtag) {
      try {
        window.gtag('config', 'GA_MEASUREMENT_ID', {
          user_id: user._id,
          custom_map: { user_id: 'user_id' }
        })
      } catch (error) {
        // console.error('Error identifying user with Google Analytics:', error)
      }
    } else if (window.ga) {
      try {
        window.ga('set', 'userId', user._id)
      } catch (error) {
        // console.error('Error identifying user with Google Analytics (legacy):', error)
      }
    }
  }

  clearUser() {
    // Clear Sentry user
    if (import.meta.env?.VITE_SENTRY_DSN || window.SENTRY_DSN) {
      Sentry.setUser(null)
    }

    // Clarity doesn't have a clear method, but we can restart the session
    if (window.clarity) {
      try {
        window.clarity('restart')
      } catch (error) {
        // console.error('Error restarting Clarity session:', error)
      }
    }

    // Google Analytics doesn't need explicit user clearing
  }

  // Custom event tracking
  trackEvent(eventName: string, parameters?: Record<string, any>) {
    // Google Analytics event tracking
    if (window.gtag) {
      try {
        window.gtag('event', eventName, parameters)
      } catch (error) {
        // console.error('Error tracking event with Google Analytics:', error)
      }
    } else if (window.ga) {
      try {
        (window.ga as any)('send', {
          hitType: 'event',
          eventCategory: parameters?.category || 'interaction',
          eventAction: eventName,
          eventLabel: parameters?.label || '',
          eventValue: parameters?.value || 0
        })
      } catch (error) {
        // console.error('Error tracking event with Google Analytics (legacy):', error)
      }
    }

    // Clarity event tracking
    if (window.clarity) {
      try {
        window.clarity('event', eventName)
      } catch (error) {
        // console.error('Error tracking event with Clarity:', error)
      }
    }
  }
}

export const analyticsService = new AnalyticsService()
export default analyticsService
