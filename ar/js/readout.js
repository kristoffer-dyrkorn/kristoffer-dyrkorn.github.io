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
    if (!this.value) return
    Logger.log(`Current ${this.description} is: ${this.value | 0}`)
  }

  set(value) {
    this.value = value
    if (value < this.threshold) {
      Logger.log(`Threshold for ${this.description} reached: ${this.threshold}`)
      settle()
    }
  }

  settle() {
    // truncate float values but keep undefined values
    if (this.value) {
      this.value = this.value | 0
    }
    Logger.log(`Settled ${this.description}, value: ${this.value}`)
    clearTimeout(this.timeoutId)
    clearInterval(this.intervalLoggerId)
    this.isSettled = true
  }

  stop() {
    Logger.log(`Stopped readout for ${this.description}.`)
    clearTimeout(this.timeoutId)
    clearInterval(this.intervalLoggerId)
  }
}
