# L-System Visualizer

An interactive web application for visualizing L-Systems (Lindenmayer Systems).

[L-systems](https://en.wikipedia.org/wiki/L-system) are parallel rewriting systems commonly used to generate fractals and other complex geometric patterns. They work by repeatedly applying simple transformation rules to an initial string of symbols, producing intricate self-similar structures.

Try it online at <https://sigh.github.io/L-System/>.

## Using the L-System

L-Systems use two main components to generate patterns:

1. **Axiom** - The initial string of symbols that defines the starting state. For example, "F" could represent drawing a line forward.

2. **Rules** - A set of transformation rules that specify how to replace each symbol during iteration. Rules are written in the format `Symbol=Replacement`. For example:
   - `F=F+F-F-F+F` means replace each F with the pattern "F+F-F-F+F"
   - Multiple rules can be specified using newlines:

     ```
     F=FF+[+F-F-F]-[-F+F+F]
     X=F[-X][X]F[-X]+FX
     ```

### Symbol format

Symbols are formatted as follows:

- A non-digit character followed by any number of digits
- Whitespace is ignored
- Examples:
  - `F` - a basic symbol
  - `F1` - a numbered variant
  - `G42` - a variant with multiple digits

The first character of the symbol are renderer instructions for these characters:

- `F` - Move forward while drawing a line
- `f` - Move forward without drawing a line
- `+` - Turn right by the specified angle
- `-` - Turn left by the specified angle
- `[` - Save the current position and angle
- `]` - Restore the last saved position and angle

The system applies these rules repeatedly for the specified number of iterations, creating increasingly complex geometric patterns.

## Running Locally

Serve the files using a local web server. For example, using Python 3:

   ```bash
   python -m http.server 8000
   ```
