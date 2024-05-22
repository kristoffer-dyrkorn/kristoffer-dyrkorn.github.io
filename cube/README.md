<div style="text-align:right; color:#aaa">Kristoffer Dyrkorn, May 4, 2024</div>

# Cubes, golfing and dual identities

_Brief note: This is a translated version of a blog post I wrote back in 2016. If you write JavaScript code now and then you will see that some of the JavaScript conventions I use here have changed a bit since then :)_

<p align="center">
<img src="images/blue_cube.png" width="90%">
</p>

In this three-part blog series, I will go through an unusual exercise in programming: How to create an app, that does something meaningful, while at the same time making the source code as short as possible.

In this first blog post we will set up a small web app that renders a simple 3D object. By using the Canvas API and some JavaScript, we will draw a cube and animate it in the browser. In the second post, we will go through the source code and make it smaller. This is often called code golfing: An effort to minimize the size of the source code while still making the app do something useful. In part three, we'll take a look at how we can apply a trick, involving what we may call "dual identities", to make the code even shorter.

The blog posts can be read separately. So, if you are interested in creating 3D graphics from scratch in the browser, keep reading this post. Please note: It will get a bit nerdy. However, if you would rather take a closer look at code golfing in JavaScript, jump to part two. If you are more fascinated by compression tricks, then part three is the right place to go. Note: Part two and part three are also quite nerdy.

The app we will create here will draw a three-dimensional cube that rotates on the screen. It looks like this:

<script async src="//jsfiddle.net/0p43xm2s/embed/result/"></script>

The cube consists of 8 vertices, each with x, y and z coordinates. We start by defining an array that holds all of the vertex coordinates:

```
var points = [-1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1];
```

The values in the array specify the x, y, and z coordinates of each point in sequence. A diagram makes it easier to understand:

<p align="center">
<img src="images/cube_wireframe.png" width="90%">
</p>

X points to the right, Y up and Z towards us, out of the screen. The first vertex has coordinates (-1, -1, 1), and the next has (1, -1, 1).

We will now describe how the surfaces in the cube are built. We do this by creating a table containing the numbers of each of the 4 vertices that the surfaces consist of.

```
var faces = [0, 1, 2, 3, 0, 3, 7, 4, 0, 4, 5, 1, 6, 5, 4, 7, 6, 2, 1, 5, 6, 7, 3, 2];
```

The first surface, ie the front of the cube, consists of the vertices (0, 1, 2, 3). The next surface consists of the points (0, 3, 7, 4). Note that we specify the vertex numbers in a counter-clockwise order when the surface is facing us.

We will now make the cube rotate. We do this by rotating the vertices around 2 axes - the z-axis and the y-axis. We keep the original, un-rotated vertices in its own array, and store the new, rotated vertices in a separate array before drawing the cube using those vertides. Each time the cube is drawn we increase the rotation angles a little bit, and when we keep drawing and keep rotating that will make the cube animate. The definition of the faces themselves (4 and 4 points in sequence) remains unchanged.

There exists rotation formulas that we can use to calculate the new, rotated x, y and z values from the original ones. We will not go into detail about the formulas, but translated into code it looks like this:

```
// already rotated vertices are stored here
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

Here we go through the original vertices in turn, and first calculate new x and y coordinates when rotating around the z-axis. (When we rotate around the z axis, the z coordinate stays the same. So we don't need to do anything with it.) Next, we start with the already rotated x coordinates, and the original z coordinates, and rotate those around the y axis. We use a temporary variable new_x in order to now overwrite the new x coordinate too early in the sequence of calculations. The reason is that the original value must be used when calculating the new z coordinate.

To make the cube look a bit more realistic, we add a perspective effect. A simple description of perspective is that things that are closer to us must be drawn larger than things that are further away. This can be explained by imagining that you set up a camera at some distance `d` from the center of the cube, which is at coordinate (0, 0, 0). We then calculate how the cube will look like if we project each vertex onto a surface that we place 1 unit away from the camera (in front of it). If we imagine that we see all this from the side, it can look like this:

<p align="center">
<img src="images/side_view.png" width="90%">
</p>

The red point in the diagram is one of the vertices in the cube. The gray line is the that we project the points onto. After some thinking it is possible to see that `y'/1 = y/(d-z)`. That is, the `y` value, as measured on the surface, here called `y'`, will be `y/(d-z)`. At the same time, we can see that the y coordinates of vertices further away from the camera (ie points with smaller z coordinates) will get lower values because in that case, `(d-z)` will be larger.

After the perspective effect has been applied, we need to make a few more adjustments before drawing the cube on the screen. First, we have to scale the coordinate values, since the unit from now on is pixels, and the original values are too small. In addition, we have to adjust the coordinate values so the cube ends up in the middle of the browser's canvas. In the figure below, the projection of the cube is shown on the left, and on the right side we see how this should look like on the screen.

<p align="center">
<img src="images/viewport.png" width="90%">
</p>

The code to do all of that is here:

```
function project(scale, distance) {
  for (var i=0; i<rotated.length; i+=3) {
    rotated[i] = scale * rotated[i] / (distance - rotated[i+2]) + canvas.width/2;
    rotated[i+1] = -scale * rotated[i+1] / (distance - rotated[i+2]) + canvas.height/2;
  }
}
```

We will now draw the surfaces that make up the cube. The Canvas API already has functions for drawing and filling polygons, so it will be enough for us to send the 4 vertices that each surface consists of to the API. First we define the outline of the surface, and then we say which color the surface should have. Finally, we send the command to draw the surface itself. Here is the code:

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

For each surface, we access the x and y coordinates of the first vertex of the surface, and we set this as the starting point for the drawing operation. The commands `beginPath()` and `moveTo(...)` take care of that. Then we access the next 3 vertices that define the surface, and specify a path to each of them in order with `lineTo()`. When we close the path with `closePath()`, the last location we were at will be connected to first location of the path, i.e. to the vertex in `moveTo(...)`. At this stage we have defined the outline of the surface. We then specify the color, and tell the Canvas API to fill the polygon using `fill()`.

There is a small problem: We have to consider that not all of the surfaces will be visible. We would like to just draw the surfaces we can actually see. But how? One way to do it, that works in this particular case, is to calculate the average of the z coordinates of the surface vertices. If this value is greater than 0, then the surface is facing towards us, and should be drawn. This works in principle, but due to perspective we have to set the threshold slightly higher than 0. The value used in the code, 0.15, was chosen after a bit of trial and error.

<p align="center">
<img src="images/top_view.png" width="90%">
</p>

If we imagine that we are looking from above, the blue dot shows the average of the z coordinates of a surface. Due to the way that the perspective changes the appearance of the cube, the surface will only become visible for the viewer when the average z is slightly larger than 0. We make sure we call `fill()` only when that is the case.

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

Here, `requestAnimationFrame(...)` is used to ensure smooth drawing. In the `animate()` function we first clear the canvas. Then we rotate the vertices, calculate the perspective effect and draw the cube. Finally, we increase the rotation angles so the cube will have rotated a bit the next time it is drawn.

The finished application can be seen here. The source code is 1906 bytes when we include a little bit of markup and layout code.

With that, this first part of the series is finished. Read on to see what happens in the next part, then we'll shrink the code! We will have only one goal in mind: to reduce the number of bytes while making the cube appear as before.
