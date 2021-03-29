import * as THREE from "./three.module.js";

const NEAR_CLIP = 20;
const FAR_CLIP = 36000; // when rendering 9 tiles: TILE_EXTENTS * SQRT(8)

// https://developer.apple.com/library/archive/documentation/DeviceInformation/Reference/iOSDeviceCompatibility/Cameras/Cameras.html#//apple_ref/doc/uid/TP40013599-CH107-SW21
// 1280x720 X_FOV = 60.983 => Y_FOV = 34.30

// empirical value:
// 40 degrees gives best match for video and virtual world
const Y_FOV_LANDSCAPE = 40;

export default class VirtualScene {
  constructor(canvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvasElement,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.autoClear = false;

    // the virtual scene will be rendered into this texture
    this.renderTexture = new THREE.WebGLRenderTarget();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera();
    this.camera.near = NEAR_CLIP;
    this.camera.far = FAR_CLIP;

    this.scene.add(this.camera);

    // the current device orientation,
    // ie the orientation the virtual camera is interpolated towards
    this.deviceOrientation = new THREE.Object3D();

    // a pointer showing the north direction
    const pointerGeometry = new THREE.CylinderGeometry(0, 2, 5, 8);
    const pointerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.pointer = new THREE.Mesh(pointerGeometry, pointerMaterial);
    this.pointer.rotateX(90 * THREE.MathUtils.DEG2RAD);

    this.scene.add(this.pointer);

    const ambientLight = new THREE.AmbientLight(0x00ff00);
    this.scene.add(ambientLight);
  }

  updateViewport(width, height) {
    this.camera.aspect = width / height;
    if (window.orientation == 0) {
      this.camera.fov = Y_FOV_LANDSCAPE / this.camera.aspect;
    } else {
      this.camera.fov = Y_FOV_LANDSCAPE;
    }
    this.camera.updateProjectionMatrix();

    this.renderTexture.setSize(
      width * window.devicePixelRatio,
      height * window.devicePixelRatio
    );

    this.renderer.setSize(width, height);
  }

  setCameraOrientation(matrix) {
    this.deviceOrientation.setRotationFromMatrix(matrix);
    this.camera.quaternion.slerp(this.deviceOrientation.quaternion, 0.5);
  }

  setCameraPosition(position) {
    // set the pointer position 75 meters to the north
    this.pointer.position.set(position.x, position.y + 75, position.z);

    this.camera.position.set(position.x, position.y, position.z);
  }

  renderToTexture() {
    // set texture as render target
    this.renderer.setRenderTarget(this.renderTexture);

    // render the virtual scene to the texture
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  renderToScreen(screenScene) {
    // set webgl canvas as render target
    this.renderer.setRenderTarget(null);

    // render the screen scene to the device screen
    // it consists of a quad textured with a
    // blend of the virtual scene and the video stream
    this.renderer.clear();
    this.renderer.render(screenScene.scene, screenScene.camera);
  }
}
