export default class Logger {
  static log(text) {
    document.getElementById("console").innerHTML += text + "<br/>"
  }
  static clearLog() {
    document.getElementById("console").innerHTML = ""
  }
}
