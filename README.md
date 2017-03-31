hdrpng.js
=========

A new high dynamic range image format ready for todays web.

* Smallest HDR format. 
* Native loading/decompressing by using the PNG format.
* Works in premultiplied alpha scenarios.
* HDR float range : 0.0000152587890625 to 32768. (7.875 bits mantissa, 5 bits shared exponent) 
* Efficient to render both on canvas and from webGL.

HDRPNG.js provides a minimal set of utilities to load, process, display and save High Dynamic Range image formats in the browser. It supports common HDR image formats, introduces a new web-friendly format that uses PNG as container and it provides basic tonemapping and exposure operators.

# Supported formats :

All supported formats can both be read and written by hdrpng.js

* .PFM (Portable Floatmap) [24b mantissa, 8b exponent]
* .HDR (Radiance .HDR files) [8b mantissa, 8b shared exponent]
* .HDR.PNG (HDR embedded in PNG) [7.875b mantissa, 5b shared exponent]

# Supported display options : 

* exposure control
* tonemapping (gamma, reinhardt, filmic)

# What is .PFM ?

PFM (Portable Float Map) files are HDR floating point image files that are saved with full 32 bits floating point precision per channel. A single pixel in a .PFM file takes up 96 bits. Portable Float Maps offer ultimate image precision at the cost of huge files. (a 2048*1024 pfm file is 24mb). PFM files can be saved by most HDR image applications like adobe's PhotoShop and Paul Debevec's HDRShop.

# What is .HDR ?

HDR (Radiance) files are HDR images that are stored using an internal 32 bit format called RGBE. Pixels are stored with an 8 bit mantissa per color channel and a shared 8 bit exponent. Radiance HDR files support RLE compression and are substantially smaller than their PFM counterparts. (A typical 2048*1024 .HDR file will range between 6mb and 8mb). Radiance HDR is the most commonly used format for High Dynamic Range images and all HDR applications are capable of saving .HDR files.

# What is .HDR.PNG ? 

.HDR.PNG is our in-house HDR file format. It is stored in a PNG container and consists of a modified RGBE pixel format that is safe when combined with 'premultiplied alpha'. It combines a 7.875 bit mantissa for each color component with a 5 bit exponent. (a 2048x1024 .hdr.png file is typically less than 4mb). HDR.PNG files can be saved using this library.

# Getting started .. 

tbc.
