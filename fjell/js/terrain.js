import * as THREE from "./three.module.js";
import Tile from "./tile.js";

const MIN_EAST = -100000;
const MIN_NORTH = 6400000;
const TILE_EXTENTS = 12750;

export default class Terrain {
  constructor(renderer) {
    this.camera = renderer.virtualCamera;
    this.scene = renderer.virtualScene;
    this.fontLoader = new THREE.FontLoader();

    // https://fonts.google.com/specimen/Open+Sans?preview.text_type=custom
    // https://gero3.github.io/facetype.js/
    this.fontLoader.load("fonts/open_sans_light.json", (font) => {
      this.font = font;
    });

    this.tiles = [];
    this.visible = true;
  }

  async loadTiles(position) {
    // given a location, find the lower left point of the surrounding tile
    const minx =
      Math.trunc((position.x - MIN_EAST) / TILE_EXTENTS) * TILE_EXTENTS +
      MIN_EAST;
    const miny =
      Math.trunc((position.y - MIN_NORTH) / TILE_EXTENTS) * TILE_EXTENTS +
      MIN_NORTH;

    console.log("Loading tiles and landscape features.");

    // load 3x3 tiles.
    // the center tile surrounds the input location
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        const tile = new Tile(
          x * TILE_EXTENTS + minx,
          y * TILE_EXTENTS + miny,
          this.camera,
          this.scene,
          this.font
        );
        this.tiles.push(tile);
        await tile.load();
      }
    }
  }

  setVisibility(visibility) {
    this.visible = visibility;
    this.tiles.forEach((tile) => tile.setVisible(this.visible));
  }

  updatePois(minDist, maxDist, minElev, maxElev, poiType) {
    this.tiles.forEach((tile) => {
      tile.showPois(minDist, maxDist, minElev, maxElev, poiType);
    });
  }
}
