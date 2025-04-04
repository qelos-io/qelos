---
title: Building a Complete Authentication Flow
---

# {{ $frontmatter.title }}

This tutorial guides you through implementing a complete authentication flow using the Qelos SDK. You'll learn how to handle user sign-in, token refresh, session management, and sign-out functionality.

## Prerequisites

- Basic knowledge of JavaScript/TypeScript
- Qelos SDK installed in your project
- A Qelos application instance to connect to

## Setting Up the SDK

First, let's initialize the SDK with proper configuration for authentication:

```typescript
import { QelosSDK } from '@qelos/sdk';

// Create a function to initialize the SDK
function createSDK() {
  return new QelosSDK({
    appUrl: 'https://your-qelos-app.com',
    // Enable automatic token refresh
    forceRefresh: true,
    // Handle token refresh failures
    onFailedRefreshToken: async () => {
      console.log('Token refresh failed');
      // Clear any stored auth state
      localStorage.removeItem('isAuthenticated');
      // Redirect to login page
      window.location.href = '/login';
      return null;
    }
  });
}

// Create and export the SDK instance
export const sdk = createSDK();
```

## Implementing the Sign-In Page

Next, let's create a sign-in page that handles user authentication:

```typescript
// login.ts
import { sdk } from './sdk';

// DOM elements
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const emailInput = document.getElementById('email') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;
const rememberMeCheckbox = document.getElementById('remember-me') as HTMLInputElement;

// Handle form submission
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  // Clear previous error messages
  errorMessage.textContent = '';
  errorMessage.style.display = 'none';
  
  // Get form values
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const rememberMe = rememberMeCheckbox.checked;
  
  try {
    // Show loading state
    const submitButton = loginForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Signing in...';
      submitButton.setAttribute('disabled', 'true');
    }
    
    // Determine which authentication method to use based on remember me option
    if (rememberMe) {
      // Use OAuth authentication for remembered sessions
      await sdk.authentication.oAuthSignin({ username: email, password });
      // Store authentication state
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('authMethod', 'oauth');
    } else {
      // Use regular signin for session-only authentication
      await sdk.authentication.signin({ username: email, password });
      // Store authentication state (but will be cleared when browser closes)
      sessionStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('authMethod', 'session');
    }
    
    // Redirect to dashboard or previous page
    const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
    window.location.href = redirectUrl;
  } catch (error) {
    // Reset button state
    const submitButton = loginForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Sign In';
      submitButton.removeAttribute('disabled');
    }
    
    // Display error message
    errorMessage.textContent = 'Invalid email or password. Please try again.';
    errorMessage.style.display = 'block';
    console.error('Authentication error:', error);
  }
});
```

## Creating an Authentication Guard

To protect routes that require authentication, let's create an authentication guard:

```typescript
// auth-guard.ts
import { sdk } from './sdk';

/**
 * Checks if the user is authenticated and redirects to login if not
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function checkAuthentication(): Promise<boolean> {
  // Check if we have authentication state
  const isAuthenticated = 
    localStorage.getItem('isAuthenticated') === 'true' || 
    sessionStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    redirectToLogin();
    return false;
  }
  
  // Verify that the authentication is still valid by making a test API call
  try {
    // Make a lightweight API call to verify authentication
    await sdk.authentication.getLoggedInUser();
    return true;
  } catch (error) {
    // If we get a 401 error, the authentication is invalid
    if (error.status === 401) {
      redirectToLogin();
      return false;
    }
    
    // For other errors, we'll assume the authentication is still valid
    // This prevents logging users out due to temporary API issues
    console.warn('Auth verification failed, but not due to authentication:', error);
    return true;
  }
}

/**
 * Redirects to the login page, preserving the current URL as a redirect parameter
 */
function redirectToLogin() {
  // Clear authentication state
  localStorage.removeItem('isAuthenticated');
  sessionStorage.removeItem('isAuthenticated');
  
  // Redirect to login page with the current URL as the redirect parameter
  const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?redirect=${currentPath}`;
}
```

## Implementing Sign-Out Functionality

Let's create a sign-out function to properly end the user's session:

```typescript
// auth-service.ts
import { sdk } from './sdk';

/**
 * Signs the user out and redirects to the login page
 */
export async function signOut() {
  try {
    // Determine which sign-out method to use based on the auth method
    const authMethod = localStorage.getItem('authMethod');
    
    if (authMethod === 'oauth') {
      // For OAuth authentication, we need to invalidate the tokens
      await sdk.authentication.signout();
    } else {
      // For session authentication, we can just clear the cookie
      await sdk.authentication.signout();
    }
    
    // Clear authentication state
    localStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authMethod');
    
    // Redirect to login page
    window.location.href = '/login';
  } catch (error) {
    console.error('Error during sign-out:', error);
    // Even if the API call fails, we'll still clear local state and redirect
    localStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authMethod');
    window.location.href = '/login';
  }
}

// Usage in a logout button
document.getElementById('logout-button')?.addEventListener('click', (event) => {
  event.preventDefault();
  signOut();
});
```

## Implementing a User Profile Component

Let's create a component to display the current user's information:

```typescript
// user-profile.ts
import { sdk } from './sdk';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roles: string[];
}

