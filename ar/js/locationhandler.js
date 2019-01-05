import Logger from "./logger.js"
import Readout from "./readout.js"

export default class LocationHandler {
  constructor(callback) {
    this.positionReadout = new Readout("position accuracy (m)", 5000)
    this.callback = callback
  }

  update(position) {
    this.positionReadout.update(position.coords.accuracy)
    if (this.positionReadout.isSettled) {
      this.callback(latLonToUTM(position.coords.latitude, position.coords.longitude, 33))
    }
  }

  stopReadout() {
    this.positionReadout.stop()
  }
}
