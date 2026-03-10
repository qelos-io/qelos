import { validateSignInForm, validateSignUpForm } from '../signin-signup-token';

describe('signin-signup-token', () => {
  describe('validateSignInForm', () => {
    it('should return no errors for valid payload', () => {
      const errors = validateSignInForm({ password: 'validpassword' });
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should return error when payload is null', () => {
      const errors = validateSignInForm(null);
      expect(errors.password).toBeDefined();
      expect(errors.password.code).toBe('EMPTY_PASSWORD');
    });

    it('should return error when payload is undefined', () => {
      const errors = validateSignInForm(undefined);
      expect(errors.password).toBeDefined();
      expect(errors.password.code).toBe('EMPTY_PASSWORD');
    });

    it('should return error when password is missing', () => {
      const errors = validateSignInForm({ email: 'test@example.com' });
      expect(errors.password).toBeDefined();
      expect(errors.password.code).toBe('EMPTY_PASSWORD');
    });

    it('should return error when password is empty string', () => {
      const errors = validateSignInForm({ password: '' });
      expect(errors.password).toBeDefined();
      expect(errors.password.code).toBe('EMPTY_PASSWORD');
    });

    it('should return error when password is only whitespace', () => {
      const errors = validateSignInForm({ password: '   ' });
      expect(errors.password).toBeDefined();
      expect(errors.password.code).toBe('EMPTY_PASSWORD');
    });

    it('should return error when password is not a string', () => {
      const errors = validateSignInForm({ password: 12345 });
      expect(errors.password).toBeDefined();
    });
  });

  describe('validateSignUpForm', () => {
    it('should return no errors for valid payload', () => {
      const errors = validateSignUpForm({
        email: 'test@example.com',
        firstName: 'John',
        password: 'longpassword',
      });
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should return error when payload is null', () => {
      const errors = validateSignUpForm(null);
      expect(errors.email).toBeDefined();
      expect(errors.firstName).toBeDefined();
      expect(errors.password).toBeDefined();
    });

    it('should return error when payload is undefined', () => {
      const errors = validateSignUpForm(undefined);
      expect(errors.email).toBeDefined();
      expect(errors.firstName).toBeDefined();
      expect(errors.password).toBeDefined();
    });

    it('should return email error for invalid email', () => {
      const errors = validateSignUpForm({
        email: 'not-an-email',
        firstName: 'John',
        password: 'longpassword',
      });
      expect(errors.email).toBeDefined();
      expect(errors.email.code).toBe('INVALID_EMAIL');
    });

    it('should return email error for missing email', () => {
      const errors = validateSignUpForm({
        firstName: 'John',
        password: 'longpassword',
      });
      expect(errors.email).toBeDefined();
    });

    it('should return firstName error for invalid firstName', () => {
      const errors = validateSignUpForm({
        email: 'test@example.com',
        firstName: '123',
        password: 'longpassword',
      });
      expect(errors.firstName).toBeDefined();
      expect(errors.firstName.code).toBe('INVALID_NAME');
    });

    it('should return firstName error for empty firstName', () => {
      const errors = validateSignUpForm({
        email: 'test@example.com',
        firstName: '',
        password: 'longpassword',
      });
      expect(errors.firstName).toBeDefined();
    });

    it('should accept hyphenated first names', () => {
      const errors = validateSignUpForm({
        email: 'test@example.com',
        firstName: 'Mary-Jane',
        password: 'longpassword',
      });
      expect(errors.firstName).toBeUndefined();
    });

    it('should accept first names with spaces', () => {
      const errors = validateSignUpForm({
        email: 'test@example.com',
        firstName: 'Mary Jane',
        password: 'longpassword',
      });
      expect(errors.firstName).toBeUndefined();
    });

    it('should return password error for short password', () => {
      const errors = validateSignUpForm({
        email: 'test@example.com',
        firstName: 'John',
        password: 'short',
      });
      expect(errors.password).toBeDefined();
      expect(errors.password.code).toBe('INVALID_PASSWORD');
    });

    it('should return password error for password with exactly 7 characters', () => {
      const errors = validateSignUpForm({
        email: 'test@example.com',
        firstName: 'John',
        password: '1234567',
      });
      expect(errors.password).toBeDefined();
    });

    it('should accept password with exactly 8 characters', () => {
      const errors = validateSignUpForm({
        email: 'test@example.com',
        firstName: 'John',
        password: '12345678',
      });
      expect(errors.password).toBeUndefined();
    });

    it('should return multiple errors for completely invalid payload', () => {
      const errors = validateSignUpForm({
        email: 'bad',
        firstName: '!!!',
        password: 'x',
      });
      expect(errors.email).toBeDefined();
      expect(errors.firstName).toBeDefined();
      expect(errors.password).toBeDefined();
    });
  });
});
