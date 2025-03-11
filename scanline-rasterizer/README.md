<div style="text-align:right; color:#aaa">Kristoffer Dyrkorn, March 9, 2025</div>

# Rasterizing triangles using scanline conversion

<p align="center">
<img src="images/0-two-triangles.png" width="90%">
</p>

In this article series, I will go through an algorithm to draw (rasterize) triangles. The method is based on a technique called called scanline conversion. The algorithm itself is quite old - the earliest reference I have found is the 1967 paper ["Half-tone perspective drawings by computer"](https://dl.acm.org/doi/pdf/10.1145/1465611.1465619), by Wylie et al. At that time (and until the mid 90's) 3D graphics was done on the CPU, and
that meant that code and algorithms were optimized for single-threaded hardware. And that's the case for this method as well.

In an [earlier article series](/triangle-rasterizer), I have gone through a different algorithm for triangle rasterization. That method was published by Juan Piñeda in 1988. Today, it is still the preferred way to rasterize triangles - since it is well suited for highly parallel hardware, which is what you find inside modern GPUs.

The scanline method, the topic of this article series, is not that popular anymore. But it is still relevant and valuable whenever your runtime environment is single-threaded. And that is the case here: We will implement the rasterizer in JavaScript and run it in the browser. By all means, it is possible to write multi-threaded browser code via web workers, but the overhead is too large for our purposes here.

Although the main concepts of rasterization will be explained in detail, it will still help if you have read the [previous article series on rasterization](/triangle-rasterizer), or have some experience from writing graphics code yourself. This article series builds upon, and extends, the previous one.

The contents is structured as follows: First, you will get to know the basic principles behind the scanline conversion method as we make a first, simple implementation of it. In the next sections we will then add various refinements, and we will end up with a nice little app. Finally, we will compare and contrast the two rasterizations methods as they are described in the articles. A key result is that the method here is around 5 times as fast as the previous.

Please note: The contents here is published under a Creative Commons [BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) license. In short, this means you are free to adapt and share the material as you want, as long as you don't make money by doing so, and as long as you give proper credit to the author.

As in the previous article series, the focus here will be on correctness and visual quality. Still, we will optimize for performance when we can.

## Sections

1. [An overview and a first implementation](1)
2. [Living on the edge](2)
3. [Faster horizontal lines](3)
4. [How to be smooth](4)
5. [Use the math, Luke](5)
6. [Epilogue](6)
