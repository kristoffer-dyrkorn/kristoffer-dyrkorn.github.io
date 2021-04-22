import * as THREE from "./three.module.js";

const NEAR_CLIP = 20;
const FAR_CLIP = 36000; // when rendering 9 tiles: TILE_EXTENTS * SQRT(8)

// https://developer.apple.com/library/archive/documentation/DeviceInformation/Reference/iOSDeviceCompatibility/Cameras/Cameras.html#//apple_ref/doc/uid/TP40013599-CH107-SW21
// 1280x720 X_FOV = 60.983 => Y_FOV = 34.30

// empirical value
const Y_FOV_LANDSCAPE = 38;

export default class Renderer {
  constructor(webglElement, videoElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: webglElement,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.autoClear = false;

    // the virtual scene will be rendered into this texture
    this.renderTexture = new THREE.WebGLMultisampleRenderTarget(0, 0, {
      format: THREE.RGBFormat,
    });

    this.virtualScene = new THREE.Scene();

    this.virtualCamera = new THREE.PerspectiveCamera();
    this.virtualCamera.near = NEAR_CLIP;
    this.virtualCamera.far = FAR_CLIP;

    this.virtualScene.add(this.virtualCamera);

    // the current device orientation,
    // ie the orientation the virtual camera is interpolated towards
    this.deviceOrientation = new THREE.Object3D();

    // a pointer showing the north direction
    const pointerGeometry = new THREE.CylinderGeometry(0, 2, 5, 8);
    const pointerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.northPointer = new THREE.Mesh(pointerGeometry, pointerMaterial);
    this.northPointer.rotateX(90 * THREE.MathUtils.DEG2RAD);

    this.virtualScene.add(this.northPointer);

    const ambientLight = new THREE.AmbientLight(0x00ff00);
    this.virtualScene.add(ambientLight);

    ////

    const videoTexture = new THREE.VideoTexture(videoElement);

    this.screenScene = new THREE.Scene();
    this.screenCamera = new THREE.OrthographicCamera();
    this.screenScene.add(this.screenCamera);

    const screenMaterial = new THREE.ShaderMaterial({
      uniforms: {
        renderTexture: { value: this.renderTexture.texture },
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

    this.screenScene.add(this.plane);
  }

  updateViewport(width, height) {
    this.virtualCamera.aspect = width / height;
    if (window.orientation == 0) {
      this.virtualCamera.fov = Y_FOV_LANDSCAPE / this.virtualCamera.aspect;
    } else {
      this.virtualCamera.fov = Y_FOV_LANDSCAPE;
    }
    this.virtualCamera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    this.renderTexture.setSize(
      width * window.devicePixelRatio,
      height * window.devicePixelRatio
    );

    ////

    this.screenCamera.left = -width / 2;
    this.screenCamera.right = width / 2;
    this.screenCamera.top = height / 2;
    this.screenCamera.bottom = -height / 2;

    this.screenCamera.updateProjectionMatrix();

    this.plane.scale.set(width, height, 1);
  }

  setCameraOrientation(matrix) {
    this.deviceOrientation.setRotationFromMatrix(matrix);
    this.virtualCamera.quaternion.slerp(this.deviceOrientation.quaternion, 0.5);
  }

  setCameraPosition(position) {
    // set the pointer position 75 meters to the north
    this.northPointer.position.set(position.x, position.y + 75, position.z);
    this.virtualCamera.position.set(position.x, position.y, position.z);
  }

  render() {
    // set texture as render target
    this.renderer.setRenderTarget(this.renderTexture);

    // render the virtual scene to the texture
    this.renderer.clear();
    this.renderer.render(this.virtualScene, this.virtualCamera);

    // set webgl canvas as render target
    this.renderer.setRenderTarget(null);

    // render the screen scene to the device screen
    // it consists of a quad textured with a
    // blend of the virtual scene and the video stream
    this.renderer.clear();
    this.renderer.render(this.screenScene, this.screenCamera);
  }
}
