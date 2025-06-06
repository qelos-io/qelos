
export interface IUserAdditionalField {
  key: string
  name: string,
  label: string,
  inputType: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'radio',
  valueType: 'string' | 'number' | 'boolean',
  required: boolean,
  defaultValue?: any;
  options?: Array<{ label: string, value: string }>,
}

export interface IAuthConfigurationMetadata {
  treatUsernameAs: 'email' | 'username' | 'phone',
  formPosition: 'left' | 'right' | 'center' | 'top' | 'bottom',
  loginTitle?: string,
  slots?: {
    loginHeader?: string,
    loginFooter?: string,
  },
  showLoginPage: boolean,
  showRegisterPage: boolean,
  backgroundImage?: string,
  socialLoginsSources?: {
    linkedin?: string,
    facebook?: string,
  }
  allowSocialAutoRegistration?: boolean,
  additionalUserFields: Array<IUserAdditionalField>

  disableUsernamePassword?: boolean; 
}