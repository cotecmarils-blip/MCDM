export function getAlternativaInputClass(isDark) {
  return `w-full px-4 py-2 rounded-lg border transition-colors input-focus ${
    isDark
      ? 'bg-navy-900/50 border-navy-700 text-white placeholder-gray-400'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`;
}

export function getAlternativaLabelClass(isDark) {
  return `block text-sm font-medium mb-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`;
}
