import * as THREE from "./three.module.js";

export default class ScreenScene {
  constructor(videoElement, renderTarget) {
    const videoTexture = new THREE.VideoTexture(videoElement);

    this.renderTarget = renderTarget;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera();
    this.scene.add(this.camera);

    const screenMaterial = new THREE.ShaderMaterial({
      uniforms: {
        renderTexture: { value: this.renderTarget.texture },
        videoTexture: { value: videoTexture },
      },
      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
      fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D renderTexture;
      uniform sampler2D videoTexture;
      void main() {
        vec4 renderColor = texture2D(renderTexture, vUv);
        vec4 videoColor = texture2D(videoTexture, vUv);
        gl_FragColor = 0.5 * renderColor + 0.5 * videoColor;
      }`,
      depthWrite: false,
    });

    const planeGeometry = new THREE.PlaneBufferGeometry();
    this.plane = new THREE.Mesh(planeGeometry, screenMaterial);
    this.plane.position.z = -100;

    this.scene.add(this.plane);
  }

  updateViewport(width, height) {
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;

    this.camera.updateProjectionMatrix();

    this.plane.scale.set(width, height, 1);
  }
}
