import { DoctorPage, doctorStaticParams, generateDoctorMetadata } from '@/views/doctor'

export const revalidate = 3600
export const dynamicParams = true
export const generateStaticParams = doctorStaticParams
export const generateMetadata = generateDoctorMetadata
export default DoctorPage
