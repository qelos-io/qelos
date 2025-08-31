import { callPublicNoCodeService } from "./no-code-service";

export function createBlueprintEntityForUser(tenant: string, user: string, blueprintIdentifier: string, payload: any) {
  return callPublicNoCodeService(`/api/blueprints/${blueprintIdentifier}/entities`, {tenant, user}, {data: payload, method: 'POST'});
}

export function updateBlueprintEntityForUser(tenant: string, user: string, blueprintIdentifier: string, payload: any) {
  return callPublicNoCodeService(`/api/blueprints/${blueprintIdentifier}/entities/${payload.identifier}`, {tenant, user}, {data: payload, method: 'PUT'});
}

export function deleteBlueprintEntityForUser(tenant: string, user: string, blueprintIdentifier: string, entityId: string) {
    return callPublicNoCodeService(`/api/blueprints/${blueprintIdentifier}/entities/${entityId}`, {tenant, user}, {method: 'DELETE'}); 
}

export function getBlueprintEntityForUser(tenant: string, user: string, blueprintIdentifier: string, entityId: string) {
    return callPublicNoCodeService(`/api/blueprints/${blueprintIdentifier}/entities/${entityId}`, {tenant, user}, {method: 'GET'});
}

export function getBlueprintEntitiesForUser(tenant: string, user: string, blueprintIdentifier: string, query: any) {
    const queryString = Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&');
    return callPublicNoCodeService(`/api/blueprints/${blueprintIdentifier}/entities?${queryString}`, {tenant, user}, {method: 'GET'});
}