import { QelosSDKOptions } from '../types';
import BaseSDK from '../base-sdk';

export class QlRoles extends BaseSDK {
  private relativePath = '/api/roles';

  constructor(private options: QelosSDKOptions) {
    super(options);
  }

 // Method to get all existing roles
  getExistingRoles() {
    return this.callJsonApi<string[]>(this.relativePath);
  }
}