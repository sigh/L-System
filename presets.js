const LSystemPresets = {
  hilbert: {
    name: "Hilbert Curve",
    axiom: "A",
    rules: "A=-BF+AFA+FB-\nB=+AF-BFB-FA+",
    iterations: 4,
    angle: 90,
    length: 10
  },
  koch: {
    name: "Koch Snowflake",
    axiom: "F++F++F",
    rules: "F=F-F++F-F",
    iterations: 4,
    angle: 60,
    length: 4
  },
  sierpinski: {
    name: "Sierpinski Triangle",
    axiom: "F",
    rules: "F=F+F-F-F+F",
    iterations: 5,
    angle: 120,
    length: 10
  },
  dragon: {
    name: "Dragon Curve",
    axiom: "FX",
    rules: "X=X+YF+\nY=-FX-Y",
    iterations: 10,
    angle: 90,
    length: 5
  },
  plant: {
    name: "Plant",
    axiom: "F",
    rules: "F=FF+[+F-F-F]-[-F+F+F]",
    iterations: 5,
    angle: 22.5,
    length: 4
  }
};