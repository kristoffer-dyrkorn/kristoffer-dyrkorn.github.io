export default class Logger {
  static log(text) {
    document.getElementById("console").innerText = text;
  }
  static clear() {
    document.getElementById("console").innerText = "";
  }
}
