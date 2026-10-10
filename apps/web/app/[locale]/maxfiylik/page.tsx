import { generatePrivacyMetadata, PrivacyPage } from '@/views/privacy'

export const revalidate = 3600
export const generateMetadata = generatePrivacyMetadata
export default PrivacyPage
