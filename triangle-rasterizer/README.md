# A fast and correct triangle rasterizer

In this article series, you will get to learn how a computer draws a triangle on screen. This may sound like a silly thing to study, but if you go through the series you will likely discover that there are details, tradeoffs and complexity that you would not have thought about up front.

This is not unusual in the field of computer graphics - or even computer science: If you stumble upon a problem and ask yourself: "Can it be that hard" - then well, yes, sometimes it can! Drawing a triangle on screen correctly and efficiently is certainly not trivial. And at the same time, it is considered an "old" and "already solved" problem. However, that should not stop us from diving into the subject. Depending on your experience and skill level there are likely things to learn here, things that will be applicable in other fields related to programming - for example maths, numerics, computer graphics or performance optimization.

To begin with, let's have a look at what it means to draw a triangle on the screen. This process is often called triangle rasterization. The term can be explained like this: A triangle is defined by three points (vertices). By drawing lines between each of them the triangle appears.

However, on a computer screen we cannot draw lines directly, instead we need to draw pixels. Put differently: We need to change the colors for a given set of pixels on screen. They are organized in a regular grid, a _raster_, and this is what gives us the name: By rasterization we mean the process of figuring out how to draw a graphical object - defined by points or lines - on a pixel screen.

<p align="center">
<img src="images/0-rasterization.png" width="75%">
</p>

This tutorial is structured as follows: First, you will get to know the principles behind triangle rasterization and the approach we will use here. Then we will make a simple, first version of a rasterizer. Then we will gradually refine it as we see needs for improvements. The focus here will be on correctness - ie that the rasterizer draws exactly those pixels it should, so that there will be no gaps and no overlaps. We will also look at performance optimizations - and as you will see, the changes we make in section 9 will make the rasterizer ten times as fast!

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

If you want to test out, modify and run the example code locally, clone [this repository](https://github.com/kristoffer-dyrkorn/triangle-rasterizer), start a local web server in the root directory (for example, using `python3 -m http.server`) and open the web page (at `http://localhost:8000` or similar). Each subfolder has a running application you can look at, and the folder name matches the section number.

I you would prefer to just run the example apps, follow the links at the bottom of each section.
