import Logger from "./logger.js";

export default class Readout {
  constructor(description, threshold, timeout) {
    this.description = description;
    this.threshold = threshold;
    this.isSettled = false;
    this.timeoutId = setTimeout(this.settle.bind(this), timeout);
    this.intervalLoggerId = setInterval(this.logValue.bind(this), 1000);
  }

  logValue() {
    if (!this.accuracy || this.isSettled) return;
    console.log(
      `${this.description}: Accuracy: ${this.accuracy | 0}, value: ${
        this.value
      }`
    );
  }

  set(accuracy, value) {
    this.accuracy = accuracy;
    this.value = value;
    if (accuracy < this.threshold && !this.isSettled) {
      console.log(
        `Threshold for ${this.description} reached: ${this.threshold}`
      );
      this.settle();
    }
  }

  settle() {
    if (this.accuracy < this.threshold) {
      console.log(
        `${this.description} settled. Value: ${this.value}, accuracy: ${this.accuracy}`
      );
    } else {
      console.log(
        `Did not settle ${this.description} due to timeout. Accuracy: ${this.accuracy}, value: ${this.value}`
      );
    }
    this.isSettled = true;
    this.stop();
  }

  stop() {
    clearTimeout(this.timeoutId);
    clearInterval(this.intervalLoggerId);
  }
}
