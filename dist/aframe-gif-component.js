/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _gifsparser = __webpack_require__(1);

	if (typeof AFRAME === 'undefined') {
	  throw 'Component attempted to register before AFRAME was available.';
	}

	/* get util from AFRAME */
	var parseUrl = AFRAME.utils.srcLoader.parseUrl;
	var debug = AFRAME.utils.debug;
	// debug.enable('shader:gif:*')

	debug.enable('shader:gif:warn');
	var warn = debug('shader:gif:warn');
	var log = debug('shader:gif:debug');

	/* store data so that you won't load same data */
	var gifData = {};

	/* create error message */
	function createError(err, src) {
	  return { status: 'error', src: src, message: err, timestamp: Date.now() };
	}

	AFRAME.registerShader('gif', {

	  /**
	   * For material component:
	   * @see https://github.com/aframevr/aframe/blob/60d198ef8e2bfbc57a13511ae5fca7b62e01691b/src/components/material.js
	   * For example of `registerShader`:
	   * @see https://github.com/aframevr/aframe/blob/41a50cd5ac65e462120ecc2e5091f5daefe3bd1e/src/shaders/flat.js
	   * For MeshBasicMaterial
	   * @see http://threejs.org/docs/#Reference/Materials/MeshBasicMaterial
	   */
	  schema: {

	    /* For material */
	    color: { type: 'color' },
	    fog: { default: true },

	    /* For texuture */
	    src: { default: null },
	    autoplay: { default: true }

	  },

	  /**
	   * Initialize material. Called once.
	   * @protected
	   */
	  init: function init(data) {
	    log('init', data);
	    log(this.el.components);
	    this.__cnv = document.createElement('canvas');
	    this.__cnv.width = 2;
	    this.__cnv.height = 2;
	    this.__ctx = this.__cnv.getContext('2d');
	    this.__texture = new THREE.Texture(this.__cnv); //renders straight from a canvas
	    if (data.repeat) {
	      this.__texture.wrapS = THREE.RepeatWrapping;
	      this.__texture.wrapT = THREE.RepeatWrapping;
	      this.__texture.repeat.set(data.repeat.x, data.repeat.y);
	    }
	    this.__material = {};
	    this.__reset();
	    this.material = new THREE.MeshBasicMaterial({ map: this.__texture });
	    this.el.sceneEl.addBehavior(this);
	    return this.material;
	  },


	  /**
	   * Update or create material.
	   * @param {object|null} oldData
	   */
	  update: function update(oldData) {
	    log('update', oldData);
	    this.__updateMaterial(oldData);
	    this.__updateTexture(oldData);
	    return this.material;
	  },


	  /**
	   * Called on each scene tick.
	   * @protected
	   */
	  tick: function tick(t) {
	    if (!this.__frames || this.paused()) return;
	    if (Date.now() - this.__startTime >= this.__nextFrameTime) {
	      this.nextFrame();
	    }
	  },


	  /*================================
	  =            material            =
	  ================================*/

	  /**
	   * Updating existing material.
	   * @param {object} data - Material component data.
	   */
	  __updateMaterial: function __updateMaterial(data) {
	    var material = this.material;

	    var newData = this.__getMaterialData(data);
	    Object.keys(newData).forEach(function (key) {
	      material[key] = newData[key];
	    });
	  },


	  /**
	   * Builds and normalize material data, normalizing stuff along the way.
	   * @param {Object} data - Material data.
	   * @return {Object} data - Processed material data.
	   */
	  __getMaterialData: function __getMaterialData(data) {
	    return {
	      fog: data.fog,
	      color: new THREE.Color(data.color)
	    };
	  },


	  /*==============================
	  =            texure            =
	  ==============================*/

	  /**
	   * set texure
	   * @private
	   * @param {Object} data
	   * @property {string} status - success / error
	   * @property {string} src - src url
	   * @property {array} times - array of time length of each image
	   * @property {number} cnt - total counts of gif images
	   * @property {array} frames - array of each image
	   * @property {Date} timestamp - created at the texure
	   */

	  __setTexure: function __setTexure(data) {
	    log('__setTexure', data);
	    if (data.status === 'error') {
	      warn('Error: ' + data.message + '\nsrc: ' + data.src);
	      this.__reset();
	    } else if (data.status === 'success' && data.src !== this.__textureSrc) {
	      this.__reset();
	      /* Texture added or changed */
	      this.__ready(data);
	    }
	  },


	  /**
	   * Update or create texure.
	   * @param {Object} data - Material component data.
	   */
	  __updateTexture: function __updateTexture(data) {
	    var src = data.src,
	        autoplay = data.autoplay;

	    /* autoplay */

	    if (typeof autoplay === 'boolean') {
	      this.__autoplay = autoplay;
	    } else if (typeof autoplay === 'undefined') {
	      this.__autoplay = true;
	    }
	    if (this.__autoplay && this.__frames) {
	      this.play();
	    }

	    /* src */
	    if (src) {
	      this.__validateSrc(src, this.__setTexure.bind(this));
	    } else {
	      /* Texture removed */
	      this.__reset();
	    }
	  },


	  /*=============================================
	  =            varidation for texure            =
	  =============================================*/

	  __validateSrc: function __validateSrc(src, cb) {

	    /* check if src is a url */
	    var url = parseUrl(src);
	    if (url) {
	      this.__getImageSrc(url, cb);
	      return;
	    }

	    var message = void 0;

	    /* check if src is a query selector */
	    var el = this.__validateAndGetQuerySelector(src);
	    if (!el || (typeof el === 'undefined' ? 'undefined' : _typeof(el)) !== 'object') {
	      return;
	    }
	    if (el.error) {
	      message = el.error;
	    } else {
	      var tagName = el.tagName.toLowerCase();
	      if (tagName === 'video') {
	        src = el.src;
	        message = 'For video, please use `aframe-video-shader`';
	      } else if (tagName === 'img') {
	        this.__getImageSrc(el.src, cb);
	        return;
	      } else {
	        message = 'For <' + tagName + '> element, please use `aframe-html-shader`';
	      }
	    }

	    /* if there is message, create error data */
	    if (message) {
	      var srcData = gifData[src];
	      var errData = createError(message, src);
	      /* callbacks */
	      if (srcData && srcData.callbacks) {
	        srcData.callbacks.forEach(function (cb) {
	          return cb(errData);
	        });
	      } else {
	        cb(errData);
	      }
	      /* overwrite */
	      gifData[src] = errData;
	    }
	  },


	  /**
	   * Validate src is a valid image url
	   * @param  {string} src - url that will be tested
	   * @param  {function} cb - callback with the test result
	   */
	  __getImageSrc: function __getImageSrc(src, cb) {
	    var _this = this;

	    /* if src is same as previous, ignore this */
	    if (src === this.__textureSrc) {
	      return;
	    }

	    /* check if we already get the srcData */
	    var srcData = gifData[src];
	    if (!srcData || !srcData.callbacks) {
	      /* create callback */
	      srcData = gifData[src] = { callbacks: [] };
	      srcData.callbacks.push(cb);
	    } else if (srcData.src) {
	      cb(srcData);
	      return;
	    } else if (srcData.callbacks) {
	      /* add callback */
	      srcData.callbacks.push(cb);
	      return;
	    }
	    var tester = new Image();
	    tester.crossOrigin = 'Anonymous';
	    tester.addEventListener('load', function (e) {
	      /* check if it is gif */
	      _this.__getUnit8Array(src, function (arr) {
	        if (!arr) {
	          onError('This is not gif. Please use `shader:flat` instead');
	          return;
	        }
	        /* parse data */
	        (0, _gifsparser.parseGIF)(arr, function (times, cnt, frames) {
	          /* store data */
	          var newData = { status: 'success', src: src, times: times, cnt: cnt, frames: frames, timestamp: Date.now()
	            /* callbacks */
	          };if (srcData.callbacks) {
	            srcData.callbacks.forEach(function (cb) {
	              return cb(newData);
	            });
	            /* overwrite */
	            gifData[src] = newData;
	          }
	        }, function (err) {
	          return onError(err);
	        });
	      });
	    });
	    tester.addEventListener('error', function (e) {
	      return onError('Could be the following issue\n - Not Image\n - Not Found\n - Server Error\n - Cross-Origin Issue');
	    });
	    function onError(message) {
	      /* create error data */
	      var errData = createError(message, src);
	      /* callbacks */
	      if (srcData.callbacks) {
	        srcData.callbacks.forEach(function (cb) {
	          return cb(errData);
	        });
	        /* overwrite */
	        gifData[src] = errData;
	      }
	    }
	    tester.src = src;
	  },


	  /**
	   *
	   * get mine type
	   *
	   */
	  __getUnit8Array: function __getUnit8Array(src, cb) {
	    if (typeof cb !== 'function') {
	      return;
	    }

	    var xhr = new XMLHttpRequest();
	    xhr.open('GET', src);
	    xhr.responseType = 'arraybuffer';
	    xhr.addEventListener('load', function (e) {
	      var uint8Array = new Uint8Array(e.target.response);
	      var arr = uint8Array.subarray(0, 4);
	      // const header = arr.map(value => value.toString(16)).join('')
	      var header = '';
	      for (var i = 0; i < arr.length; i++) {
	        header += arr[i].toString(16);
	      }
	      if (header === '47494638') {
	        cb(uint8Array);
	      } else {
	        cb();
	      }
	    });
	    xhr.addEventListener('error', function (e) {
	      log(e);
	      cb();
	    });
	    xhr.send();
	  },


	  /**
	   * Query and validate a query selector,
	   *
	   * @param  {string} selector - DOM selector.
	   * @return {object} Selected DOM element | error message object.
	   */
	  __validateAndGetQuerySelector: function __validateAndGetQuerySelector(selector) {
	    try {
	      var el = document.querySelector(selector);
	      if (!el) {
	        return { error: 'No element was found matching the selector' };
	      }
	      return el;
	    } catch (e) {
	      // Capture exception if it's not a valid selector.
	      return { error: 'no valid selector' };
	    }
	  },


	  /*================================
	  =            playback            =
	  ================================*/

	  /**
	   * Pause gif
	   * @public
	   */
	  pause: function pause() {
	    log('pause');
	    this.__paused = true;
	  },


	  /**
	   * Play gif
	   * @public
	   */
	  play: function play() {
	    log('play');
	    this.__paused = false;
	  },


	  /**
	   * Toggle playback. play if paused and pause if played.
	   * @public
	   */

	  togglePlayback: function togglePlayback() {

	    if (this.paused()) {
	      this.play();
	    } else {
	      this.pause();
	    }
	  },


	  /**
	   * Return if the playback is paused.
	   * @public
	   * @return {boolean}
	   */
	  paused: function paused() {
	    return this.__paused;
	  },


	  /**
	   * Go to next frame
	   * @public
	   */
	  nextFrame: function nextFrame() {
	    this.__draw();

	    /* update next frame time */
	    while (Date.now() - this.__startTime >= this.__nextFrameTime) {

	      this.__nextFrameTime += this.__delayTimes[this.__frameIdx++];
	      if ((this.__infinity || this.__loopCnt) && this.__frameCnt <= this.__frameIdx) {
	        /* go back to the first */
	        this.__frameIdx = 0;
	      }
	    }
	  },


	  /*==============================
	   =            canvas            =
	   ==============================*/

	  /**
	   * clear canvas
	   * @private
	   */
	  __clearCanvas: function __clearCanvas() {
	    this.__ctx.clearRect(0, 0, this.__width, this.__height);
	    this.__texture.needsUpdate = true;
	  },


	  /**
	   * draw
	   * @private
	   */
	  __draw: function __draw() {
	    if (this.__frameIdx != 0) {
	      var lastFrame = this.__frames[this.__frameIdx - 1];
	      // Disposal method indicates if you should clear or not the background.
	      // This flag is represented in binary and is a packed field which can also represent transparency.
	      // http://matthewflickinger.com/lab/whatsinagif/animation_and_transparency.asp
	      if (lastFrame.disposalMethod == 8 || lastFrame.disposalMethod == 9) {
	        this.__clearCanvas();
	      }
	    } else {
	      this.__clearCanvas();
	    }
	    var actualFrame = this.__frames[this.__frameIdx];
	    if (typeof actualFrame !== 'undefined') {
	      this.__ctx.drawImage(actualFrame, 0, 0, this.__width, this.__height);
	      this.__texture.needsUpdate = true;
	    }
	  },


	  /*============================
	  =            ready            =
	  ============================*/

	  /**
	   * setup gif animation and play if autoplay is true
	   * @private
	   * @property {string} src - src url
	   * @param {array} times - array of time length of each image
	   * @param {number} cnt - total counts of gif images
	   * @param {array} frames - array of each image
	   */
	  __ready: function __ready(_ref) {
	    var src = _ref.src,
	        times = _ref.times,
	        cnt = _ref.cnt,
	        frames = _ref.frames;

	    log('__ready');
	    this.__textureSrc = src;
	    this.__delayTimes = times;
	    cnt ? this.__loopCnt = cnt : this.__infinity = true;
	    this.__frames = frames;
	    this.__frameCnt = times.length;
	    this.__startTime = Date.now();
	    this.__width = THREE.Math.floorPowerOfTwo(frames[0].width);
	    this.__height = THREE.Math.floorPowerOfTwo(frames[0].height);
	    this.__cnv.width = this.__width;
	    this.__cnv.height = this.__height;
	    this.__draw();
	    if (this.__autoplay) {
	      this.play();
	    } else {
	      this.pause();
	    }
	  },


	  /*=============================
	  =            reset            =
	  =============================*/
	  /**
	   * @private
	   */
	  __reset: function __reset() {
	    this.pause();
	    this.__clearCanvas();
	    this.__startTime = 0;
	    this.__nextFrameTime = 0;
	    this.__frameIdx = 0;
	    this.__frameCnt = 0;
	    this.__delayTimes = null;
	    this.__infinity = false;
	    this.__loopCnt = 0;
	    this.__frames = null;
	    this.__textureSrc = null;
	  }
	});

