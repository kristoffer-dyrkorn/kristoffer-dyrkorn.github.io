<div style="text-align:right; color:#aaa">Kristoffer Dyrkorn, May 4, 2024</div>

# Cubes, golfing and dual identities

<p align="center">
<img src="images/blue_cube.png" width="90%">
</p>

_Brief note: This is a translation of an article I wrote in 2016. You may notice that some JavaScript conventions have changed a bit since then :)_

In this three-part article, I will go through an unusual exercise in programming: How to create an app while making the source code as short a humanly possible.

In this first part we will make a small web page that renders a spinning cube. To help us, we will use the Canvas API and some JavaScript. In the second part, we will work through the source code with the aim of making it smaller. This process is often called code golfing: An effort to minimize the source code while trying not to change the functionality. In part three, we'll take a look at how we can apply another trick, involving a "dual identity", to make the source code even shorter.

The three parts can be read independently. So, if you are interested in seeing how you can create 3D graphics from scratch in the browser, keep reading this part. Please note: It will get a bit nerdy. If you would rather like to take a closer look at code golfing in JavaScript, jump to part two. If you are more fascinated by compression tricks, part three is the right place. Note: Part two and part three will also get nerdy.

The cube we will make looks like this:

<script async src="//jsfiddle.net/0p43xm2s/embed/result/"></script>

It consists of 8 vertices, each with x, y and z coordinates. We start off by defining an array the stores the vertex coordinates:

```
var points = [-1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1];
```

The values in the array define the x, y, and z coordinates of each point, in sequence. A diagram makes the setup easier to understand:

<p align="center">
<img src="images/cube_wireframe.png" width="90%">
</p>

Here X points to the right, Y up and Z towards us, out of the screen. As you can see from the diagram, the first vertex (vertex 0) has coordinates (-1, -1, 1), and the next has (1, -1, 1).

We will now define the surfaces of the cube. We do this by creating a table where groups of 4 numbers indicate the vertices that each surface consists of.

```
var faces = [0, 1, 2, 3, 0, 3, 7, 4, 0, 4, 5, 1, 6, 5, 4, 7, 6, 2, 1, 5, 6, 7, 3, 2];
```

The first surface, ie the front of the cube, is defined by the vertices (0, 1, 2, 3). The next surface is defined by the vertices (0, 3, 7, 4). We follow the convention that vertex numbers form a counter-clockwise sequence when the surface is facing us.

We will now make the cube rotate. We do this by rotating the vertices around 2 axes - the z-axis and the y-axis. We keep the original, un-rotated vertices as they are in the original `points` array, and store the new, rotated vertices in a separate array. When we draw the cube we read out the rotated coordinates. Each time we draw the cube we first increase the rotation angles a little bit, then perform the rotation, and then draw. By increasing the angles for each redraw we make the cube animate. Note that the definition of the faces themselves (4 and 4 points in sequence) remains unchanged.

Here is the rotation code we will use to calculate the new, rotated vertices. We will not go into detail on the formulas here. The implementation looks like this:

```
// the rotated vertices are stored here
var rotated = [];

function rotate(y, z) {
  for (var i=0; i<points.length; i+=3) {
    // rotate around z axis
    rotated[i] = points[i] * Math.cos(z) - points[i+1] * Math.sin(z);
    rotated[i+1] = points[i] * Math.sin(z) + points[i+1] * Math.cos(z);

    // rotate around y axis
    var new_x = points[i+2] * Math.sin(y) + rotated[i] * Math.cos(y);
    rotated[i+2] = points[i+2] * Math.cos(y) - rotated[i] * Math.sin(y);
    rotated[i] = new_x;
  }
}
```

