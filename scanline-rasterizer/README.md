<div style="text-align:right; color:#aaa">Kristoffer Dyrkorn, March 10, 2025</div>

# Rasterizing triangles using scanline conversion

<p align="center">
<img src="images/0-two-triangles.png" width="90%">
</p>

In an earlier article series, I have showed how to write a [fast and precise triangle rasterizer](/triangle-rasterizer). The algorithm described there was published by Juan Piñeda back in 1988. Today, it is still the preferred method for triangle rasterization - as it fits very well with the highly parallel hardware architectures of GPUs.

This time I would like to go through a different rasterization method, based on scanline conversion. This method is older than Piñeda's. The first published version came out in 1967, in the paper ["Half-tone perspective drawings by computer"](https://dl.acm.org/doi/pdf/10.1145/1465611.1465619) by Wylie et al. At that time (and until the mid 90's) 3D graphics was done on the CPU, and this meant that graphics code was optimized for single-threaded hardware.

Although the concepts will be explained in detail, it will be an advantage if you either have read the [previous article series](/triangle-rasterizer), or have some experience from writing graphics code. In a sense, this article series will extend the previous one.

The scanline rasterization method that we will go through here is not used that often, but it is still useful and relevant whenever your runtime environment is well suited for serial execution. And that is the case here: We will write the code in JavaScript and run it in the browser. Multithreaded code in the browser (via web workers) has too much overhead to be useful in this context.

This article series is structured as follows: First, you will get to know the basic principles behind the scanline conversion method - while we make a first, simple implementation of it. We then add various refinements to this implementation - and in the end we have a rather nice implementation. After that, we sum up and compate the two approaches.

Please note: The contents here is published under a Creative Commons [BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) license. In short, this means you are free to adapt and share the material as you want, as long as you don't make money by doing so, and as long as you give proper credit to the author.

As in the previous article series, the focus here will be on correctness and visual quality. We optimize for performance whenever possible.

## Sections

1. [An overview and a first implementation](1)
2. [Living on the edge](2)
3. [Faster horizontal lines](3)
4. [How to be smooth](4)
5. [Use the math, Luke](5)
6. [Epilogue](7)
