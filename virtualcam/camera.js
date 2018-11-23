const NEAR_CLIP = 1;
const FAR_CLIP = 500;

class Camera {
  constructor() {
    this.projectionMatrix = new Matrix();
    this.viewMatrix = new Matrix();
    this.cameraMatrix = new Matrix();
  }

  setPosition(x, y, z) {
    this.viewMatrix.setPosition(x, y, z);
    this.recalcCameraMatrix();
  }

  updateEulerAngles(x, y, z) {
    // Euler angles are absolute rotations 
    this.viewMatrix = new Matrix();

    // DeviceOrientation events describe rotations in ZXY order 
    this.rotateZ(z);
    this.rotateX(x);
    this.rotateY(y);
  }

  rotateZ(angle) {
    this.viewMatrix.rotate(0, 0, angle * DEGREES_TO_RADIANS);
    this.recalcCameraMatrix();
  }

  rotateY(angle) {
    this.viewMatrix.rotate(0, angle * DEGREES_TO_RADIANS, 0);
    this.recalcCameraMatrix();
  }

  rotateX(angle) {
    this.viewMatrix.rotate(angle * DEGREES_TO_RADIANS, 0, 0);
    this.recalcCameraMatrix();
  }

  recalcCameraMatrix() {
    this.cameraMatrix = new Matrix(this.viewMatrix);
    this.cameraMatrix.invertCamera();
  }

  setProjectionMatrix(fov, aspect) {
    this.projectionMatrix.setProjection(fov, aspect, NEAR_CLIP, FAR_CLIP);
  }

  getCameraMatrix() {
    return this.cameraMatrix;
  }

  getProjectionMatrix() {
    return this.projectionMatrix;
  }
}
