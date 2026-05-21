export interface Example {
  name: string;
  description: string;
  code: string;
}

export const EXAMPLES: Example[] = [
  {
    name: 'Square',
    description: 'A simple square',
    code: `REPEAT 4 [
  FORWARD 100
  RIGHT 90
]`,
  },
  {
    name: 'Colorful Spiral',
    description: 'Expanding spiral with changing colors',
    code: `TO SPIRAL :STEP :COLOR
  PENCOLOR :COLOR
  FORWARD :STEP
  RIGHT 91
  IF :STEP < 150 [SPIRAL :STEP + 2 :COLOR]
END

PENWIDTH 2
SPIRAL 5 "cyan`,
  },
  {
    name: 'Star',
    description: 'Five-pointed star',
    code: `PENCOLOR "gold
PENWIDTH 3
REPEAT 5 [
  FORWARD 120
  RIGHT 144
]`,
  },
  {
    name: 'Fractal Tree',
    description: 'Recursive binary tree',
    code: `TO TREE :SIZE
  IF :SIZE < 5 [STOP]
  FORWARD :SIZE
  LEFT 30
  TREE :SIZE * 0.7
  RIGHT 60
  TREE :SIZE * 0.7
  LEFT 30
  BACKWARD :SIZE
END

PENCOLOR "lime
PENWIDTH 2
TREE 80`,
  },
  {
    name: 'Hexagon Web',
    description: 'Rotating hexagons',
    code: `TO HEXAGON :SIZE
  REPEAT 6 [
    FORWARD :SIZE
    RIGHT 60
  ]
END

PENWIDTH 1.5
MAKE "I 0
REPEAT 12 [
  PENCOLOR "cyan
  HEXAGON 60
  RIGHT 30
  MAKE "I :I + 1
]`,
  },
];
