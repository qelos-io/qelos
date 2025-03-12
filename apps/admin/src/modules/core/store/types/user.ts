export interface IUser {
  _id: string,
  fullName: string,
  firstName: string,
  lastName: string,
  birthDate: string,
  username: string,
  email: string,
  emailVerified?: boolean,
  profileImage?: string,
  socialLogins: string[],
  roles: Array<string>,
  metadata: any,
  internalMetadata?: any,
  workspace?: {
    _id: string,
    name: string,
    roles: Array<string>,
    labels?: string[];
  }
}
