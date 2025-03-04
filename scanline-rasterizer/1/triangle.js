export default class Triangle {
  constructor(vertexIndices, imageData) {
    this.imageData = imageData;

    this.va = vertexIndices[0];
    this.vb = vertexIndices[1];
    this.vc = vertexIndices[2];

    // TODO the buffers should be shared across all triangles
    this.startBuffer = new Uint16Array(this.imageData.height);
    this.endBuffer = new Uint16Array(this.imageData.height);
  }

  scan(start, end, buffer) {
    let x = start[0];
    const dx = (end[0] - start[0]) / (end[1] - start[1]);
    for (let y = start[1]; y <= end[1]; y++) {
      buffer[y] = Math.round(x);
      x += dx;
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

  // assume integer coordinates and ccw vertex order
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
    let imageDataOffset = (ymin * this.imageData.width) << 2;

    let y = ymin;
    while (y <= ymax) {
      let x = this.startBuffer[y];
      let endx = this.endBuffer[y];
      let i = imageDataOffset + (x << 2);

      while (x <= endx) {
        this.imageData.data[i++] = color[0];
        this.imageData.data[i++] = color[1];
        this.imageData.data[i++] = color[2];
        this.imageData.data[i++] = 255;
        x++;
      }
      y++;

      // point to x=0 on the next line
      imageDataOffset += this.imageData.width << 2;
    }
  }
}
