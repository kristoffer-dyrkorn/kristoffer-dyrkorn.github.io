<div style="text-align:right; color:#aaa">Kristoffer Dyrkorn, May 4, 2024</div>

# Cubes, golfing and dual identities

In this three-part blog series, we will take a closer look at a somewhat unusual exercise in programming: How to create code that takes up the least amount of space. In the first part, we will create a small web application that displays simple 3D graphics. Using the Canvas API and JavaScript, we will create a rotating cube that will be displayed in the browser. In part two, we continue to work with the code base from part one, and then the topic is code golfing. Code golfing is a competition to solve a specific task using as little code as possible. In part three, we'll look at how we can apply a kind of dual identity to our code to make it even shorter.

<p align="center">
<img src="images/blue_cube.png" width="90%">
</p>

The three blog posts can be read separately. So if you are interested in how to create simple 3D graphics from scratch, just keep reading this section. Warning: It will get a little nerdy. If you would rather look at golfing in JavaScript, you can skip to part two. If you are fascinated by compression tricks in the browser, then part three is the right place to go. Warning: Part two and part three will also get nerdy.

The application we will use as an example therefore draws a three-dimensional cube that spins on the screen. The cube looks like this:

<script async src="//jsfiddle.net/0p43xm2s/embed/result/"></script>

...and consists of 8 points, each with its own x-, y- and z-coordinates. The code is written in JavaScript. We start by defining an array to hold the coordinates of the points:

```
var points = [-1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1];
```

The values in the array specify the x, y, and z coordinates of each point consecutively. If we create a sketch, it will be easier to get an overview:

<p align="center">
<img src="images/cube_wireframe.png" width="90%">
</p>

X points to the right, Y up and Z towards us. The first point has coordinates (-1, -1, 1), and the next has (1, -1, 1).

We will then indicate how the surfaces in the cube are built up. We do this by stating which 4 points each surface consists of. The numbers in this new array indicate the numbers of the points included in each surface.

```
var faces = [0, 1, 2, 3, 0, 3, 7, 4, 0, 4, 5, 1, 6, 5, 4, 7, 6, 2, 1, 5, 6, 7, 3, 2];
```

706 / 5,000
The first face, ie the front of the cube, consists of the points (0, 1, 2, 3), and the next consists of the points (0, 3, 7, 4).

Then we will make the cube spin. Here the points will be rotated around 2 axes, the z-axis and the y-axis. The original points are preserved as they are, and we calculate a set of new, rotated points for each time the cube is drawn. By increasing the rotation angles a little for each drawing, we make the cube spin. The definition of the faces themselves (4 and 4 points) remains as they are.

Using formulas for rotation of points, we can calculate new, fully rotated x-, y- and z-values from the original points. We will not go into the formulas here, but translated into code this looks like this:

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

Here we go through the original points in turn and first calculate new x- and y-coordinates after rotation around the z-axis. (When we rotate a point around the z-axis, the z-coordinate won't change. So we don't need to do anything with it.) Next, we start with the already rotated x-coordinates and the original z-coordinates, and rotate these around y - axis. We must use a temporary variable new_x in order not to overwrite the new x-coordinate too early in the calculation. This is because the original value must be used to be able to calculate the new z-coordinate.

To make the cube look good on the screen, we also need to add a perspective effect. Perspective can be simply described as that things that are closer to us must be drawn larger than things that are further away. The perspective can be found by imagining that you set up a camera at a distance d up to the center of the cube, i.e. up to the point (0, 0, 0). We then calculate how the cube will look if we project each point onto a surface that we place 1 unit in front of the camera. If we imagine that we see the layout from the side, it looks like this:

<p align="center">
<img src="images/side_view.png" width="90%">
</p>

The red point is a corner point in the cube. The gray line is the surface onto which we project the points in the cube. With a little pondering, it is possible to see that `y'/1 = y/(d-z)`. That is, the y-value on the surface, `y'`, becomes `y/(d-z)`. At the same time, we can see that the y-coordinates of points further away from the camera (ie points with smaller z-coordinates) will have lower values because `(d-z)` will then be larger.

After the perspective effect has been applied, we need to make a few more adjustments when the cube is to be drawn on the screen. First we have to scale up the coordinates of the points since the unit from now on will be pixels, and the numerical values we have used so far are quite small. In addition, we have to recalculate the coordinate values so that they end up in the middle of the browser's canvas. In the figure below, the projection of the cube is shown on the left, and on the right we see how this should look on the screen.

<p align="center">
<img src="images/viewport.png.png" width="90%">
</p>

The code to do all this looks like this:

```
function project(scale, distance) {
  for (var i=0; i<rotated.length; i+=3) {
    rotated[i] = scale * rotated[i] / (distance - rotated[i+2]) + canvas.width/2;
    rotated[i+1] = -scale * rotated[i+1] / (distance - rotated[i+2]) + canvas.height/2;
  }
}
```

Then we will draw the surfaces that make up the cube. The Canvas API has functions for drawing filled surfaces, so it will be enough to specify the 4 points that each surface consists of. First we define the outline of the surface, and then we say which color the surface should be filled with. Finally, we give the command to draw the surface. Here is the code:

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

For each surface, we therefore extract the coordinates of the first point included in the surface, and we set this as the starting point for the drawing. The commands `beginPath()` and `moveTo(...)` take care of that. Then we extract the next 3 points by which the surface is defined, and specify a path to each of those points. When we close the path with `closePath()`, a path is automatically created from where we last stood to the first point in the path, i.e. the point that was specified with `moveTo(...)`. With this, we have defined the outline of our surface, and we then specify the color with which the surface should be drawn.

But then there is a small problem: We have to take into account that not all the surfaces in a cube will be visible. We would prefer to only draw the surfaces that we can actually see. But how can we find out which ones they are? One way to do it in this particular case is to look at the average of the z-coordinates of the points that make up a surface. If the average value for z is greater than 0, the surface points towards us, and must then be drawn up. This works fine, but because of the perspective effect we've added, we have to set the limit slightly higher than exactly 0. The value used in the code, 0.15, was chosen after a bit of trial and error.

<p align="center">
<img src="images/top_view.png" width="90%">
</p>

If we imagine that we are seeing the layout from above, it will all look roughly like this. The blue point is the intersection of the z-coordinates of one surface. Because of the way the perspective changes the appearance of the cube, the side surface only becomes visible when the cut value is slightly greater than 0. If the surface is visible, we call `fill()`.

The only thing now left of the code is the animation loop itself:

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

Here, `requestAnimationFrame(...)` is used to ensure smooth drawing. Inside the loop, we first blank out the canvas we have drawn on. Then we rotate the points, calculate perspective and draw the cube. Finally, we increase the angles by which the cube will be rotated the next time it is drawn.

The finished application can be seen here. The source code is 1906 bytes when a little markup and layout are taken into account.

And with that, this first part of the blog series is finished. Read what happens in the next part — then we'll shrink the code! We work relentlessly, and have only one goal in mind: to reduce the number of bytes. Everything will be fine, as long as the cube looks roughly the same as before.
