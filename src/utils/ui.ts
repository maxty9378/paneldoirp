// Единая система кнопок для консистентного дизайна
export const btn = `
  inline-flex items-center justify-center gap-2
  h-10 rounded-lg px-3 text-sm font-medium
  transition-all select-none
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:opacity-50 disabled:pointer-events-none
`;

export const variants = {
  primary: `${btn} bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500`,
  neutral: `${btn} bg-gray-600 text-white hover:bg-gray-700 focus-visible:ring-gray-500`,
  subtle:  `${btn} border border-black/5 hover:shadow-sm`,
  wa:      `${btn} bg-[#25D3661A] text-[#25D366] border border-black/5 hover:bg-[#25D36633]`,
  tg:      `${btn} bg-[#26A5E41A] text-[#26A5E4] border border-black/5 hover:bg-[#26A5E433]`,
  icon:    `inline-flex items-center justify-center w-10 h-10 rounded-lg border border-black/5 hover:bg-black/[0.04]`,
};

// Статусы событий
export const statusBadge = {
  planned:   'bg-gray-100 text-gray-700',
  completed: 'bg-emerald-100 text-emerald-700',
  canceled:  'bg-red-100 text-red-700',
};

// Типографика
export const typography = {
  heading: 'text-lg md:text-xl font-semibold leading-tight',
  subheading: 'text-sm text-gray-500',
  body: 'text-sm text-gray-700',
  caption: 'text-xs text-gray-500',
};

// Вертикальный ритм
export const spacing = {
  section: 'space-y-3 md:space-y-4',
  card: 'p-3 sm:p-4 lg:p-6',
};
