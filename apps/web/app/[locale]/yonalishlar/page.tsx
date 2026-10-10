import { generateServicesMetadata, ServicesPage } from '@/views/services'

export const revalidate = 3600
export const generateMetadata = generateServicesMetadata
export default ServicesPage
