// Sprite 1254×1254 — grille 3 colonnes × 2 lignes
// Chaque cellule : 418×627px
// Badge centré en haut de chaque cellule (~200px depuis le top de la cellule)
// Scale 0.125 → sprite affiché en 157×157px, cellule = 52×78px, badge_y_in_cell ≈ 25px
// Offset = -(badge_center_x - container_half), -(badge_center_y - container_half)

export const GRADE_SPRITE_SIZE = 157   // px (sprite rendu carré, ratio 1:1 préservé)
export const GRADE_ICON_SIZE   = 50    // px (container)

type GradeConfig = {
  bgPos: string
  color: string
  label: string
}

export const GRADE_CONFIG: Record<string, GradeConfig> = {
  D:  { bgPos: '-1px   0px',   color: '#dddddd', label: 'D'  },
  C:  { bgPos: '-53px  0px',   color: '#57ff6e', label: 'C'  },
  B:  { bgPos: '-105px 0px',   color: '#4da6ff', label: 'B'  },
  A:  { bgPos: '-1px  -78px',  color: '#b94dff', label: 'A'  },
  S:  { bgPos: '-53px -78px',  color: '#ffaa00', label: 'S'  },
  SS: { bgPos: '-105px -78px', color: '#ff2222', label: 'SS' },
}
