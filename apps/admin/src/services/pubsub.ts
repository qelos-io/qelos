/**
 * PubSub service for the admin frontend
 * Allows components to communicate with each other through a publish-subscribe pattern
 */

type Callback = (...args: any[]) => void | Promise<unknown>;

interface Subscription {
  event: string;
  callback: Callback;
  once: boolean;
}

// Singleton instance
let instance: PubSubService | null = null;

/**
 * PubSub service class
 */
class PubSubService {
  private subscriptions: Subscription[] = [];

  /**
   * Subscribe to an event
   * @param event - Event name
   * @param callback - Callback function to be called when the event is published
   * @returns Unsubscribe function
   */
  subscribe(event: string, callback: Callback): () => void {
    const subscription: Subscription = { event, callback, once: false };
    this.subscriptions.push(subscription);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscription);
    };
  }

  /**
   * Subscribe to an event once
   * @param event - Event name
   * @param callback - Callback function to be called when the event is published
   * @returns Unsubscribe function
   */
  once(event: string, callback: Callback): () => void {
    const subscription: Subscription = { event, callback, once: true };
    this.subscriptions.push(subscription);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscription);
    };
  }

  /**
   * Unsubscribe from an event
   * @param subscription - Subscription object
   */
  private unsubscribe(subscription: Subscription): void {
    const index = this.subscriptions.indexOf(subscription);
    if (index !== -1) {
      this.subscriptions.splice(index, 1);
    }
  }

  /**
   * Publish an event
   * @param event - Event name
   * @param args - Arguments to pass to the callback
   * @returns Promise that resolves when all subscribers have completed
   */
  async publish(event: string, ...args: any[]): Promise<any> {
    const subscriptions = this.subscriptions.filter(
      (subscription) => subscription.event === event
    );

    // Create an array of promises from all subscriber callbacks
    const callbackPromises = subscriptions.map(async (subscription) => {
      try {
        // Execute the callback and handle both synchronous and asynchronous results
        const result = subscription.callback(...args);
        await result; // This will be a no-op for synchronous callbacks
      } finally {
        // Remove subscription if it's a one-time subscription
        if (subscription.once) {
          this.unsubscribe(subscription);
        }
      }
    });

    // Return a promise that resolves when all callbacks are complete
    return Promise.all(callbackPromises).then(() => {});
  }

  /**
   * Clear all subscriptions for a specific event
   * @param event - Event name
   */
  clear(event?: string): void {
    if (event) {
      this.subscriptions = this.subscriptions.filter(
        (subscription) => subscription.event !== event
      );
    } else {
      this.subscriptions = [];
    }
  }

  /**
   * Get all active events
   * @returns Array of active event names
   */
  getActiveEvents(): string[] {
    return [...new Set(this.subscriptions.map((sub) => sub.event))];
  }
}

/**
 * Get the PubSub service instance
 * @returns PubSub service instance
 */
export function getPubSubService(): PubSubService {
  if (!instance) {
    instance = new PubSubService();
  }
  return instance;
}

// Create and export the default instance
const pubsub = getPubSubService();
export default pubsub;
