export default class Readout {
  constructor(description, timeout) {
    this.description = description
    this.isSettled = false
    this.timeoutId = setTimeout(this.settle.bind(this), timeout)
    this.intervalLoggerId = setInterval(this.logValue.bind(this), 1000)
  }

  logValue() {
    //    console.log("Current " + this.description + " is: " + this.value)
    const text = "Current " + this.description + " is: " + this.value
    document.getElementById("console").innerHTML += text + "<br/>"
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
    const text = "Settled " + this.description + ", value: " + this.value
    document.getElementById("console").innerHTML += text + "<br/>"
    this.isSettled = true
    clearTimeout(this.timeoutId)
    clearInterval(this.intervalLoggerId)
  }
}
