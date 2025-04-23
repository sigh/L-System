const LSystemPresets = {
  hilbert: {
    name: "Hilbert Curve",
    axiom: "A",
    rules: "A=-BF+AFA+FB-\nB=+AF-BFB-FA+",
    iterations: 4,
    angle: 90
  },
  koch_snowflake: {
    name: "Koch Snowflake",
    axiom: "F++F++F",
    rules: "F=F-F++F-F",
    iterations: 4,
    angle: 60
  },
  koch: {
    name: "Koch Curve",
    axiom: "---F",
    rules: "F=F++F----F++F",
    iterations: 4,
    angle: 30
  },
  sierpinski: {
    name: "Sierpinski Triangle",
    axiom: "F",
    rules: "F=F+F-F-F+F",
    iterations: 5,
    angle: 120
  },
  dragon: {
    name: "Dragon Curve",
    axiom: "FX",
    rules: "X=X+YF+\nY=-FX-Y",
    iterations: 10,
    angle: 90
  },
  bush: {
    name: "Bush",
    axiom: "F",
    rules: "F=FF+[+F-F-F]-[-F+F+F]",
    iterations: 5,
    angle: 22.5
  },
  islands_and_lakes: {
    name: "Islands and Lakes",
    axiom: "F+F+F+F",
    rules: "F=F+f-FF+F+FF+Ff+FF-f+FF-F-FF-Ff-FFF;f=ffffff",
    iterations: 3,
    angle: 90
  },
  crystal: {
    name: "Crystal",
    axiom: "F+F+F+F",
    rules: "F=FF+F++F+F",
    iterations: 6,
    angle: 90
  }
};