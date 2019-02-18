import Logger from "./logger.js"
import Readout from "./readout.js"

export default class OrientationHandler {
  constructor() {
    this.headingReadout = new Readout("Heading accuracy (deg)", 20, 10000)
    this.hasBaseheading = false
    this.baseHeading = 0
    this.basePitch = 0
    this.gyroSample = new THREE.Euler(0, 0, 0, "ZXY")
    this.deviceOrientation = new THREE.Matrix4()
    this.screenOrientation = new THREE.Matrix4()

    window.addEventListener("deviceorientation", event => this.set(event))
  }

  set(event) {
    if (event.webkitCompassAccuracy !== -1) {
      this.headingReadout.set(event.webkitCompassAccuracy)
    }

    if (this.headingReadout.isSettled) {
      if (!this.hasBaseheading) {
        Logger.log(`Base heading set, accuracy: ${this.headingReadout.value} degrees.`)
        this.baseHeading = event.webkitCompassHeading
        this.hasBaseheading = true
      }
    }

    if (this.hasBaseheading) {
      this.gyroSample.x = event.beta * THREE.Math.DEG2RAD
      this.gyroSample.y = (event.gamma - this.basePitch) * THREE.Math.DEG2RAD
      this.gyroSample.z = (event.alpha - this.baseHeading) * THREE.Math.DEG2RAD

      this.deviceOrientation.makeRotationFromEuler(this.gyroSample)
    }
  }

  setViewportRotation(angle) {
    this.screenOrientation.makeRotationZ(angle)
  }

  adjustBaseHeading(delta) {
    this.baseHeading -= delta
  }

  adjustBasePitch(delta) {
    this.basePitch += delta
  }

  get() {
    const finalOrientation = this.deviceOrientation.clone()
    finalOrientation.multiply(this.screenOrientation)
    return finalOrientation
  }
}
