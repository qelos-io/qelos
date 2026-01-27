import { PubSubService } from './services/pubsub'

// This is a declaration file for Vue global properties
declare module 'vue' {
  interface ComponentCustomProperties {
    $isMobile: boolean
    $isDarkTheme: boolean
    $pubsub: PubSubService
    $t: (key: string) => string
    $analytics: typeof analyticsService
  }
}
