var HDRImage = (function() {
  /**
   * HDRImage - wrapper that exposes default Image like interface for HDR imgaes. (till extending HTMLCanvasElement actually works ..)
   * @returns {HTMLCanvasElement} a html canvas element that has an "Image" like interface.
   * @example 
   *     var a = new HDRImage();
   *     a.src = "arches_2k.hdr.png";
   *     // or a.src = "arches_2k.hdr"; 
   *     document.body.appendChild(a);
   *     ..
   *     a.exposure = 2;
   *     a.gamma = 2.2;
   *     ..
   *     // webgl upload as LDR
   *     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, a);
   *
   *     // webgl upload as float HDR
   *     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, a.width, a.height, 0, gl.RGB, gl.FLOAT, a.dataFloat);
   *   
   *     // webgl upload as RGBE HDR
   *     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, a.width, a.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, a.dataRGBE);
   */
  function HDRImage() {
    var res = document.createElement('canvas'), HDRsrc='t',HDRexposure=1.0,HDRgamma=2.2,HDRdata=null,context,HDRD;
    res.__defineGetter__('exposure',function(){return HDRexposure});
    res.__defineSetter__('exposure',function(val){ HDRexposure=val; if (HDRdata) { rgbeToLDR(HDRdata,HDRexposure,HDRgamma,HDRD.data); context.putImageData(HDRD,0,0); }});
    res.__defineGetter__('gamma',function(){return HDRgamma});
    res.__defineSetter__('gamma',function(val){ HDRgamma=val; if (HDRdata) { rgbeToLDR(HDRdata,HDRexposure,HDRgamma,HDRD.data); context.putImageData(HDRD,0,0); }});
    res.__defineGetter__('dataFloat',function(){ return rgbeToFloat(HDRdata); });
    res.__defineGetter__('dataRGBE',function(){ return HDRdata; });
    res.__defineGetter__('src',function(){return HDRsrc});
    res.__defineSetter__('src',function(val){
      HDRsrc=val;
      context&&context.clearRect(0,0,this.width,this.height);
      if (val.match(/\.hdr$/i)) loadHDR(val,function(img,width,height){
        HDRdata = img;
        this.width = this.style.width = width;
        this.height = this.style.height = height;
        context = this.getContext('2d');
        HDRD = context.getImageData(0,0,width,height);
        rgbeToLDR(img,HDRexposure,HDRgamma,HDRD.data);
        context.putImageData(HDRD,0,0);
        this.onload&&this.onload(); 
      }.bind(res));
      else if (val.match(/\.hdr\.png$/i)) {
        var i = new Image();
        i.src = val;
        i.onload = function() {
          this.width  = this.style.width  = i.width;
          this.height = this.style.height = i.height;
          context = this.getContext('2d');
          context.globalCompositeOperation='copy';
          context.drawImage(i,0,0);
          HDRD = context.getImageData(0,0,this.width,this.height);
          HDRdata = rgbfToRgbe(HDRD.data);
          rgbeToLDR(HDRdata,HDRexposure,HDRgamma,HDRD.data);
          context.putImageData(HDRD,0,0);
          this.onload&&this.onload(); 
        }.bind(this);
      }
    });
    return res;
  }  
  
  function m(a,b) { for (var i in b) a[i]=b[i]; return a; };

  /** Load and parse a Radiance .HDR file. It completes with a 32bit RGBE buffer.
    * @param {URL} url location of .HDR file to load.
    * @param {function} completion completion callback.
    * @returns {XMLHttpRequest} the XMLHttpRequest used to download the file.
    */
  function loadHDR( url, completion ) {
    var req = m(new XMLHttpRequest(),{responseType:"arraybuffer"});
    req.onerror = completion.bind(req,false);
    req.onload  = function(e) {
      if (this.status>=400) return this.onerror();
      var header='',pos=0,d8=new Uint8Array(this.response),format;
    // read header.  
      while (!header.match(/\n\n[^\n]+\n/g)) header += String.fromCharCode(d8[pos++]);
    // check format. 
      format = header.match(/FORMAT=(.*)$/m)[1];
      if (format!='32-bit_rle_rgbe') return console.warn('unknown HDR format : '+format),this.onerror();
    // parse resolution
      var rez=header.split(/\n/).reverse()[1].split(' '), flipY=rez[0]=='-Y', width=rez[3]*1, height=rez[1]*1;
    // Create image.
      var img=new Uint8Array(width*height*4),ipos=0;
    // Read all scanlines
      for (var j=0; j<height; j++) {
        var rgbe=d8.slice(pos,pos+=4),scanline=[];
        if ((rgbe[0]!=2)||(rgbe[1]!=2)||(rgbe[2]&0x80)) return console.warn('HDR not rle encoded while it should be ..'),this.onerror();
        if (rgbe[2]<<8+rgbe[3]!=width) return console.warn('HDR with invalid scanline length ..'),this.onerror();
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
  
  /** Convert an RGBE buffer to a RGBF buffer
    * @param {Uint8Array} buffer The input buffer in RGBE format. (as returned from loadHDR)
    * @param {Uint8Array} [res] Optional result buffer containing the modified RGBF values (premultiply safe).
    * @returns {Uint8Array} buffer with premultiply safe RGBF values.
    */
  function rgbeToRgbf(buffer,res) {
    var l=buffer.byteLength>>2, res=res||new Uint8ClampedArray(l*4);
    for (var i=0;i<l;i++) {
      res[i*4]    = buffer[i*4]*223/255;
      res[i*4+1]  = buffer[i*4+1]*223/255;
      res[i*4+2]  = buffer[i*4+2]*223/255;
      res[i*4+3]  = 224 + Math.min(31,Math.max(0,buffer[i*4+3]-128+16));
    }
    return res;
  }
  
  /** Convert an RGBF buffor to an RGBE buffer.
    * @param {Uint8Array} buffer The input buffer in RGBF format. (as returned from loadHDRPNG)
    * @param {Uint8Array} [res] Optional result buffer containing the modified RGBE values.
    */                           
  function rgbfToRgbe(buffer,res) {
    var l=buffer.byteLength>>2, res=res||new Uint8ClampedArray(l*4);
    for (var i=0;i<l;i++) {
      res[i*4]    = buffer[i*4]*255/223;
      res[i*4+1]  = buffer[i*4+1]*255/223;
      res[i*4+2]  = buffer[i*4+2]*255/223;
      res[i*4+3]  = (buffer[i*4+3]&31)-16+128;
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
  
  HDRImage.loadHDR = loadHDR;
  HDRImage.rgbeToFloat = rgbeToFloat;
  HDRImage.rgbeToLDR = rgbeToLDR;
  return HDRImage;
})();
