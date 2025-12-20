import BaseSDK from './base-sdk';

export default class QlPayments extends BaseSDK {
  // Placeholder methods for Sumit integration
  async createCustomer(customer: any): Promise<any> {
    return this.post('/api/payments/customers', customer);
  }

  async setPaymentDetails(customerId: string, paymentMethodToken: string): Promise<any> {
    return this.post(`/api/payments/customers/${customerId}/payment-methods`, { token: paymentMethodToken });
  }

  async listPaymentMethods(customerId: string): Promise<any> {
    return this.get(`/api/payments/customers/${customerId}/payment-methods`);
  }

  async createPaymentMethod(customerId: string, token: string): Promise<any> {
    return this.post(`/api/payments/customers/${customerId}/payment-methods`, { token });
  }

  async getPaymentMethod(customerId: string, paymentMethodId: string): Promise<any> {
    return this.get(`/api/payments/customers/${customerId}/payment-methods/${paymentMethodId}`);
  }

  async updatePaymentMethod(customerId: string, paymentMethodId: string, token: string): Promise<any> {
    return this.put(`/api/payments/customers/${customerId}/payment-methods/${paymentMethodId}`, { token });
  }

  async deletePaymentMethod(customerId: string, paymentMethodId: string): Promise<any> {
    return this.delete(`/api/payments/customers/${customerId}/payment-methods/${paymentMethodId}`);
  }

  async listPayments(customerId?: string): Promise<any> {
    const url = customerId ? `/api/payments?customerId=${customerId}` : '/api/payments';
    return this.get(url);
  }

  async createPayment(payment: any): Promise<any> {
    return this.post('/api/payments', payment);
  }

  async getPayment(paymentId: string): Promise<any> {
    return this.get(`/api/payments/${paymentId}`);
  }

  async updatePayment(paymentId: string, metadata: any): Promise<any> {
    return this.put(`/api/payments/${paymentId}`, { metadata });
  }

  async listRecurringPayments(customerId?: string): Promise<any> {
    const url = customerId ? `/api/recurring-payments?customerId=${customerId}` : '/api/recurring-payments';
    return this.get(url);
  }

  async createRecurringPayment(recurringPayment: any): Promise<any> {
    return this.post('/api/recurring-payments', recurringPayment);
  }

  async getRecurringPayment(recurringPaymentId: string): Promise<any> {
    return this.get(`/api/recurring-payments/${recurringPaymentId}`);
  }

  async updateRecurringPayment(recurringPaymentId: string, recurringPayment: any): Promise<any> {
    return this.put(`/api/recurring-payments/${recurringPaymentId}`, recurringPayment);
  }

  async deleteRecurringPayment(recurringPaymentId: string): Promise<any> {
    return this.delete(`/api/recurring-payments/${recurringPaymentId}`);
  }
}
