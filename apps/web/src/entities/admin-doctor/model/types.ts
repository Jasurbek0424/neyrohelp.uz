import type { components } from '@/shared/api/schema'

/** Tiplar OpenAPI'dan (backend: DoctorListItem, DoctorAdmin, DoctorIn/DoctorPatch, AdminSpecialty) */
type S = components['schemas']

export type Audience = S['Audience']
export type WorkDay = NonNullable<S['DoctorIn']['work_days']>[number]
export type Completeness = S['Completeness']
export type Specialty = S['AdminSpecialty']
export type DoctorListItem = S['DoctorListItem']
export type Timeline = S['TimelineOut']
export type Certificate = S['CertificateOut']
export type DoctorAdmin = S['DoctorAdmin']
/** POST /doctors (DoctorIn); PATCH — DoctorPatch (qisman) */
export type DoctorInput = S['DoctorIn']
export type DoctorPatch = S['DoctorPatch']

export const audienceLabels: Record<Audience, string> = { adults: 'Kattalar', children: 'Bolalar', all: 'Ikkalasi' }
export const audienceLong: Record<Audience, string> = { adults: 'Kattalar', children: 'Bolalar', all: 'Kattalar va bolalar' }

export const workDays: { value: WorkDay; short: string; full: string }[] = [
  { value: 'mon', short: 'Du', full: 'Dushanba' },
  { value: 'tue', short: 'Se', full: 'Seshanba' },
  { value: 'wed', short: 'Cho', full: 'Chorshanba' },
  { value: 'thu', short: 'Pa', full: 'Payshanba' },
  { value: 'fri', short: 'Ju', full: 'Juma' },
  { value: 'sat', short: 'Sha', full: 'Shanba' },
  { value: 'sun', short: 'Ya', full: 'Yakshanba' },
]

export const isWorkDay = (v: string): v is WorkDay => workDays.some((d) => d.value === v)
