class Geometry {

  constructor(num) {
    this.vertices = new Float32Array(3*num);
    this.colors = new Float32Array(4*num);
    this.modelMatrix = new Matrix();
    this.indices = new Uint16Array(num);
  }

  render(camera) {
    this.renderer.render(camera, this.modelMatrix);
  }
}

class Starfield extends Geometry {
  constructor(num) {
    super(num);
    this.primitiveType = gl.POINTS;

    let r = 400;

    // https://www.jasondavies.com/maps/random-points/
    for (let i=0; i<num; i++) {
      let z = s();
      let p = Math.sqrt(1-z*z);
      let a = Math.PI * s();

      this.indices[i] = i;
      this.vertices[3*i+0] = r * p * Math.cos(a);
      this.vertices[3*i+1] = r * p * Math.sin(a);
      this.vertices[3*i+2] = r * z;

      this.colors[4*i+0] = 0.7;
      this.colors[4*i+1] = 0.7;
      this.colors[4*i+2] = 0.7;
      this.colors[4*i+3] = 1.0;
    }

    this.vs = `
      attribute vec3 vertexPosition;
      attribute vec4 vertexColor;

      uniform mat4 modelMatrix;
      uniform mat4 viewMatrix;
      uniform mat4 projectionMatrix;

      varying lowp vec4 vColor;

      void main() {
        gl_PointSize = 3.5;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(vertexPosition, 1.0);
        vColor = vertexColor;
      }
    `;

    // https://www.desultoryquest.com/blog/drawing-anti-aliased-circular-points-using-opengl-slash-webgl/
    this.fs = `
      #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
      #endif

      precision mediump float;

      varying lowp vec4 vColor;

      void main() {
        float alpha = 1.0;
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float r = dot(cxy, cxy);
        #ifdef GL_OES_standard_derivatives
          float delta = fwidth(r);
          alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r);
        #endif

        gl_FragColor = vColor * alpha;
      }
    `;

    this.renderer = new Renderer(this);
  }
}

function s() {
  return 2.0 * Math.random() - 1.0;
}
