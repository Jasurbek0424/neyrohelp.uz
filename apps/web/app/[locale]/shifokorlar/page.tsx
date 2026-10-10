import { DoctorsPage, generateDoctorsMetadata } from '@/views/doctors'

export const revalidate = 3600
export const generateMetadata = generateDoctorsMetadata
export default DoctorsPage
