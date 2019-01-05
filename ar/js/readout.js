import Logger from "./logger.js"

export default class Readout {
  constructor(description, initialValue, timeout) {
    this.description = description
    this.value = initialValue
    this.isSettled = false
    this.timeoutId = setTimeout(this.settle.bind(this), timeout)
    this.intervalLoggerId = setInterval(this.logValue.bind(this), 1000)
  }

  logValue() {
    const text = "Current " + this.description + " is: " + (this.value | 0)
    Logger.log(text)
  }

  update(value) {
    this.value = value
    /*
    if (value < this.threshold) {
      settle()
    }
    */
  }

  settle() {
    // console.log("Settled " + this.description + ", value: " + this.value)
    const text = "Settled " + this.description + ", value: " + (this.value | 0)
    Logger.log(text)
    this.isSettled = true
    clearTimeout(this.timeoutId)
    clearInterval(this.intervalLoggerId)
  }

  stop() {
    Logger.log("Stopped readout for " + this.description)
    clearTimeout(this.timeoutId)
    clearInterval(this.intervalLoggerId)
  }
}
