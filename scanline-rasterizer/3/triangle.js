export default class Triangle {
  constructor(vertexIndices, screenBuffer, screenSize) {
    this.buffer = screenBuffer;

    this.va = vertexIndices[0];
    this.vb = vertexIndices[1];
    this.vc = vertexIndices[2];

    // TODO the buffers should be shared across all triangles
    this.screenSize = screenSize;
    this.startBuffer = new Uint16Array(screenSize[1]);
    this.endBuffer = new Uint16Array(screenSize[1]);
  }

  scan(start, end, buffer) {
    let dx = end[0] - start[0];
    const dy = end[1] - start[1];

    let signdx = 1;

    if (dx < 0) {
      signdx = -1;
      dx = -dx;
    }

    // put the endpoint coordinates directly into the buffer
    // this makes the loops below simpler
    buffer[start[1]] = start[0];
    buffer[end[1]] = end[0];

    let x = start[0];
    let y = start[1];

    let nominator = 0;

    if (dy > dx) {
      // y is the major axis, so run the loop for each y
      // the last pixel (y == end[1]) is already filled
      while (y < end[1]) {
        nominator += dx;
        if (nominator > dy) {
          x += signdx;
          nominator -= dy;
        }
        buffer[y] = x;
        y++;
      }
    } else {
      // x is the major axis, so run the loop for each x
      // by checking for inequality we don't need to check for either "greater than"
      // or "less than" depending whether dx is positive or negative
      // the last pixel (x == end[0]) is already filled
      while (x != end[0]) {
        x += signdx;
        nominator += dy;
        if (nominator > dx) {
          y++;
          nominator -= dx;
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

  // assumes integer coordinates and ccw vertex order
  draw(coordinates, color) {
    const v = [];
    v[0] = [coordinates[this.va][0], coordinates[this.va][1]];
    v[1] = [coordinates[this.vb][0], coordinates[this.vb][1]];
    v[2] = [coordinates[this.vc][0], coordinates[this.vc][1]];

    const ab = [v[1][0] - v[0][0], v[1][1] - v[0][1]];
    const ac = [v[2][0] - v[0][0], v[2][1] - v[0][1]];

    // backface culling
    if (ab[1] * ac[0] - ab[0] * ac[1] <= 0) {
      return;
    }

    this.scanEdge(v[0], v[1]);
    this.scanEdge(v[1], v[2]);
    this.scanEdge(v[2], v[0]);

    const ymin = Math.min(v[0][1], v[1][1], v[2][1]);
    const ymax = Math.max(v[0][1], v[1][1], v[2][1]);

    // initial offset: point to x=0, y=ymin
    let screenOffset = ymin * this.screenSize[0];

    // bake the pixel color as a int32 RGBA value (little-endian)
    let finalColor = color[0];
    finalColor |= color[1] << 8;
    finalColor |= color[2] << 16;
    finalColor |= 255 << 24;

    // we start at ymin+1 due to "top left" rasterization rule
    let y = ymin + 1;
    while (y <= ymax) {
      // we start at xmin+1 due to "top left" rasterization rule
      let x = this.startBuffer[y] + 1;
      let endx = this.endBuffer[y];

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
