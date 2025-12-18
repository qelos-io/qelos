import axios, { AxiosHeaders, AxiosResponse } from 'axios'
import { isImpersonating, impersonatedUser, impersonatedWorkspace } from '@/modules/core/store/impersonation'

// @ts-ignore
const RUN_AS_SUBDOMAIN = !!import.meta.env.VITE_RUN_AS_SUBDOMAIN

const baseURL = RUN_AS_SUBDOMAIN ?
  (location.protocol + '//www' + location.hostname.substr(location.hostname.indexOf('.'))) :
  location.origin

export const api = axios.create({ baseURL, withCredentials: location.protocol === 'https:' })

// Add request interceptor for impersonation headers
api.interceptors.request.use((config) => {
  if (isImpersonating.value) {
    config.headers = config.headers || {} as AxiosHeaders;
    if (impersonatedUser.value) {
      (config.headers as any)['x-impersonate-user'] = impersonatedUser.value._id;
    }
    if (impersonatedWorkspace.value) {
      (config.headers as any)['x-impersonate-workspace'] = impersonatedWorkspace.value._id;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error)
})

export const getCallData = (res: AxiosResponse) => {
  return res?.status >= 300 ? Promise.reject(new Error('failed to call url')) : res?.data
}
