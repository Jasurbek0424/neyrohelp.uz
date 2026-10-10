import type { Locale } from '@/shared/i18n/config'

type Copy = { lead: string; phoneLead: string; asOf: string; sections: { title: string; text: string }[] }

export const privacyCopy: Record<Locale, Copy> = {
  uz: {
    lead: 'Ariza qoldirganingizda qanday ma’lumotlar yig‘ilishi va ular bilan nima qilinishi haqida.',
    phoneLead: 'Ma’lumotlaringizni o‘chirish uchun telefon orqali murojaat qiling:',
    asOf: '2026-yil 29-sentyabr holatiga',
    sections: [
      { title: 'Qanday ma’lumotlar yig‘iladi', text: 'Ariza shaklida siz ismingizni, telefon raqamingizni va shikoyatingizni (ixtiyoriy tavsif) yozasiz. Boshqa ma’lumot so‘ralmaydi.' },
      { title: 'Nima uchun kerak', text: 'Ma’lumotlar faqat qabulga yozish maqsadida siz bilan bog‘lanish uchun ishlatiladi. Reklama yoki boshqa maqsadlarda foydalanilmaydi.' },
      { title: 'Kimga ko‘rinadi', text: 'Arizani faqat klinika administratorlari ko‘radi. Ma’lumotlar uchinchi shaxslarga berilmaydi va sotilmaydi.' },
      { title: 'Saqlash muddati', text: 'Ma’lumotlar belgilangan muddat davomida saqlanadi va shundan keyin avtomatik o‘chiriladi.' },
      { title: 'Ma’lumotlarni o‘chirish', text: 'Istalgan vaqtda ma’lumotlaringizni o‘chirishni so‘rashingiz mumkin. Buning uchun klinikaga telefon orqali murojaat qiling.' },
      { title: 'Qonunga muvofiqlik', text: 'Ma’lumotlarni qayta ishlash O‘zbekiston Respublikasining «Shaxsga doir ma’lumotlar to‘g‘risida»gi Qonuniga muvofiq amalga oshiriladi.' },
    ],
  },
  ru: {
    lead: 'Какие данные мы собираем, когда вы оставляете заявку, и что с ними происходит.',
    phoneLead: 'Чтобы удалить ваши данные, позвоните нам:',
    asOf: 'По состоянию на 29 сентября 2026 года',
    sections: [
      { title: 'Какие данные собираются', text: 'В форме заявки вы указываете имя, номер телефона и жалобу (необязательное описание). Другие данные не запрашиваются.' },
      { title: 'Зачем это нужно', text: 'Данные используются только для связи с вами с целью записи на приём. Мы не используем их для рекламы или других целей.' },
      { title: 'Кому доступны данные', text: 'Заявку видят только администраторы клиники. Данные не передаются третьим лицам и не продаются.' },
      { title: 'Срок хранения', text: 'Данные хранятся в течение установленного срока, после чего автоматически удаляются.' },
      { title: 'Удаление данных', text: 'Вы можете в любой момент попросить удалить ваши данные. Для этого позвоните в клинику.' },
      { title: 'Соответствие закону', text: 'Обработка данных осуществляется в соответствии с Законом Республики Узбекистан «О персональных данных».' },
    ],
  },
  en: {
    lead: 'What data we collect when you submit a request and what happens to it.',
    phoneLead: 'To have your data deleted, call us:',
    asOf: 'As of 29 September 2026',
    sections: [
      { title: 'What data is collected', text: 'In the request form you provide your name, phone number and complaint (an optional description). No other data is requested.' },
      { title: 'Why we need it', text: 'The data is used only to contact you in order to book an appointment. It is not used for advertising or any other purpose.' },
      { title: 'Who can see it', text: 'Only the clinic administrators can see your request. The data is not shared with third parties or sold.' },
      { title: 'Retention', text: 'Data is stored for a set period and then deleted automatically.' },
      { title: 'Deleting your data', text: 'You can ask us to delete your data at any time. To do so, call the clinic.' },
      { title: 'Legal compliance', text: 'Data is processed in accordance with the Law of the Republic of Uzbekistan “On Personal Data”.' },
    ],
  },
}
