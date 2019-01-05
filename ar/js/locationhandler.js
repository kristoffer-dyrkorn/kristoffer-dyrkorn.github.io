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

  error(error) {
    Logger.log("Could not get GPS position. Is GPS switched on?")
    this.positionReadout.stop()
  }
}