Here we loop over each of the original vertices, and first do the z axis rotationm, and find new x and y coordinates. (When we rotate around the z axis, the z coordinate will stay the same - so we don't need to do anything with it.) Next, we use the already rotated x coordinates and the original z coordinates, and rotate everything around the y axis. We use the temporary variable `new_x` to avoid overwriting the new x coordinate in the middle of the operations.

To make the cube look a bit more realistic, we add a perspective effect. A simple explanation of perspective is that things that are closer to us must be drawn larger on the screen than things that are further away.

The maths can be explained by imagining that you set up a camera some distance `d` from the center of the cube. The center has coordinates (0, 0, 0). We then calculate how the cube will look like if we project each vertex onto a surface that we place 1 unit away from the camera, and in front of it. This is how it can look like when viewed from the side:

<p align="center">
<img src="images/side_view.png" width="90%">
</p>

The red dot to the right is one of the vertices in the cube in 3D space. It has y and z coordinates as the arrows pointing to it indicate. The gray vertical line is the surface where the points are projected onto - we can image this is the screen. You might see that `y'/1 = y/(d-z)`. That is, the `y` value, as measured on the surface, called `y'` in the diagram, will be `y/(d-z)`. We can see that the y coordinates of vertices further away from the camera (having with smaller z coordinates) will have lower values since in that case, `(d-z)` will be larger.

After we have applied the perspective effect we need to make another adjustment before we can draw the cube on the screen. First, we have to scale the coordinate values, since the unit from now on will be pixels, and the original values are too small (they are -+1) to produce a cube that will cover a good portion of the browser's canvas. In addition, we have to adjust the coordinates so the cube ends up in the center of the canvas - where (0, 0) is to the top left. In the figure below, the perspective projection of the cube is shown on the left, and we see how the cube should look like on the screen on the right.

<p align="center">
<img src="images/viewport.png" width="90%">
</p>

The code to convert to suitable screen coordinates is here:

```
function project(scale, distance) {
  for (var i=0; i<rotated.length; i+=3) {
    rotated[i] = scale * rotated[i] / (distance - rotated[i+2]) + canvas.width/2;
    rotated[i+1] = -scale * rotated[i+1] / (distance - rotated[i+2]) + canvas.height/2;
  }
}
```

We will now draw the surfaces / polygons that make up the cube. The Canvas API already has functions for drawing and filling polygons, so we only need to send the 4 vertices for each surface to the API. We need to first define the outline of the surface, and then which color the surface should have. Finally, we send a command to the Canvas API to draw the surface.

Here is the code:

```
// 6 shades of blue
var colors = ["#003", "#006", "#009", "#00b", "#00d", "#00f"];

function draw() {
  for (var i=0; i<faces.length; i+=4) {
    ctx.beginPath();
    ctx.moveTo(rotated[3*faces[i]], rotated[3*faces[i]+1]);
    var show = rotated[3*faces[i]+2];

    for (var j=1; j<4; j++) {
      ctx.lineTo(rotated[3*faces[i+j]], rotated[3*faces[i+j]+1]);
      show += rotated[3*faces[i+j]+2];
    }

    show = show / 4;

    ctx.closePath();
    ctx.fillStyle = colors[i/4];
    if (show > 0.15) {
      ctx.fill();
    }
  }
}
```

For each surface, we mark the start of a new surface, read out the x and y coordinates of the first vertex, and set this as the starting point. The commands `beginPath()` and `moveTo(...)` do that. Then we access the next 3 vertices that define the surface in the `for` loop, and specify a path to each of them using `lineTo()`. When we close the path with `closePath()`, the last vertex will be connected to first vertex and we have defined a polygon outline. We then specify the color, and tell the Canvas API to fill using `fill()`.

There is a small problem here: We need to consider that not all of the surfaces in the cube will be visible at once. We would like to just draw the surfaces facing us - ie the ones we can see given the rotation at any given time. But how? One way to do it, that works well in this particular case, is to use the average z coordinates of the surface vertices. If this value is greater than 0, then the surface is facing towards us, and should be drawn. This works in principle, but due to the perspective effect we are using we have to set the threshold a bit higher than 0. The value used in the code, 0.15, was chosen after a bit of trial and error.

<p align="center">
<img src="images/top_view.png" width="90%">
</p>

If we imagine that we are looking from above, the blue dot in the diagram shows the average z coordinates of one surface. Due to the way that the perspective effect changes the shape of the cube, the surface will only become visible for the viewer when the average z is slightly larger than 0. We make sure we call `fill()` only when that is the case.

The only thing left now is the animation loop:

```
function animate() {
  requestAnimationFrame(animate);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  rotate(y, z);
  project(350, 5);
  draw();

  y += .018;
  z += .011;
}
```

Here, `requestAnimationFrame(...)` is used to ensure smooth animation - the drawing and clearing of the canvas is synchronised to the refresh rate of the monitor. In the `animate()` function we first clear the canvas using `clearRect(...)`. We then rotate the vertices, calculate the perspective effect and draw the cube. Finally, we increase the rotation angles so the cube will have rotated a bit the next time it is drawn.

The finished application can be seen [here](./app/1.html). The source code is 2156 bytes when we include a little bit of comments, markup and layout code.

With that, this first part is done. Read on to see what happens next! We will then start the shortening the source code. There is only one goal: to reduce the number of bytes of the source code file while making the cube appear as before.
