import type { components, operations } from '@/shared/api/schema'

/** Tiplar OpenAPI'dan (backend: LeadRow, LeadDetail, LeadPage, DashboardOut) */
type S = components['schemas']

export type LeadStatus = S['LeadStatus']
export type LeadRow = S['LeadRow']
export type TgDelivery = LeadRow['tg_delivery']
export type LeadEvent = S['LeadEventOut']
export type LeadEventKind = 'created' | 'telegram_sent' | 'telegram_failed' | 'taken' | 'status' | 'note' | 'duplicate'
export type LeadDetail = S['LeadDetail']
export type LeadCounts = S['LeadCounts']
export type LeadPage = S['LeadPage']
export type LeadPatch = S['LeadPatch']
export type Dashboard = S['DashboardOut']

type LeadQuery = NonNullable<operations['list_leads_api_v1_admin_leads_get']['parameters']['query']>
/** GET /leads query (null o‘rniga undefined — URL'ga tushmaydi) */
export type LeadFilters = { [K in keyof LeadQuery]?: Exclude<LeadQuery[K], null> }
export type LeadExportFilters = Pick<LeadFilters, 'status' | 'date_from' | 'date_to'>
