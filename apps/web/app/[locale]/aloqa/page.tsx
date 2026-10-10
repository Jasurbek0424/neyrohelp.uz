import { ContactsPage, generateContactsMetadata } from '@/views/contacts'

export const revalidate = 3600
export const generateMetadata = generateContactsMetadata
export default ContactsPage
