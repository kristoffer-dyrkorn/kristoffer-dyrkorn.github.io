import Logger from "./logger.js"

export default class Readout {
  constructor(description, threshold, timeout) {
    this.description = description
    this.threshold = threshold
    this.isSettled = false
    this.timeoutId = setTimeout(this.settle.bind(this), timeout)
    this.intervalLoggerId = setInterval(this.logValue.bind(this), 1000)
  }

  logValue() {
    if (!this.value || this.isSettled) return
    Logger.log(`${this.description}: ${this.value | 0}`)
  }

  set(value) {
    this.value = value
    if (value < this.threshold && !this.isSettled) {
      Logger.log(`Threshold for ${this.description} reached: ${this.threshold}`)
      this.settle()
    }
  }

  settle() {
    this.isSettled = true
    // truncate float values but keep undefined values
    if (this.value) {
      this.value = this.value | 0
    }
    Logger.log(`Settled ${this.description}, value: ${this.value}`)
    this.stop()
  }

  stop() {
    Logger.log(`Stopped readout for ${this.description}.`)
    clearTimeout(this.timeoutId)
    clearInterval(this.intervalLoggerId)
  }
}
