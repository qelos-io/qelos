import fs from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.mjs';

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function isObjectId(value) {
  return typeof value === 'string' && OBJECT_ID_RE.test(value);
}

function loadJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {
    logger.warning(`Failed to parse ${filePath}`);
  }
  return null;
}

/**
 * Create a resolver for dump: replaces user/workspace ObjectIDs with username/workspace name.
 * Reads users.json and workspaces.json from dumpPath to build lookup maps.
 * If those files don't exist yet, returns a no-op function.
 */
export function createDumpResolver(dumpPath) {
  const users = loadJsonFile(join(dumpPath, 'users.json'));
  const workspaces = loadJsonFile(join(dumpPath, 'workspaces.json'));

  const userIdToUsername = new Map();
  const workspaceIdToName = new Map();

  if (users && Array.isArray(users)) {
    for (const user of users) {
      if (user._id && user.username) {
        userIdToUsername.set(user._id, user.username);
      }
    }
    logger.debug(`Dump resolver: loaded ${userIdToUsername.size} users`);
  }

  if (workspaces && Array.isArray(workspaces)) {
    for (const ws of workspaces) {
      if (ws._id && ws.name) {
        workspaceIdToName.set(ws._id, ws.name);
      }
    }
    logger.debug(`Dump resolver: loaded ${workspaceIdToName.size} workspaces`);
  }

  if (userIdToUsername.size === 0 && workspaceIdToName.size === 0) {
    return null;
  }

  return (entity) => {
    const resolved = { ...entity };
    if (resolved.user && isObjectId(resolved.user) && userIdToUsername.has(resolved.user)) {
      resolved.user = userIdToUsername.get(resolved.user);
    }
    if (resolved.workspace && isObjectId(resolved.workspace) && workspaceIdToName.has(resolved.workspace)) {
      resolved.workspace = workspaceIdToName.get(resolved.workspace);
    }
    return resolved;
  };
}

/**
 * Create a resolver for restore: replaces usernames/workspace names with ObjectIDs.
 * Looks up users/workspaces in the target environment. Creates missing ones from local dump files.
 */
export async function createRestoreResolver(sdk, dumpPath) {
  // Cache for looked-up users/workspaces to avoid repeated API calls
  const usernameToId = new Map();
  const workspaceNameToId = new Map();

  // Load local dump files for create-if-missing
  const localUsers = loadJsonFile(join(dumpPath, 'users.json')) || [];
  const localWorkspaces = loadJsonFile(join(dumpPath, 'workspaces.json')) || [];

  // Pre-fetch all workspaces (usually a small set)
  try {
    const targetWorkspaces = await sdk.adminWorkspaces.getList();
    for (const ws of targetWorkspaces) {
      if (ws.name) workspaceNameToId.set(ws.name, ws._id);
    }
    logger.debug(`Restore resolver: cached ${workspaceNameToId.size} workspaces from target`);
  } catch (error) {
    logger.warning(`Could not fetch workspaces from target: ${error.message}`);
  }

  async function resolveUser(username) {
    if (usernameToId.has(username)) return usernameToId.get(username);

    // Look up in target env
    try {
      const matches = await sdk.users.getList({ username, exact: true });
      if (matches && matches.length > 0) {
        usernameToId.set(username, matches[0]._id);
        return matches[0]._id;
      }
    } catch (error) {
      logger.debug(`User lookup failed for "${username}": ${error.message}`);
    }

    // Create from local dump data
    const localUser = localUsers.find(u => u.username === username);
    if (localUser) {
      try {
        const { _id, created, updated, fullName, __v, ...createData } = localUser;
        const created_user = await sdk.users.create(createData);
        usernameToId.set(username, created_user._id);
        logger.step(`Created user "${username}" in target environment`);
        return created_user._id;
      } catch (error) {
        logger.error(`Failed to create user "${username}": ${error.message}`);
      }
    }

    logger.warning(`Could not resolve user "${username}" — keeping as-is`);
    return username;
  }

  async function resolveWorkspace(workspaceName) {
    if (workspaceNameToId.has(workspaceName)) return workspaceNameToId.get(workspaceName);

    // Create from local dump data
    const localWs = localWorkspaces.find(w => w.name === workspaceName);
    if (localWs) {
      try {
        const { _id, created, updated, __v, members, invites, ...createData } = localWs;
        const createdWs = await sdk.workspaces.create(createData);
        workspaceNameToId.set(workspaceName, createdWs._id);
        logger.step(`Created workspace "${workspaceName}" in target environment`);
        return createdWs._id;
      } catch (error) {
        logger.error(`Failed to create workspace "${workspaceName}": ${error.message}`);
      }
    }

    logger.warning(`Could not resolve workspace "${workspaceName}" — keeping as-is`);
    return workspaceName;
  }

  return async (entity) => {
    const resolved = { ...entity };

    if (resolved.user && !isObjectId(resolved.user)) {
      resolved.user = await resolveUser(resolved.user);
    }
    if (resolved.workspace && !isObjectId(resolved.workspace)) {
      resolved.workspace = await resolveWorkspace(resolved.workspace);
    }

    return resolved;
  };
}
