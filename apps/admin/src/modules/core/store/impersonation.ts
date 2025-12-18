import { ref } from 'vue';

const IMPERSONATION_USER_KEY = 'impersonationUser';
const IMPERSONATION_WORKSPACE_KEY = 'impersonationWorkspace';

// Reactive refs for impersonation state
export const isImpersonating = ref<boolean>(false);
export const impersonatedUser = ref<{ _id: string; name?: string; email?: string } | null>(null);
export const impersonatedWorkspace = ref<{ _id: string; name: string } | null>(null);

// Initialize impersonation from localStorage immediately
export function initializeImpersonation() {
  const impersonationUserStr = localStorage.getItem(IMPERSONATION_USER_KEY);
  const impersonationWorkspaceStr = localStorage.getItem(IMPERSONATION_WORKSPACE_KEY);
  
  if (impersonationUserStr) {
    try {
      const parsedUser = JSON.parse(impersonationUserStr);
      impersonatedUser.value = parsedUser;
      isImpersonating.value = true;
    } catch (e) {
      console.error('Failed to parse impersonation user', e);
      localStorage.removeItem(IMPERSONATION_USER_KEY);
    }
  }
  
  if (impersonationWorkspaceStr) {
    try {
      const parsedWorkspace = JSON.parse(impersonationWorkspaceStr);
      impersonatedWorkspace.value = parsedWorkspace;
    } catch (e) {
      console.error('Failed to parse impersonation workspace', e);
      localStorage.removeItem(IMPERSONATION_WORKSPACE_KEY);
    }
  }
}

// Clear impersonation
export function clearImpersonation() {
  isImpersonating.value = false;
  impersonatedUser.value = null;
  impersonatedWorkspace.value = null;
  localStorage.removeItem(IMPERSONATION_USER_KEY);
  localStorage.removeItem(IMPERSONATION_WORKSPACE_KEY);
}

// Set impersonation
export function setImpersonation(user: { _id: string; name?: string; email?: string }, workspace?: { _id: string; name: string }) {
  impersonatedUser.value = user;
  impersonatedWorkspace.value = workspace || null;
  isImpersonating.value = true;
  
  localStorage.setItem(IMPERSONATION_USER_KEY, JSON.stringify(user));
  if (workspace) {
    localStorage.setItem(IMPERSONATION_WORKSPACE_KEY, JSON.stringify(workspace));
  }
}

// Initialize immediately when this module is imported
initializeImpersonation();
