import type { Schemas } from '@/shared/api/server'

export type DoctorCardData = Schemas['DoctorCardOut']
export type Doctor = Schemas['DoctorOut']
export type Specialty = Schemas['SpecialtyOut']
export type TimelineRow = Schemas['TimelineRow']
export type Audience = DoctorCardData['audience']
