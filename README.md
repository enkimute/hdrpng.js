HDRPNG
======

HDRPNG adds HDR Image support to your browser. It allows you to load industry standard Radiance .HDR files and PNG files containing RGBE information. (which can also be saved using hdrpng.js)

## Download

2972 bytes - <https://enkimute.github.io/hdrpng/hdrpng.min.js>

## Examples

<DIV ID="demo_hdr" STYLE="display:none">
  View this page on github pages to get live examples .. 
  
  https://enkimute.github.io/hdrpng
</DIV>
<SCRIPT SRC="hdrpng.js"></SCRIPT>
<SCRIPT>
  var $=document.getElementById.bind(document);
  var demo = $("demo_hdr");
  
  var myHDR = new HDRImage();
  myHDR.src = "memorial_mini.hdr.png";
  
  demo.innerHTML = 
    "You can drag and drop your own .HDR files on this page and save them as .HDR.PNG <BR><BR>"+
    "<A ID='hdrdl' HREF='memorial_mini.hdr.png' DOWNLOAD='memorial_mini.hdr.png'>save HDR PNG</A><BR><BR>"+
    "<INPUT TYPE='range' MIN=-8 MAX=8 STEP=0.1 VALUE=1 TITLE='Exposure' ONINPUT='myHDR.exposure=this.value'/> Exposure<BR>"+
    "<INPUT TYPE='range' MIN=0.5 MAX=3 STEP=0.1 VALUE=2.2 TITLE='Gamma' ONINPUT='myHDR.gamma=this.value' /> Gamma<BR>";
    
  $('hdrdl').style["-webkit-appearance"] = $('hdrdl').style['-moz-appearance'] = $('hdrdl').style.appearance = 'button';
  $('hdrdl').style.color = '#444';
  $('hdrdl').style.padding = '5px';
  $('hdrdl').style.textDecoration = 'none';
  demo.appendChild(myHDR);
  demo.style.display="block";
  demo.style.maxWidth='100%';
  window.ondragover = function(e) { e.preventDefault(); e.dataTransfer.dropEffect='link'; }
  window.ondrop = function(e) { 
    e.preventDefault(); e.stopPropagation(); 
    myHDR.src = URL.createObjectURL(e.dataTransfer.files[0])+'#'+e.dataTransfer.files[0].name; 
    $('hdrdl').href = myHDR.toHDRDataURL();
    $('hdrdl').download = e.dataTransfer.files[0].name.replace(/\.hdr$/i,'.hdr.png');
  }
  
  
</SCRIPT>



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
and in the shader
```glsl
  vec4 rgbe = texture2D(myHDR, texture_coords);
  rgbe.rgb *= pow(2,rgbe.a*255.0-128.0+8.0);
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

* .HDR (Radiance .HDR files)
* .HDR.PNG (HDR embedded in PNG) 

### why .HDR ?

* Industry standard HDR format.
* 32bit RGBE data while retaining excellent precision.

HDR (Radiance) files are HDR images that are stored using an internal 32 bit format called RGBE. Pixels are stored with an 8 bit mantissa per color channel and a shared 8 bit exponent. Radiance HDR files support RLE compression and are substantially smaller than their 96bits/pixel full float counterparts. (A typical 2048*1024 .HDR file will range between 6mb and 8mb). Radiance HDR is the most commonly used format for High Dynamic Range images. 

### why .HDR.PNG ? 

While HDR files are great, using them in a browser today comes at a cost. Compared to JPG's and PNG's that are loaded by optimised native code, we have to load HDR files and unpack them in javascript. HDRPNG.js also supports 32bit PNG files that contain the RGBE file format. They can be loaded with the native loader and unpacked in the shader for a javascript free HDR experience.

* Smallest HDR format.
* Native loading.
* Single multiply and pow in the shader to unpack.

Enjoy ;)

enki.
