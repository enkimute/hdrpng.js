hdrpng.js
=========

HDR Image handling for the web with support for Radiance .HDR files and a custom modified HDR.PNG format.

* Smallest HDR format. 
* Native loading/decompressing by using the PNG format.
* Works in premultiplied alpha scenarios.
* HDR float range : 0.0000152587890625 to 32768. (7.875 bits mantissa, 5 bits shared exponent) 
* Efficient to render both on canvas and from webGL.

HDRPNG.js adds HDR image support to your browser. It integrates smoothly in both HTML and webGL use scenarios.

## Loading, displaying and using .HDR images

#### The HDRImage constructor can be used to load HDR images just like the Image constructor is used for LDR images.

```javascript
var myHDR = new HDRImage();
myHDR.src = 'memorial.hdr';
document.body.appendChild(myHDR);
```

#### Exposure (in stops) and Gamma (as exponent) can be adjusted before or after loading.

```javascript
myHDR.exposure = 2.0;  // 1 stop up. 
myHDR.gamma = 1.0;     // display curve linear.      
```

#### HDRImages can be used as sources for texImage calls.

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

#### HDRImages can be uploaded in RGBE format to be decoded in the shader.

```javascript
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, a.width, a.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, myHDR.dataRGBE);
```
in the shader : 
```glsl
  vec4 rgbe = texture2D(myHDR, texture_coords);
  rgbe.rgb *= pow(2,rgbe.a*255.0-128.0+8.0);
```
#### When your HDR's are saved as .HDR.PNG you can use them directly in your current LDR workflow and unpack in the shader.

Load as normal png with transparency.
```javascript
  var i = new Image();
  i.src = 'texture.HDR.PNG';
  ...
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, i);
```
and in the shader (not the same as above!!):
```
  vec4 rgbf = texture2D(myHDR, texture_coords);
  rgbf.rgb *= pow(2,rgbf.a*255.0-232.0);
```

## Supported formats :

* .HDR (Radiance .HDR files) [8b mantissa, 8b shared exponent]
* .HDR.PNG (HDR embedded in PNG) [7.875b mantissa, 5b shared exponent]

### What is .HDR ?

HDR (Radiance) files are HDR images that are stored using an internal 32 bit format called RGBE. Pixels are stored with an 8 bit mantissa per color channel and a shared 8 bit exponent. Radiance HDR files support RLE compression and are substantially smaller than their PFM counterparts. (A typical 2048*1024 .HDR file will range between 6mb and 8mb). Radiance HDR is the most commonly used format for High Dynamic Range images and all HDR applications are capable of saving .HDR files.

### What is .HDR.PNG ? 

.HDR.PNG is our in-house HDR file format. It is stored in a PNG container and consists of a modified RGBE pixel format that is safe when combined with 'premultiplied alpha'. It combines a 7.875 bit mantissa for each color component with a 5 bit exponent. (a 2048x1024 .hdr.png file is typically less than 4mb). HDR.PNG files can be saved using this library.

## Samples .. 

Check this page to see it in action and convert your HDR files to .HDR.PNG

(http://jr.enki.ws/hdrtest.htm hdr example)


