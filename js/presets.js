// Examples taken from
// - "The Algorithmic Beauty of Plants" by Przemyslaw Prusinkiewicz and Aristid Lindenmayer
//   https://algorithmicbotany.org/papers/#abop
// - Wikipedia
const L_SYSTEM_PRESETS = {
  hilbert: {
    name: "Hilbert Curve",
    src: "https://en.wikipedia.org/wiki/Hilbert_curve#Representation_as_Lindenmayer_system",
    axiom: "A",
    rules: "A=+BF-AFA-FB+\nB=-AF+BFB+FA-",
    iterations: 4,
    angle: 90
  },
  koch_snowflake: {
    name: "Koch Snowflake",
    src: "https://en.wikipedia.org/wiki/Koch_snowflake#Representation_as_Lindenmayer_system",
    axiom: "F--F--F",
    rules: "F=F+F--F+F",
    iterations: 4,
    angle: 60
  },
  koch: {
    name: "Koch Curve",
    src: "https://en.wikipedia.org/wiki/Koch_snowflake#Representation_as_Lindenmayer_system",
    // Adjusted from above to line up horizontally.
    axiom: "---F",
    rules: "F=F++F----F++F",
    iterations: 4,
    angle: 30
  },
  sierpinski: {
    name: "Sierpinski Triangle",
    src: "https://en.wikipedia.org/wiki/L-system#Example_5:_Sierpinski_triangle",
    axiom: "F1-F2-F2",
    rules: "F1=F1-F2+F1+F2-F1\nF2=F2F2",
    iterations: 5,
    angle: 120
  },
  sierpinski_2: {
    name: "Sierpinski Triangle 2",
    src: "ABOP Figure 1.10b",
    axiom: "F2",
    rules: "F1=F2+F1+F2\nF2=F1-F2-F1",
    iterations: 6,
    angle: 60
  },
  dragon: {
    name: "Dragon Curve",
    src: "ABOP Figure 1.10b",
    axiom: "F1",
    rules: "F1=F1+F2+\nF2=-F1-F2",
    iterations: 10,
    angle: 90
  },
  bush: {
    name: "Bush",
    src: "ABOP Figure 1.24c",
    axiom: "F",
    rules: "F=FF-[-F+F+F]+[+F-F-F]",
    iterations: 5,
    angle: 22.5
  },
  plant: {
    name: "Plant",
    src: "https://en.wikipedia.org/wiki/L-system#Example_7:_fractal_plant",
    axiom: "-X",
    rules: "X=F+[[X]-X]-F[-FX]+X\nF=FF",
    iterations: 6,
    angle: 25
  },
  islands_and_lakes: {
    name: "Islands and Lakes",
    src: "ABOP Figure 1.8",
    axiom: "F+F+F+F",
    rules: "F=F+f-FF+F+FF+Ff+FF-f+FF-F-FF-Ff-FFF\nf=ffffff",
    iterations: 3,
    angle: 90
  },
  crystal: {
    name: "Crystal",
    src: "ABOP Figure 1.9d",
    axiom: "F-F-F-F",
    rules: "F=FF-F--F-F",
    iterations: 6,
    angle: 90
  },
  bracelet: {
    name: "Bracelet",
    src: "ABOP Figure 1.9a",
    axiom: "F-F-F-F",
    rules: "F=FF-F-F-F-F-F+F",
    iterations: 5,
    angle: 90
  },
  gosper: {
    name: "Gosper Curve",
    src: "ABOP Figure 1.11a",
    axiom: "F1",
    rules: "F1=F1+F2++F2-F1--F1F1-F2+\nF2=-F1+F2F2++F2+F1--F1-F2",
    iterations: 4,
    angle: 60
  }
};