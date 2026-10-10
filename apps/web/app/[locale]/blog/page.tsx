import { BlogPage, generateBlogMetadata } from '@/views/blog'

// Statik (ISR): filtr/qidiruv brauzerda; teg posts orqali yangilanadi
export const revalidate = 3600
export const generateMetadata = generateBlogMetadata
export default BlogPage
