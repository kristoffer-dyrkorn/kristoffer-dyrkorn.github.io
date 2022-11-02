# A fast and precise triangle rasterizer

In this article series, you will get to learn how a computer draws a triangle on the screen. This may look like a strange thing to study, but if you go through the series you will likely discover that there are surprising complexity, details and tradeoffs involved in drawing triangles.

That experience is not unusual in the field of computer graphics - or even computer science itself: If you stumble upon a problem and ask yourself: "Can it be that hard" - then well, yes, sometimes it can! Drawing a triangle on screen correctly and efficiently is certainly not trivial. At the same time, this is at times considered an "old" and "already solved" problem. However, that should not stop us from learning more. Depending on your experience and skill level there are likely some unexpected tricks that can be learned, tricks that can be applied in other contexts - such as maths, numerics, computer graphics or performance optimization.

To begin with, let's have a look at what it means to draw a triangle on the screen. The process is often called triangle rasterization. The word _rasterization_ can be explained this way: A triangle is defined by three points (vertices). By drawing lines between each of them the triangle appears. However, a computer cannot just draw an ideal triangle defined by lines. On a computer screen we instead have to draw pixels. Put differently: We have to tell the computer to change the colors for a certain set of pixels - that make the triangle - on the screen. The screen pixels are organized in a regular grid, a _raster_, and this is what gives us the meaning: By rasterization we mean the process of figuring out how to draw some geometry, typically defined by lines or mathematical functions, on a pixel screen.

<p align="center">
<img src="images/0-rasterization.png" width="75%">
</p>

The article series is structured as follows: First, you will get to know the principles behind triangle rasterization and the spesific approach we will use. Then we will make a simple, first version of a rasterizer. Then we will gradually refine it as we see needs for improvement. We will first prioritize correctness - ie that the rasterizer draws exactly those pixels it should, so that there will be no gaps and no overlaps. We will then look at performance optimizations. As you will see, the improvements we make near the final section will make the rasterizer ten times as fast!

## Sections

1. [A walkthrough of the method](1)
2. [Setting up the browser to draw pixels](2)
3. [The first, basic rasterizer](3)
4. [Moar triangles, moar problems](4)
5. [We've got to move it](5)
6. [Let's go continuous!](6)
7. [One solution, but two new problems](7)
8. [Let's fix this](8)
9. [Time to go incremental](9)
10. [Epilogue](10)

If you want to test out, modify and run the example code locally, clone [this repository](https://github.com/kristoffer-dyrkorn/triangle-rasterizer), start a local web server in the root directory (for example, using `python3 -m http.server`) and open the web page (at `http://localhost:8000` or similar). Each subfolder there has a running application you can look at. The folder names match the section numbers used here.

If you prefer to just run the example apps, use the links at the bottom of each section.
