HDRPNG
======

HDRPNG adds HDR Image support to your browser. It allows you to load industry standard Radiance .HDR files and a custom modified HDR.PNG format. The new format bypasses the problems with premultiplied alpha and png files to enable a full native HDR loader for webGL applications. (read more below the samples).

## Examples

See a live demo : http://jr.enki.ws/hdrtest.htm

#### Using HDR images in your HTML pages.

The HDRImage() constructor allows you to create a new HDR Image Element that can be used like an ordinary Image element. To load a HDR image, simply set the src attribute.

```html
<SCRIPT SRC="hdrpng.min.js"></SCRIPT>
```

```javascript
var myHDR = new HDRImage();
myHDR.src = 'memorial.hdr';
document.body.appendChild(myHDR);
```

#### Setting exposure and gamma. 

Once your HDRImage is created, use the exposure and gamma properties to control how it is displayed. 

```javascript
myHDR.exposure = 2.0;  // 1 stop up. 
myHDR.gamma = 1.0;     // display curve linear.      
```

#### Using HDR Images as textures.

HDRImage Objects can be used as textures in webGL in a couple of ways :
* as LDR images with the given exposure and gamma.
* as full floating point images (96 bits per pixel)
* as RGBE images to be decoded in the shader (32 bits per pixel)

In addition, the HDR.PNG format allows you to use HDR images in your webGL projects without using a javascript loader. The HDR.PNG images can simply be loaded by the build-in PNG loader, and decoded at minimal cost in the shader.

```javascript
var myHDR = new HDRImage();
myHDR.src = 'memorial.hdr.png';
myHDR.onload = function() {
// upload as LDR with current exposure/gamma
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, myHDR);  
// upload as full linear float  
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, a.width, a.height, 0, gl.RGB, gl.FLOAT, myHDR.dataFloat); 
}  
```
when uploading in the 32bit RGBE format, a single line of shader code will unpack your textures to the full range.

```javascript
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, a.width, a.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, myHDR.dataRGBE);
```
in the shader : 
```glsl
  vec4 rgbe = texture2D(myHDR, texture_coords);
  rgbe.rgb *= pow(2,rgbe.a*255.0-128.0+8.0);
```
#### Using .HDR.PNG files without software loader.

Once you saved your .HDR files as .HDR.PNG, you can use them in your webGL projects without hdrpng.js. They can be loaded like any other PNG file with transparency, and a single extra line in your shader will unpack them ..

Load as normal png with transparency.
```javascript
  var i = new Image(); // -> not HDRImage !!
  i.src = 'texture.HDR.PNG';
  ...
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, i);
```
and in the shader (not the same as above!!):
```glsl
  vec4 rgbf = texture2D(myHDR, texture_coords);
  rgbf.rgb *= 1.1434977578*pow(2,rgbf.a*255.0-232.0);
```
## Saving .HDR.PNG images

hdrpng.js can be used to convert Radiance .HDR files to the internal .HDR.PNG format.
```
  var myHDR = new HDRImage();
  myHDR.src = 'memorial.hdr';
  myHDR.onload = function() {
    var a = document.createElement('a');
    a.href = myHDR.toHDRDataURL();
    a.download = 'memorial.hdr.png';
    a.innerHTML = 'right click to save';
    document.body.appendChild(a); // or a.click()
  }
```

## Supported formats :

* .HDR (Radiance .HDR files) [8b mantissa, 8b shared exponent]
* .HDR.PNG (HDR embedded in PNG) [7.875b mantissa, 5b shared exponent]

### why .HDR ?

* Industry standard HDR format.
* 32bit RGBE data while retaining excellent precision.

HDR (Radiance) files are HDR images that are stored using an internal 32 bit format called RGBE. Pixels are stored with an 8 bit mantissa per color channel and a shared 8 bit exponent. Radiance HDR files support RLE compression and are substantially smaller than their 96bits/pixel full float counterparts. (A typical 2048*1024 .HDR file will range between 6mb and 8mb). Radiance HDR is the most commonly used format for High Dynamic Range images. 

### why .HDR.PNG ? 

While HDR files are great, using them in a browser today comes at a cost. Compared to JPG's and PNG's that are loaded by optimised native code, we have to load HDR files and unpack them in javascript.

With the RGBE format being a 32bit format, a png with transparency seems the ideal candidate to store RGBE images. This however fails. Modern browsers treat PNG images as premultiplied and will thus assume that none of the color values is greater than the alpha value. And by assume I mean make sure. 

So it seems impossible to store channels with a different meaning in the alpha channel of a png file. Our design works around this problem by reducing the size of the exponent to 5 bits, and always setting the upper 3 bits of the alpha value. This leaves 2^-7 to 2^24 as exponent (more than sufficient for any HDR images we've seen). The mantissa gets reduced by this operation to the 0-224 range. (or 7.875 bits). The result is a PNG file that does not get destroyed by the premultiplied-alpha assumptions, can be loaded with the native loader and gives you high dynamic range in your webGL projects with almost no extra cost. 

* Smallest HDR format.
* Native loading.
* Survives premultiplied alpha fixes.
* HDR float range : 0.0000152587890625 to 32768. (7.875 bits mantissa, 5 bits shared exponent) 
* Single multiply and pow in the shader to unpack.

Enjoy ;)

enki.
