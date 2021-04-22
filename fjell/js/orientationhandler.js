import Logger from "./logger.js";
import * as THREE from "./three.module.js";

export default class OrientationHandler {
  constructor() {
    this.baseHeading = 0;
    this.basePitch = 0;
    this.gyroSample = new THREE.Euler(0, 0, 0, "ZXY");

    this.deviceOrientation = new THREE.Matrix4();
    this.screenOrientation = new THREE.Matrix4();
  }

  getOrientation() {
    this.hasBaseheading = false;
    if (
      window.DeviceOrientationEvent !== undefined &&
      typeof window.DeviceOrientationEvent.requestPermission === "function"
    ) {
      window.DeviceOrientationEvent.requestPermission()
        .then((response) => {
          if (response == "granted") {
            window.addEventListener("deviceorientation", (event) =>
              this.set(event)
            );
          }
        })
        .catch((error) => {
          console.error("Unable to use DeviceOrientation API:", error);
        });
    } else {
      window.addEventListener("deviceorientation", (event) => this.set(event));
    }
  }

  set(event) {
    // when compass heading accuracy reaches 15 degrees (the best we can hope for)
    // use that heading as a fixed reference
    if (event.webkitCompassAccuracy < 15 && !this.hasBaseheading) {
      this.baseHeading = event.webkitCompassHeading;
      this.hasBaseheading = true;
      Logger.log("Received compass data.");
    }

    // when reading orientations, use compass values relative to the fixed compass reference
    // this removes non-intuitive compass drift
    // ie we trade off (slow-settling) precision, and prefer getting a quicker - and rock stable - orientation.
    // due to limited compass accuracy, the user will need calibrate the actual orientation anyway,
    // and compass drift, although towards a more accurate base heading, will force the user to do annoying re-calibration later on
    if (this.hasBaseheading) {
      this.gyroSample.x = event.beta * THREE.Math.DEG2RAD;
      this.gyroSample.y = (event.gamma - this.basePitch) * THREE.Math.DEG2RAD;
      this.gyroSample.z = (event.alpha - this.baseHeading) * THREE.Math.DEG2RAD;
      this.deviceOrientation.makeRotationFromEuler(this.gyroSample);
    }
  }

  setViewportRotation(angle) {
    this.screenOrientation.makeRotationZ(angle);
  }

  adjustBaseHeading(delta) {
    this.baseHeading -= delta;
  }

  adjustBasePitch(delta) {
    this.basePitch += delta;
  }

  get() {
    const finalOrientation = this.deviceOrientation.clone();
    finalOrientation.multiply(this.screenOrientation);
    return finalOrientation;
  }
}
