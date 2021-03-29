export default class Logger {
  static log(text) {
    document.getElementById("console").innerHTML += text + "<br/>"
  }
  static clear() {
    document.getElementById("console").style = "display:none"
  }
}
