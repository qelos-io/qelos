import { callPublicNoCodeService } from "./no-code-service";

export function createBlueprintEntityForUser(tenant: string, user: string, blueprintIdentifier: string, payload: any, bypassAdmin?: boolean) {
  return callPublicNoCodeService(`/api/blueprints/${blueprintIdentifier}/entities`, {tenant, user, bypassAdmin}, {data: payload, method: 'POST'});
}

export function updateBlueprintEntityForUser(tenant: string, user: string, blueprintIdentifier: string, payload: any, bypassAdmin?: boolean) {
  return callPublicNoCodeService(`/api/blueprints/${blueprintIdentifier}/entities/${payload.identifier}`, {tenant, user, bypassAdmin}, {data: payload, method: 'PUT'});
}

export function deleteBlueprintEntityForUser(tenant: string, user: string, blueprintIdentifier: string, entityId: string, bypassAdmin?: boolean) {
    return callPublicNoCodeService(`/api/blueprints/${blueprintIdentifier}/entities/${entityId}`, {tenant, user, bypassAdmin}, {method: 'DELETE'});
}

export function getBlueprintEntityForUser(tenant: string, user: string, blueprintIdentifier: string, entityId: string, bypassAdmin?: boolean) {
    return callPublicNoCodeService(`/api/blueprints/${blueprintIdentifier}/entities/${entityId}`, {tenant, user, bypassAdmin}, {method: 'GET'});
}

export function getBlueprintEntitiesForUser(tenant: string, user: string, blueprintIdentifier: string, query: any, bypassAdmin?: boolean) {
    const queryString = Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&');
    return callPublicNoCodeService(`/api/blueprints/${blueprintIdentifier}/entities?${queryString}`, {tenant, user, bypassAdmin}, {method: 'GET'});
}
