const X_OFFSET = 0;
const Y_OFFSET = 4;
const Z_OFFSET = 8;

class Matrix extends Float32Array {
  constructor(m) {
    super(16);
    if (arguments.length === 1) {
      this.set(m);
    } else {
      this[0] = 1.0;
      this[5] = 1.0;
      this[10] = 1.0;
      this[15] = 1.0;
    }
  }

  swap(a, b) {
     var tmp = this[a]; this[a] = this[b]; this[b] = tmp;
  }

  invertCamera() {
    this.swap(1, 4);
    this.swap(2, 8);
    this.swap(3, 12);
    this.swap(6, 9);
    this[12] *= -1.0;
    this[13] *= -1.0;
    this[14] *= -1.0;
  }

  setPosition(x, y, z) {
    this[12] = x;
    this[13] = y;
    this[14] = z;
  }

  moveForward(dist) {
    this[12] += this[4] * dist;
    this[13] += this[5] * dist;
    this[14] += this[6] * dist;
  }

  rotate(rx, ry, rz) {
    var x = new Vector(this, X_OFFSET);
    var y = new Vector(this, Y_OFFSET);
    var z = new Vector(this, Z_OFFSET);

    if (rx != 0.0) {
      y.rotate(z, x, rx);
    }

    if (ry != 0.0) {
      z.rotate(x, y, ry);
    }

    if (rz != 0.0) {
      x.rotate(y, z, rz);
    }

    this.setVector(x, X_OFFSET);
    this.setVector(y, Y_OFFSET);
    this.setVector(z, Z_OFFSET);
  }

  setVector(v, offset) {
    this[offset++] = v[0];
    this[offset++] = v[1];
    this[offset] = v[2];
  }

  setProjection(fovy, aspect, near, far) {
     var f = 1.0 / Math.tan(fovy / 2), nf = 1 / (near - far);
     this[0] = f / aspect;
     this[5] = f;
     this[10] = (far + near) * nf;
     this[11] = -1;
     this[14] = (2 * far * near) * nf;
     this[15] = 0;
  }
}

class Vector extends Float32Array {
  constructor(x, y, z) {
    super(3);
    if (arguments.length === 3) {
      this[0] = x;
      this[1] = y;
      this[2] = z;
    }
    if (arguments.length === 2) {
      // x is a matrix, y is start index
      this[0] = x[y++];
      this[1] = x[y++];
      this[2] = x[y];
    }

  }

  rotate(to, perp, angle) {
     this.scale(Math.cos(angle));
     to.scale(Math.sin(angle));
     this.add(to);
     this.normalize();
     to.cross(perp, this);
  }

  cross(a, b) {
     this[0] = a[1] * b[2] - a[2] * b[1];
     this[1] = a[2] * b[0] - a[0] * b[2];
     this[2] = a[0] * b[1] - a[1] * b[0];
  }

  add(v) {
     this[0] += v[0];
     this[1] += v[1];
     this[2] += v[2];
  }

  scale(s) {
     this[0] *= s;
     this[1] *= s;
     this[2] *= s;
  }

  normalize() {
     let len = Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
     this.scale(1.0/len);
  }
}
