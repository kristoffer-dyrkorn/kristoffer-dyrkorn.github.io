import * as THREE from "./three.module.js";
import Logger from "./logger.js";

export default class PoiCollection {
  constructor(tile, camera, scene, font) {
    this.tile = tile;
    this.camera = camera;
    this.scene = scene;
    this.font = font;
  }

  // load the pois for this tile
  async loadPois() {
    const poiFile = `./poi/${this.tile.x}-${this.tile.y}.json`;
    console.log("Loading " + poiFile);

    // cast ray from above at poi location to find intersection with mesh, ie poi elevation
    const raycaster = new THREE.Raycaster();

    await fetch(poiFile).then((response) =>
      response.json().then((features) =>
        features.forEach((feature) => {
          const position = feature.position;

          // mesh triangles have coordinates relative to tile corner
          // so also use that here for ray casting
          const poiPosition = new THREE.Vector3(
            position[0] - this.tile.x,
            position[1] - this.tile.y,
            10000
          );

          // shoot ray downwards from above to find mesh intersection, ie poi elevation
          raycaster.set(poiPosition, new THREE.Vector3(0, 0, -1));
          const intersection = raycaster.intersectObject(
            this.tile.tileMesh.geometry
          );

          // append poi z coordinate to position array
          position.push(intersection[0].point.z);

          // note: absolute coordinates are stored
          this.poiData.push({
            type: feature.type,
            name: feature.name,
            position: position,
          });
        })
      )
    );

    // show pois using default values
    this.showPois(0, 36000, 0, 3000, "ås");
  }

  showPois(camera, minDist, maxDist, minElev, maxElev, poiType) {
    // todo: traverse all pois (Groups) inside this.poiCollection
    // and remove from scene and from memory

    this.poiData.forEach((feature) => {
      const type = feature.type;
      const name = feature.name;
      const position = feature.position;

      // todo: build distance and elevation filters

      if (feature.type === poiType) {
        const poi = this.buildPoi(name);

        // rotate the poi towards the camera
        poi.rotateZ(
          270 * THREE.Math.DEG2RAD +
            Math.atan2(
              poiPosition.y - camera.position.y,
              poiPosition.x - camera.position.x
            )
        );
        poi.position.set(poiPosition);

        this.poiCollection.add(poi);
      }
    });
    this.scene.add(this.poiCollection);
    console.log("Done loading " + poiFile);
  }

  buildPoi(name) {
    const poi = new THREE.Group();

    // poi base (a sphere at the poi position)
    const baseGeometry = new THREE.SphereGeometry(30, 8, 8);
    const baseMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);

    poi.add(base);

    // "sign pole", 300 m tall
    const poleLength = 300;
    const poleGeometry = new THREE.BoxGeometry(10, 10, poleLength);
    const poleMaterial = new THREE.MeshBasicMaterial();
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);

    // make pole end at the base
    pole.position.set(0, 0, poleLength / 2);

    poi.add(pole);

    // use distance to poi to make far signs larger (even out text sizes)
    //    const cameraDistance = this.camera.position.clone();
    //    cameraDistance.sub(pole.position);
    //    const fontSize = 100 + 0.01 * cameraDistance.length();

    // create poi sign text, 1 meter deep
    const textGeometry = new THREE.TextGeometry(name, {
      font: this.font,
      size: 150,
      height: 1,
    });
    const textMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
    });
    const text = new THREE.Mesh(textGeometry, textMaterial);

    // make text orthogonal to the xy plane
    text.rotateX(90 * THREE.Math.DEG2RAD);

    // center text and place on top of pole
    textGeometry.computeBoundingSphere();
    text.position.set(-fontGeometry.boundingSphere.radius, 0, poleLength / 2);

    poi.add(textMesh);
    return poi;
  }
}