/***/ }),
/* 1 */
/***/ (function(module, exports) {

	'use strict';

	/**
	 * 
	 * Gif parser by @gtk2k
	 * https://github.com/gtk2k/gtk2k.github.io/tree/master/animation_gif
	 *
	 */

	exports.parseGIF = function (gif, successCB, errorCB) {

	  var pos = 0;
	  var delayTimes = [];
	  var loadCnt = 0;
	  var graphicControl = null;
	  var imageData = null;
	  var frames = [];
	  var loopCnt = 0;
	  if (gif[0] === 0x47 && gif[1] === 0x49 && gif[2] === 0x46 && // 'GIF'
	  gif[3] === 0x38 && gif[4] === 0x39 && gif[5] === 0x61) {
	    // '89a'
	    pos += 13 + +!!(gif[10] & 0x80) * Math.pow(2, (gif[10] & 0x07) + 1) * 3;
	    var gifHeader = gif.subarray(0, pos);
	    while (gif[pos] && gif[pos] !== 0x3b) {
	      var offset = pos,
	          blockId = gif[pos];
	      if (blockId === 0x21) {
	        var label = gif[++pos];
	        if ([0x01, 0xfe, 0xf9, 0xff].indexOf(label) !== -1) {
	          label === 0xf9 && delayTimes.push((gif[pos + 3] + (gif[pos + 4] << 8)) * 10);
	          label === 0xff && (loopCnt = gif[pos + 15] + (gif[pos + 16] << 8));
	          while (gif[++pos]) {
	            pos += gif[pos];
	          }label === 0xf9 && (graphicControl = gif.subarray(offset, pos + 1));
	        } else {
	          errorCB && errorCB('parseGIF: unknown label');break;
	        }
	      } else if (blockId === 0x2c) {
	        pos += 9;
	        pos += 1 + +!!(gif[pos] & 0x80) * (Math.pow(2, (gif[pos] & 0x07) + 1) * 3);
	        while (gif[++pos]) {
	          pos += gif[pos];
	        }var imageData = gif.subarray(offset, pos + 1);
	        // Each frame should have an image and a flag to indicate how to dispose it.
	        var frame = {
	          // http://matthewflickinger.com/lab/whatsinagif/animation_and_transparency.asp
	          // Disposal method is a flag stored in the 3rd byte of the graphics control
	          // This byte is packed and stores more information, only 3 bits of it represent the disposal
	          disposalMethod: graphicControl[3],
	          blob: URL.createObjectURL(new Blob([gifHeader, graphicControl, imageData]))
	        };
	        frames.push(frame);
	      } else {
	        errorCB && errorCB('parseGIF: unknown blockId');break;
	      }
	      pos++;
	    }
	  } else {
	    errorCB && errorCB('parseGIF: no GIF89a');
	  }
	  if (frames.length) {

	    var cnv = document.createElement('canvas');
	    var loadImg = function loadImg() {
	      for (var i = 0; i < frames.length; i++) {
	        var img = new Image();
	        img.onload = function (e, i) {
	          if (i === 0) {
	            cnv.width = img.width;
	            cnv.height = img.height;
	          }
	          loadCnt++;
	          frames[i] = this;
	          if (loadCnt === frames.length) {
	            loadCnt = 0;
	            imageFix(1);
	          }
	        }.bind(img, null, i);
	        // Link html image tag with the extracted GIF Frame 
	        img.src = frames[i].blob;
	        img.disposalMethod = frames[i].disposalMethod;
	      }
	    };
	    var imageFix = function imageFix(i) {
	      var img = new Image();
	      img.onload = function (e, i) {
	        loadCnt++;
	        frames[i] = this;
	        if (loadCnt === frames.length) {
	          cnv = null;
	          successCB && successCB(delayTimes, loopCnt, frames);
	        } else {
	          imageFix(++i);
	        }
	      }.bind(img);
	      img.src = cnv.toDataURL('image/gif');
	    };
	    loadImg();
	  }
	};

/***/ })
/******/ ]);