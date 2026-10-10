import { generateHomeMetadata, HomePage } from '@/views/home'

export const revalidate = 3600
export const generateMetadata = generateHomeMetadata
export default HomePage
