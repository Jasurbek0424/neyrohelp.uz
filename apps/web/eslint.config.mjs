import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * FSD qoidalari:
 * 1) Qatlam faqat o‘zidan PASTDAGI qatlamlarni import qiladi: app > views > widgets > features > entities > shared
 * 2) entities/features/widgets/views slice'lariga faqat public API (index.ts) orqali: `@/entities/doctor`, `@/entities/doctor/ui/...` emas
 * 3) shared segmentlari fayl bo‘yicha import qilinadi: `@/shared/ui/Button`
 */
const layers = ['app', 'views', 'widgets', 'features', 'entities', 'shared']
const sliced = ['views', 'widgets', 'features', 'entities']

const fsdRules = layers.map((layer, i) => ({
  files: [`src/${layer}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          ...layers.slice(0, i).map((upper) => ({
            group: [`@/${upper}`, `@/${upper}/**`],
            message: `FSD: «${layer}» qatlami yuqoridagi «${upper}» qatlamini import qila olmaydi`,
          })),
          ...sliced.map((l) => ({
            group: [`@/${l}/*/**`],
            message: `FSD: «${l}» slice'iga faqat index.ts orqali murojaat qiling`,
          })),
        ],
      },
    ],
  },
}))

// Next routing qatlami (apps/web/app) ham faqat public API'lardan foydalanadi
const routingRule = {
  files: ['app/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: sliced.map((l) => ({ group: [`@/${l}/*/**`], message: `FSD: «${l}» slice'iga faqat index.ts orqali` })) },
    ],
  },
}

export default [
  ...nextVitals,
  ...nextTs,
  ...fsdRules,
  routingRule,
  { ignores: ['.next/**', 'node_modules/**', 'src/shared/api/schema.d.ts', 'next-env.d.ts'] },
]
