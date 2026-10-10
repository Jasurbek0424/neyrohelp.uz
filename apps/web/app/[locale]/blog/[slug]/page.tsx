import { ArticlePage, articleStaticParams, generateArticleMetadata } from '@/views/article'

export const revalidate = 3600
export const dynamicParams = true
export const generateStaticParams = articleStaticParams
export const generateMetadata = generateArticleMetadata
export default ArticlePage
