export default class VideoHandler {
  constructor(element) {
    this.element = element;

    this.constraints = {
      audio: false,
      video: {
        facingMode: "environment",
        width: 1280,
        height: 720,
      },
    };
  }

  async start() {
    // start video, needs to be called in an interaction handler
    this.stream = await navigator.mediaDevices
      .getUserMedia(this.constraints)
      .catch((error) => {
        console.error(`Error reading video from camera: ${error}`);
      });

    this.element.srcObject = this.stream;
    try {
      this.element.play();
      console.log(
        `Playing ${this.element.videoWidth} x ${this.element.videoHeight}`
      );
    } catch (error) {
      console.error(`Error playing video from camera: ${error}`);
    }
  }
}
