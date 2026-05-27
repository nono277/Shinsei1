export const SHOP_GRADE_ORDER = ['Kaigen', 'Raijin', 'Oni', 'Shogun', 'Archon'] as const
export type ShopGrade = typeof SHOP_GRADE_ORDER[number]

export const SHOP_GRADE_CONFIG: Record<ShopGrade, { color: string; bgX: string }> = {
  Kaigen: { color: '#00d4ff', bgX: '0%'   },
  Raijin: { color: '#ffd700', bgX: '25%'  },
  Oni:    { color: '#ff4422', bgX: '50%'  },
  Shogun: { color: '#aa44ff', bgX: '75%'  },
  Archon: { color: '#ffcc44', bgX: '100%' },
}
