
import { SumitTargetOperation } from '@qelos/global-types';
import BaseSDK from './base-sdk';

export default class QlPayments extends BaseSDK {
  private async triggerSumitOperation(sourceId: string, operation: SumitTargetOperation, payload: any = {}, details: any = {}): Promise<any> {
    return this.post(`/internal-api/integration-sources/${sourceId}/trigger`, {
      operation,
      payload,
      details,
    });
  }

  async createCustomer(sourceId: string, customer: any): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.createCustomer, customer);
  }

  async setPaymentDetails(sourceId: string, customerId: string, paymentMethodToken: string): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.setPaymentDetails, { customerId, paymentMethodToken });
  }

  async listPaymentMethods(sourceId: string, customerId: string): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.listPaymentMethods, { customerId });
  }

  async createPaymentMethod(sourceId: string, customerId: string, token: string): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.createPaymentMethod, { customerId, token });
  }

  async getPaymentMethod(sourceId: string, customerId: string, paymentMethodId: string): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.getPaymentMethod, { customerId, paymentMethodId });
  }

  async updatePaymentMethod(sourceId: string, customerId: string, paymentMethodId: string, token: string): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.updatePaymentMethod, { customerId, paymentMethodId, token });
  }

  async deletePaymentMethod(sourceId: string, customerId: string, paymentMethodId: string): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.deletePaymentMethod, { customerId, paymentMethodId });
  }

  async listPayments(sourceId: string, customerId?: string): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.listPayments, { customerId });
  }

  async createPayment(sourceId: string, payment: any): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.createPayment, payment);
  }

  async getPayment(sourceId: string, paymentId: string): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.getPayment, { paymentId });
  }

  async updatePayment(sourceId: string, paymentId: string, metadata: any): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.updatePayment, { paymentId, metadata });
  }

  async listRecurringPayments(sourceId: string, customerId?: string): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.listRecurringPayments, { customerId });
  }

  async createRecurringPayment(sourceId: string, recurringPayment: any): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.createRecurringPayment, recurringPayment);
  }

  async getRecurringPayment(sourceId: string, recurringPaymentId: string): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.getRecurringPayment, { recurringPaymentId });
  }

  async updateRecurringPayment(sourceId: string, recurringPaymentId: string, recurringPayment: any): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.updateRecurringPayment, { recurringPaymentId, ...recurringPayment });
  }

  async deleteRecurringPayment(sourceId: string, recurringPaymentId: string): Promise<any> {
    return this.triggerSumitOperation(sourceId, SumitTargetOperation.deleteRecurringPayment, { recurringPaymentId });
  }
}
