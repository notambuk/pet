import { StyleSheet, Platform } from 'react-native';

export const COLORS = {
  gradientStart: '#667eea',
  gradientEnd: '#764ba2',
  glass: 'rgba(255, 255, 255, 0.12)',
  glassLight: 'rgba(255, 255, 255, 0.20)',
  glassBorder: 'rgba(255, 255, 255, 0.25)',
  glassBorderLight: 'rgba(255, 255, 255, 0.45)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  neonPink: '#ff6b9d',
  neonCyan: '#00d4ff',
  neonGreen: '#00ff88',
  neonPurple: '#c084fc',
  neonOrange: '#ff9f43',
  neonRed: '#ff4757',
  neonBlue: '#818cf8',
  neonYellow: '#fbbf24',
};

export const CATEGORY_META = {
  // Expense categories
  food: { icon: 'fast-food', color: '#ff6b9d', label: 'Хоол' },
  transport: { icon: 'car', color: '#00d4ff', label: 'Тээвэр' },
  shopping: { icon: 'bag-handle', color: '#fbbf24', label: 'Дэлгүүр' },
  fitness: { icon: 'barbell', color: '#00ff88', label: 'Фитнесс' },
  alcohol: { icon: 'wine', color: '#c084fc', label: 'Архи' },
  entertainment: { icon: 'game-controller', color: '#ff9f43', label: 'Зугаа' },
  savings: { icon: 'wallet', color: '#00d4ff', label: 'Хадгаламж' },
  gambling: { icon: 'dice', color: '#ff4757', label: 'Мөрий тоглоом' },
  junk_food: { icon: 'pizza', color: '#ff9f43', label: 'Хог хоол' },
  cigarette: { icon: 'cloud', color: '#94a3b8', label: 'Тамхи' },
  smoking: { icon: 'cloud', color: '#94a3b8', label: 'Тамхи' },
  waste: { icon: 'trash', color: '#a78bfa', label: 'Үрэлгэн' },
  gifts: { icon: 'gift', color: '#ff6b9d', label: 'Бэлэг' },
  health: { icon: 'heart', color: '#ff4757', label: 'Эрүүл мэнд' },
  bills: { icon: 'receipt', color: '#818cf8', label: 'Төлбөр' },
  education: { icon: 'school', color: '#00d4ff', label: 'Боловсрол' },
  gift: { icon: 'gift', color: '#ff6b9d', label: 'Бэлэг' },
  other: { icon: 'ellipsis-horizontal', color: '#94a3b8', label: 'Бусад' },
  // Income categories
  salary: { icon: 'cash', color: '#00ff88', label: 'Цалин' },
  freelance: { icon: 'laptop', color: '#00d4ff', label: 'Фриланс' },
  business: { icon: 'briefcase', color: '#fbbf24', label: 'Бизнес' },
  investment: { icon: 'trending-up', color: '#c084fc', label: 'Хөрөнгө оруулалт' },
  gift_received: { icon: 'gift', color: '#ff6b9d', label: 'Бэлэг авсан' },
  allowance: { icon: 'wallet', color: '#818cf8', label: 'Тэтгэлэг' },
  bonus: { icon: 'trophy', color: '#fbbf24', label: 'Шагнал' },
  refund: { icon: 'arrow-undo', color: '#00d4ff', label: 'Буцаалт' },
  other_income: { icon: 'ellipsis-horizontal', color: '#94a3b8', label: 'Бусад орлого' },
};

export const GLASS = {
  backgroundColor: COLORS.glass,
  borderWidth: 1,
  borderColor: COLORS.glassBorder,
  borderRadius: 24,
  ...Platform.select({
    ios: {
      shadowColor: 'rgba(0, 0, 0, 0.15)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
  }),
};

export const globalStyles = StyleSheet.create({
  container: { flex: 1 },
  glassCard: { ...GLASS, padding: 20, marginBottom: 16 },
});
