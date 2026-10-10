import type { components } from '@/shared/api/schema'

/** Tiplar OpenAPI'dan (backend: ServiceCategoryOut, AdminService, ServiceIn/ServicePatch, BulkIn). Alohida GET /service-categories yo‘q — GET /services daraxt */
type S = components['schemas']

export type Completeness = S['Completeness']
export type Service = S['AdminService']
export type ServiceCategory = S['ServiceCategoryOut']
export type ServiceInput = S['ServiceIn']
export type ServicePatch = S['ServicePatch']
export type BulkItem = S['BulkItem']
