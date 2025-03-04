import FixedPointVector from "../lib/fixedpointvector.js";

export default class Triangle {
  constructor(vertexIndices, screenBuffer, screenSize) {
    this.buffer = screenBuffer;

    this.va = vertexIndices[0];
    this.vb = vertexIndices[1];
    this.vc = vertexIndices[2];

    // TODO the buffers should be shared across all triangles
    this.screenSize = screenSize;
    this.startBuffer = new Uint32Array(screenSize[1]);
    this.endBuffer = new Uint32Array(screenSize[1]);
  }

  scan(start, end, buffer) {
    let dx = end[0] - start[0];
    const dy = end[1] - start[1];

    // amount to step the x coordinate per iteration
    // the value is 1.0, in fixed point coordinates
    let pixel_step = FixedPointVector.ONE;

    // put the end coordinate directly into the buffer
    // this makes the loops below simpler
    buffer[end[1] >> FixedPointVector.SHIFT] = end[0];

    const start_x_fractional = start[0] & 15;
    const start_y_fractional = start[1] & 15;

    const dx_dy = dx / dy;

    // use absolute value for dx to simplify the loops
    // the signs of other variables must match
    // so flip their signs as well if needed
    if (dx < 0) {
      dx = -dx;
      pixel_step = -pixel_step;
    }

    // dy will always be positive, and since we have modified dx to be positive,
    // we can compare the two directly (no need to do abs(dy) > abs(dx))
    if (dy > dx) {
      // y is the major axis, so run the loop for each y

      // get the fractional x coordinate where the edge intersects
      // the horizontal line through the pixel center
      const x_intersect =
        start_x_fractional -
        Math.round((start_y_fractional - FixedPointVector.HALF) * dx_dy);

      // convert the fractional x coordinate into an error distance,
      // ie the horizontal offset from the ideal starting point (the pixel center)
      const x_offset = x_intersect - FixedPointVector.HALF;

      // convert the error distance into a numerator value,
      // by multiplying by dy and rounding off
      let numerator =
        (dy * x_offset + FixedPointVector.HALF) >> FixedPointVector.SHIFT;

      // if the edge goes down and to the left, reverse the offset direction
      // since a location to the left of zero would then be a positive offset
      if (pixel_step < 0) numerator = -numerator;

      // the initial numerator value now compensates for the fact that
      // the y coordinate for the true starting point of the edge
      // is not in the pixel center.
      // put differently, we start the y loop at the top vertical pixel center,
      // and step downwards one whole pixel per line, and our modified numerator
      // does the needed compensation so the end result is still correct.

      // set up loop variables, truncate start and end y coordinates
      // so we get the right iteration count
      let x = start[0];
      let y = start[1] >> FixedPointVector.SHIFT;
      let end_y = end[1] >> FixedPointVector.SHIFT;

      while (y < end_y) {
        numerator += dx;
        if (numerator > dy) {
          x += pixel_step;
          numerator -= dy;
        }
        buffer[y] = x;
        y++;
      }
    } else {
      // x is the major axis, so run the loop for each x

      // get the fractional y coordinate where the edge intersects
      // the vertical line through the pixel center
      const y_intersect =
        start_y_fractional -
        Math.round((start_x_fractional - FixedPointVector.HALF) / dx_dy);

      // convert the fractional x coordinate into an error distance,
      // ie the vertical offset from the ideal starting point (the pixel center)
      const y_offset = y_intersect - FixedPointVector.HALF;

      // convert the error distance into a numerator value,
      // by multiplying by dx and rounding off
      let numerator =
        (dx * y_offset + FixedPointVector.HALF) >> FixedPointVector.SHIFT;

      // set up loop variables, truncate start and end x coordinates
      // so we get the right iteration count
      let x = (start[0] & ~15) + FixedPointVector.HALF;
      let end_x = (end[0] & ~15) + FixedPointVector.HALF;
      let y = start[1] >> FixedPointVector.SHIFT;

      // by checking for inequality we don't need to check for either "greater than"
      // or "less than" depending whether dx is positive or negative
      // the last pixel (x == end[0]) is already filled
      while (x != end_x) {
        x += pixel_step;
        numerator += dy;
        if (numerator > dx) {
          y++;
          numerator -= dx;
          buffer[y] = x;
        }
      }
    }
  }

  scanEdge(va, vb) {
    // if vertex a is above vertex b then edge a->b is a left edge
    if (va[1] < vb[1]) {
      this.scan(va, vb, this.startBuffer);
    }

    // or, if vertex b is above vertex a then edge b->a is a right edge
    if (va[1] > vb[1]) {
      this.scan(vb, va, this.endBuffer);
    }

    // otherwise, vertex a and b will be a horizontal edge, so do nothing
  }

  // assumes floating point coordinates and ccw vertex order
  draw(coordinates, color) {
    const v = [];

    v[0] = new FixedPointVector(coordinates[this.va]);
    v[1] = new FixedPointVector(coordinates[this.vb]);
    v[2] = new FixedPointVector(coordinates[this.vc]);

    const ab = [v[1][0] - v[0][0], v[1][1] - v[0][1]];
    const ac = [v[2][0] - v[0][0], v[2][1] - v[0][1]];

    // backface culling
    if (ab[1] * ac[0] - ab[0] * ac[1] <= 0) {
      return;
    }

    this.scanEdge(v[0], v[1]);
    this.scanEdge(v[1], v[2]);
    this.scanEdge(v[2], v[0]);

    let ymin = Math.min(v[0][1], v[1][1], v[2][1]) >> FixedPointVector.SHIFT;
    let ymax = Math.max(v[0][1], v[1][1], v[2][1]) >> FixedPointVector.SHIFT;

    // initial offset: point to x=0, y=ymin
    let screenOffset = ymin * this.screenSize[0];

    // bake final color as int32 RGBA value (little-endian)
    let finalColor = 255 << 24;
    finalColor += color[2] << 16;
    finalColor += color[1] << 8;
    finalColor += color[0];

    // we start at ymin+1 due to "top left" rasterization rule
    let y = ymin + 1;
    while (y <= ymax) {
      // we start at xmin+1 due to "top left" rasterization rule
      let x = (this.startBuffer[y] >> FixedPointVector.SHIFT) + 1;
      let endx = this.endBuffer[y] >> FixedPointVector.SHIFT;

      while (x <= endx) {
        this.buffer[screenOffset + x] = finalColor;
        x++;
      }
      y++;

      // point to x=0 on the next line
      screenOffset += this.screenSize[0];
    }
  }
}