class UserProfileComponent {
  private profileElement: HTMLElement;
  private user: UserProfile | null = null;
  
  constructor(elementId: string) {
    this.profileElement = document.getElementById(elementId) as HTMLElement;
    if (!this.profileElement) {
      throw new Error(`Element with ID ${elementId} not found`);
    }
    
    this.loadUserProfile();
  }
  
  private async loadUserProfile() {
    try {
      // Show loading state
      this.renderLoadingState();
      
      // Fetch user profile
      const user = await sdk.authentication.getLoggedInUser();
      this.user = user;
      
      // Render the user profile
      this.renderUserProfile();
    } catch (error) {
      console.error('Failed to load user profile:', error);
      this.renderErrorState();
    }
  }
  
  private renderLoadingState() {
    this.profileElement.innerHTML = `
      <div class="loading-spinner">
        <span>Loading profile...</span>
      </div>
    `;
  }
  
  private renderErrorState() {
    this.profileElement.innerHTML = `
      <div class="error-message">
        <p>Failed to load profile. <button id="retry-profile">Retry</button></p>
      </div>
    `;
    
    document.getElementById('retry-profile')?.addEventListener('click', () => {
      this.loadUserProfile();
    });
  }
  
  private renderUserProfile() {
    if (!this.user) return;
    
    const { name, email, avatar, roles } = this.user;
    
    this.profileElement.innerHTML = `
      <div class="user-profile">
        <div class="profile-header">
          ${avatar ? `<img src="${avatar}" alt="${name}" class="avatar">` : ''}
          <h3>${name}</h3>
          <p>${email}</p>
        </div>
        <div class="profile-details">
          <p><strong>Roles:</strong> ${roles.join(', ')}</p>
        </div>
        <div class="profile-actions">
          <button id="edit-profile">Edit Profile</button>
          <button id="logout-button">Sign Out</button>
        </div>
      </div>
    `;
    
    // Add event listeners
    document.getElementById('logout-button')?.addEventListener('click', () => {
      // Import and call the signOut function
      import('./auth-service').then(({ signOut }) => signOut());
    });
    
    document.getElementById('edit-profile')?.addEventListener('click', () => {
      window.location.href = '/profile/edit';
    });
  }
}

// Initialize the component when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new UserProfileComponent('user-profile-container');
});
```

## Putting It All Together

Now let's see how to integrate these components in your application:

```typescript
// app.ts
import { checkAuthentication } from './auth-guard';

// Define routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
  '/admin'
];

// Check if the current route requires authentication
const currentPath = window.location.pathname;
const requiresAuth = protectedRoutes.some(route => 
  currentPath === route || currentPath.startsWith(`${route}/`)
);

// Initialize the application
async function initApp() {
  // If the route requires authentication, check if the user is authenticated
  if (requiresAuth) {
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
      // The auth guard will handle the redirect
      return;
    }
  }
  
  // Initialize the rest of your application
  console.log('App initialized');
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
```

## HTML Templates

Here are the HTML templates for the login page and user profile:

### Login Page (login.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Qelos App</title>
  <link rel="stylesheet" href="/styles/auth.css">
</head>
<body>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <img src="/images/logo.svg" alt="Qelos Logo" class="logo">
        <h1>Sign In</h1>
      </div>
      
      <div id="error-message" class="error-message" style="display: none;"></div>
      
      <form id="login-form" class="auth-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email">
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required autocomplete="current-password">
        </div>
        
        <div class="form-options">
          <div class="remember-me">
            <input type="checkbox" id="remember-me" name="remember-me">
            <label for="remember-me">Remember me</label>
          </div>
          
          <a href="/forgot-password" class="forgot-password">Forgot password?</a>
        </div>
        
        <button type="submit" class="btn-primary">Sign In</button>
      </form>
      
      <div class="auth-footer">
        <p>Don't have an account? <a href="/register">Sign up</a></p>
      </div>
    </div>
  </div>
  
  <script src="/js/login.js"></script>
</body>
</html>
```

### User Profile Container (profile.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Profile - Qelos App</title>
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <header>
    <!-- Navigation menu -->
  </header>
  
  <main>
    <div class="container">
      <h1>User Profile</h1>
      
      <div id="user-profile-container">
        <!-- User profile will be rendered here -->
      </div>
    </div>
  </main>
  
  <footer>
    <!-- Footer content -->
  </footer>
  
  <script src="/js/user-profile.js"></script>
</body>
</html>
```

## Conclusion

In this tutorial, you've learned how to implement a complete authentication flow using the Qelos SDK, including:

1. Setting up the SDK with proper authentication configuration
2. Implementing a sign-in page with both session and OAuth authentication options
3. Creating an authentication guard to protect routes
4. Implementing sign-out functionality
5. Building a user profile component that displays the authenticated user's information

This implementation provides a solid foundation for authentication in your Qelos application. You can extend it further by adding features like:

- Registration form for new users
- Password reset functionality
- Multi-factor authentication
- Role-based access control

By following these patterns, you can create a secure and user-friendly authentication experience in your application.
