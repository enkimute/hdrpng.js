/**
 * hdrpng.js - support for Radiance .HDR and RGBE images in PNG.
 * @author Enki
 * @desc Exposes a HDRImage interface that allows you to load .HDR files or PNG's with RGBE info and use them in HTML and webGL. It also allows you to save those PNG's. 
 */
(function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition();
  else if (typeof define == 'function' && define.amd) define(name, definition);
  else context[name] = definition();
}('HDRImage', this, function () {
  /**
   * HDRImage - wrapper that exposes default Image like interface for HDR imgaes. (till extending HTMLCanvasElement actually works ..)
   * @returns {HDRImage} a html HDR image element
   */
  function HDRImage() {
    var res = document.createElement('canvas'), HDRsrc='t',HDRexposure=1.0,HDRgamma=2.2,HDRdata=null,context,HDRD;
    res.__defineGetter__('exposure',function(){return HDRexposure});
    res.__defineSetter__('exposure',function(val){ HDRexposure=val; if (HDRdata) { rgbeToLDR(HDRdata,HDRexposure,HDRgamma,HDRD.data); context.putImageData(HDRD,0,0); }});
    res.__defineGetter__('gamma',function(){return HDRgamma});
    res.__defineSetter__('gamma',function(val){ HDRgamma=val; if (HDRdata) { rgbeToLDR(HDRdata,HDRexposure,HDRgamma,HDRD.data); context.putImageData(HDRD,0,0); }});
    res.__defineGetter__('dataFloat',function(){ return rgbeToFloat(HDRdata); });
    res.__defineGetter__('dataRGBE',function(){ return HDRdata; });
    res.toHDRBlob = function(cb,m,q) {
      // Array to image.. slightly more involved.  
        function createShader(gl, source, type) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        }
        function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
            var program = gl.createProgram();
            gl.attachShader(program, createShader(gl, vertexShaderSource, gl.VERTEX_SHADER));
            gl.attachShader(program, createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER));
            gl.linkProgram(program);
            return program;
        };
        var ar = new Uint8Array(HDRdata.buffer);
        var vs2='precision highp float;\nattribute vec3 position;\nvarying vec2 tex;\nvoid main() { tex = position.xy/2.0+0.5; gl_Position = vec4(position, 1.0); }';
        var fs2='precision highp float;\nprecision highp sampler2D;\nuniform sampler2D tx;\nvarying vec2 tex;\nvoid main() { gl_FragColor = texture2D(tx,tex); }';
        var x = this.width, y = this.height;
        if (x*y*4 < ar.byteLength) return console.error('not big enough.');
        var c = document.createElement('canvas');
        c.width=x; c.height=y;
        var gl = c.getContext('webgl',{antialias:false,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});

        var texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);  gl.bindTexture(gl.TEXTURE_2D, texture);  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, x, y, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(ar.buffer));

        var program2 = createProgram(gl, vs2, fs2), uniformTexLocation = gl.getUniformLocation(program2, 'tx');

        var positions = new Float32Array([-1, -1, 0, 1, -1, 0, 1,  1, 0, 1,  1, 0, -1,  1, 0, -1, -1, 0 ]), vertexPosBuffer=gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
       
        gl.enableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        gl.useProgram(program2);
        gl.uniform1i(uniformTexLocation, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (cb) return c.toBlob(cb); 
    }
    res.__defineGetter__('src',function(){return HDRsrc});
    res.__defineSetter__('src',function(val){
      HDRsrc=val;
      context&&context.clearRect(0,0,this.width,this.height);
      if (val.match(/\.hdr$/i)) loadHDR(val,function(img,width,height){
        HDRdata = img;
        this.width  = this.style.width  = width;
        this.height = this.style.height = height;
        context = this.getContext('2d');
        HDRD = context.getImageData(0,0,width,height);
        rgbeToLDR(img,HDRexposure,HDRgamma,HDRD.data);
        context.putImageData(HDRD,0,0);
        this.onload&&this.onload(); 
      }.bind(res));
      else if (val.match(/\.exr$/i)) loadEXR(val,function(img,width,height){
        console.log('exr load : ', img, width, height);
        this.onload&&this.onload();
      }.bind(res));
      else if (val.match(/\.hdr\.png$/i)) {
        var i = new Image();
        i.src = val;
        i.onload = function() {
          var c = document.createElement('canvas'), x=this.width=this.style.width=c.width=i.width, y=this.height=this.style.height=c.height=i.height, gl=c.getContext('webgl');

          var texture = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, i);
           
          fb = gl.createFramebuffer();
          gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
          gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

          var res = new Uint8Array(x*y*4);
          gl.readPixels(0,0,x,y,gl.RGBA,gl.UNSIGNED_BYTE,res);

          gl.deleteTexture(texture);
          gl.deleteFramebuffer(fb);
          
          HDRdata = res;
          context = this.getContext('2d');
          HDRD = context.getImageData(0,0,x,y);
          rgbeToLDR(HDRdata,HDRexposure,HDRgamma,HDRD.data);
          context.putImageData(HDRD,0,0);
          this.onload&&this.onload(); 
        }.bind(res);
      }
    });
    return res;
  }  
  
  function m(a,b) { for (var i in b) a[i]=b[i]; return a; };

  /** Load and parse a ILM EXR file.
    * .. tbc .. port tinyEXR pif support ? 
    */
  function loadEXR( url, completion ) {
    var req = m(new XMLHttpRequest(),{responseType:"arraybuffer"});
    req.onerror = completion.bind(req,false);
    req.onload  = function() {
      var pos=0,d8=new Uint8Array(this.response);
      
      // helpers.
      function u32() { return (d8[pos++]<<0)+(d8[pos++]<<8)+(d8[pos++]<<16)+(d8[pos++]<<24); };
      function u24() { return (d8[pos++]<<0)+(d8[pos++]<<8)+(d8[pos++]<<16); };
      function u16() { return (d8[pos++]<<0)+(d8[pos++]<<8); };
      function u8()  { return d8[pos++]; };
      function s()   { var ret='',cur; while (cur=u8()) ret+=String.fromCharCode(cur); return ret; }; 
      
      // header, version, flags checks.
      if (u32() != 20000630) return console.log('EXR invalid'),this.onerror();
      if (u8() > 2)          return console.log('EXR unsupported version'),this.onerror();
      if (u24() != 0)        return console.log('EXR only simple files ..'),this.onerror();
      
      // parse header.
      if (s() != 'channels' || s() != 'chlist') return console.log('EXR invalid headers'),this.onerror();
      var channels = [], pos2 = u32()+pos;
      while (pos < pos2-1) channels.push({name:s(),type:u32(),u0:u8(),u1:u24(),u2:u32(),u2:u32()}); u8();
      if (s() != 'compression' || s() != 'compression') return console.log('EXR only simple files ..'),this.onerror();
      console.log(u32(),u8());
      if (u32(),u8()) return console.log('EXR compression not supported'),this.onerror();


      completion&&completion();
      
    }
    req.open("GET",url,true);
    req.send(null);
    return req;
  }  
    
    
  /** Load and parse a Radiance .HDR file. It completes with a 32bit RGBE buffer.
    * @param {URL} url location of .HDR file to load.
    * @param {function} completion completion callback.
    * @returns {XMLHttpRequest} the XMLHttpRequest used to download the file.
    */
  function loadHDR( url, completion ) {
    var req = m(new XMLHttpRequest(),{responseType:"arraybuffer"});
    req.onerror = completion.bind(req,false);
    req.onload  = function() {
      if (this.status>=400) return this.onerror();
      var header='',pos=0,d8=new Uint8Array(this.response),format;
    // read header.  
      while (!header.match(/\n\n[^\n]+\n/g)) header += String.fromCharCode(d8[pos++]);
    // check format. 
      format = header.match(/FORMAT=(.*)$/m)[1];
      if (format!='32-bit_rle_rgbe') return console.warn('unknown format : '+format),this.onerror();
    // parse resolution
      var rez=header.split(/\n/).reverse()[1].split(' '), width=rez[3]*1, height=rez[1]*1;
    // Create image.
      var img=new Uint8Array(width*height*4),ipos=0;
    // Read all scanlines
      for (var j=0; j<height; j++) {
        var rgbe=d8.slice(pos,pos+=4),scanline=[];
        if ((rgbe[0]!=2)||(rgbe[1]!=2)||(rgbe[2]&0x80)) return console.warn('HDR parse error ..'),this.onerror();
        if ((rgbe[2]<<8)+rgbe[3]!=width) return console.warn('HDR line mismatch ..'),this.onerror();
        for (var i=0;i<4;i++) {
            var ptr=i*width,ptr_end=(i+1)*width,buf,count;
            while (ptr<ptr_end){
                buf = d8.slice(pos,pos+=2);
                if (buf[0] > 128) { count = buf[0]-128; while(count-- > 0) scanline[ptr++] = buf[1]; } 
                             else { count = buf[0]-1; scanline[ptr++]=buf[1]; while(count-->0) scanline[ptr++]=d8[pos++]; }
            }
        }
        for (var i=0;i<width;i++) { img[ipos++]=scanline[i]; img[ipos++]=scanline[i+width]; img[ipos++]=scanline[i+2*width]; img[ipos++]=scanline[i+3*width]; }
      }
      completion&&completion(img,width,height);
    }
    req.open("GET",url,true);
    req.send(null);
    return req;
  }
  
  /** Convert an RGBE buffer to a Float buffer.
    * @param {Uint8Array} buffer The input buffer in RGBE format. (as returned from loadHDR)
    * @param {Float32Array} [res] Optional result buffer containing 3 floats per pixel.
    * @returns {Float32Array} A floating point buffer with 96 bits per pixel (32 per channel, 3 channels).
    */
  function rgbeToFloat(buffer,res) {
    var s,l=buffer.byteLength>>2, res=res||new Float32Array(l*3);
    for (var i=0;i<l;i++) {
      s = Math.pow(2,buffer[i*4+3]-(128+8));
      res[i*3]=buffer[i*4]*s;
      res[i*3+1]=buffer[i*4+1]*s;
      res[i*3+2]=buffer[i*4+2]*s;
    }
    return res;
  }
  
  /** Convert an RGBE buffer to LDR with given exposure and display gamma.
    * @param {Uint8Array} buffer The input buffer in RGBE format. (as returned from loadHDR)
    * @param {float} [exposure=1] Optional exposure value. (1=default, 2=1 step up, 3=2 steps up, -2 = 3 steps down)
    * @param {float} [gamma=2.2]  Optional display gamma to respect. (1.0 = linear, 2.2 = default monitor)
    * @param {Array} [res] res Optional result buffer.
    */
  function rgbeToLDR(buffer,exposure,gamma,res) {
    exposure = Math.pow(2,exposure===undefined?1:exposure)/2;
    if (gamma===undefined) gamma = 2.2;
    var one_over_gamma=1/gamma,s,l=buffer.byteLength>>2, res=res||new Uint8ClampedArray(l*4);
    for (var i=0;i<l;i++) {
      s = exposure * Math.pow(2,buffer[i*4+3]-(128+8));
      res[i*4]  =255*Math.pow(buffer[i*4]*s,one_over_gamma);
      res[i*4+1]=255*Math.pow(buffer[i*4+1]*s,one_over_gamma);
      res[i*4+2]=255*Math.pow(buffer[i*4+2]*s,one_over_gamma);
      res[i*4+3]=255;
    }
    return res;
  }
  
  return HDRImage;
}));
