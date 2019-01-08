import Logger from "./logger.js"
import Readout from "./readout.js"

export default class LocationHandler {
  constructor(callback) {
    this.positionReadout = new Readout("position accuracy (m)", 25, 10000)
    this.callback = callback

    this.locationWatchID = navigator.geolocation.watchPosition(
      position => this.set(position),
      error => this.handleError(error),
      {
        enableHighAccuracy: true,
        maximumAge: 1000
      }
    )
  }

  set(position) {
    this.positionReadout.set(position.coords.accuracy)
    if (this.positionReadout.isSettled) {
      navigator.geolocation.clearWatch(this.locationWatchID)
      const pos = latLonToUTM(position.coords.latitude, position.coords.longitude, 33)
      this.callback(pos.e, pos.n, position.coords.altitude)
    }
  }

  handleError(error) {
    navigator.geolocation.clearWatch(this.locationWatchID)
    Logger.log(`Could not get GPS position: ${error}`)
    this.positionReadout.stop()
  }
}
