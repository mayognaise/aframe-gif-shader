import { parseGIF } from './lib/gifsparser'

if (typeof AFRAME === 'undefined') {
  throw 'Component attempted to register before AFRAME was available.'
}

/* get util from AFRAME */
const { parseUrl } = AFRAME.utils.srcLoader
const { debug } = AFRAME.utils
// debug.enable('shader:gif:*')
debug.enable('shader:gif:warn')
const warn = debug('shader:gif:warn')
const log = debug('shader:gif:debug')

/* store data so that you won't load same data */
const gifData = {}

/* create error message */
function createError (err, src) {
  return { status: 'error', src: src, message: err, timestamp: Date.now() }
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
    autoplay: { default: true },

  },

  /**
   * Initialize material. Called once.
   * @protected
   */
  init (data) {
    log('init', data)
    log(this.el.components)
    this.__cnv = document.createElement('canvas')
    this.__cnv.width = 2
    this.__cnv.height = 2
    this.__ctx = this.__cnv.getContext('2d')
    this.__texture = new THREE.Texture(this.__cnv) //renders straight from a canvas
    if (data.repeat) {
      this.__texture.wrapS = THREE.RepeatWrapping;
      this.__texture.wrapT = THREE.RepeatWrapping;
      this.__texture.repeat.set( data.repeat.x, data.repeat.y );
    }
    this.__material = {}
    this.__reset()
    this.material = new THREE.MeshBasicMaterial({ map: this.__texture })
    this.el.sceneEl.addBehavior(this)
    return this.material
  },

  /**
   * Update or create material.
   * @param {object|null} oldData
   */
  update (oldData) {
    log('update', oldData)
    this.__updateMaterial(oldData)
    this.__updateTexture(oldData)
    return this.material
  },

  /**
   * Called on each scene tick.
   * @protected
   */
  tick (t) {
    if (!this.__frames || this.paused()) return
    if (Date.now() - this.__startTime >= this.__nextFrameTime) {
      this.nextFrame()
    }
  },

  /*================================
  =            material            =
  ================================*/

  /**
   * Updating existing material.
   * @param {object} data - Material component data.
   */
  __updateMaterial (data) {
    const { material } = this
    const newData = this.__getMaterialData(data)
    Object.keys(newData).forEach(key => {
      material[key] = newData[key]
    })
  },


  /**
   * Builds and normalize material data, normalizing stuff along the way.
   * @param {Object} data - Material data.
   * @return {Object} data - Processed material data.
   */
  __getMaterialData (data) {
    return {
      fog: data.fog,
      color: new THREE.Color(data.color),
    }
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

  __setTexure (data) {
    log('__setTexure', data)
    if (data.status === 'error') {
      warn(`Error: ${data.message}\nsrc: ${data.src}`)
      this.__reset()
    }
    else if (data.status === 'success' && data.src !== this.__textureSrc) {
      this.__reset()
      /* Texture added or changed */
      this.__ready(data)
    }
  },

  /**
   * Update or create texure.
   * @param {Object} data - Material component data.
   */
  __updateTexture (data) {
    const { src, autoplay } = data

    /* autoplay */
    if (typeof autoplay === 'boolean') {
      this.__autoplay = autoplay
    }
    else if (typeof autoplay === 'undefined') {
      this.__autoplay = true
    }
    if (this.__autoplay && this.__frames) { this.play() }

    /* src */
    if (src) {
      this.__validateSrc(src, this.__setTexure.bind(this))
    } else {
      /* Texture removed */
      this.__reset()
    }
  },

  /*=============================================
  =            varidation for texure            =
  =============================================*/

  __validateSrc (src, cb) {

    /* check if src is a url */
    const url = parseUrl(src)
    if (url) {
      this.__getImageSrc(url, cb)
      return
    }

    let message

    /* check if src is a query selector */
    const el = this.__validateAndGetQuerySelector(src)
    if (!el || typeof el !== 'object') { return }
    if (el.error) {
      message = el.error
    }
    else {
      const tagName = el.tagName.toLowerCase()
      if (tagName === 'video') {
        src = el.src
        message = 'For video, please use `aframe-video-shader`'
      }
      else if (tagName === 'img') {
        this.__getImageSrc(el.src, cb)
        return
      }
      else {
        message = `For <${tagName}> element, please use \`aframe-html-shader\``
      }
    }

    /* if there is message, create error data */
    if (message) {
      const srcData = gifData[src]
      const errData = createError(message, src)
      /* callbacks */
      if (srcData && srcData.callbacks) {
        srcData.callbacks.forEach(cb => cb(errData))
      }
      else {
        cb(errData)
      }
      /* overwrite */
      gifData[src] = errData
    }

  },

  /**
   * Validate src is a valid image url
   * @param  {string} src - url that will be tested
   * @param  {function} cb - callback with the test result
   */
  __getImageSrc (src, cb) {

    /* if src is same as previous, ignore this */
    if (src === this.__textureSrc) { return }

    /* check if we already get the srcData */
    let srcData = gifData[src]
    if (!srcData || !srcData.callbacks) {
      /* create callback */
      srcData = gifData[src] = { callbacks: [] }
      srcData.callbacks.push(cb)
    }
    else if (srcData.src) {
      cb(srcData)
      return
    }
    else if (srcData.callbacks) {
      /* add callback */
      srcData.callbacks.push(cb)
      return
    }
    const tester = new Image()
    tester.crossOrigin = 'Anonymous'
    tester.addEventListener('load', e => {
      /* check if it is gif */
      this.__getUnit8Array(src, arr => {
        if (!arr) {
          onError('This is not gif. Please use `shader:flat` instead')
          return
        }
        /* parse data */
        parseGIF(arr, (times, cnt, frames) => {
          /* store data */
          const newData = { status: 'success', src: src, times: times, cnt: cnt, frames: frames, timestamp: Date.now() }
          /* callbacks */
          if (srcData.callbacks) {
            srcData.callbacks.forEach(cb => cb(newData))
            /* overwrite */
            gifData[src] = newData
          }
        }, (err) => onError(err))
      })
    })
    tester.addEventListener('error', e => onError('Could be the following issue\n - Not Image\n - Not Found\n - Server Error\n - Cross-Origin Issue'))
    function onError(message) {
      /* create error data */
      const errData = createError(message, src)
      /* callbacks */
      if (srcData.callbacks) {
        srcData.callbacks.forEach(cb => cb(errData))
        /* overwrite */
        gifData[src] = errData
      }
    }
    tester.src = src
  },

  /**
   *
   * get mine type
   *
   */
  __getUnit8Array(src, cb) {
    if (typeof cb !== 'function') { return }

    const xhr = new XMLHttpRequest()
    xhr.open('GET', src)
    xhr.responseType = 'arraybuffer'
    xhr.addEventListener('load', e => {
      const uint8Array = new Uint8Array(e.target.response)
      const arr = (uint8Array).subarray(0, 4)
      // const header = arr.map(value => value.toString(16)).join('')
      let header = ''
      for(let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16)
      }
      if (header === '47494638') { cb(uint8Array) }
      else { cb() }
    })
    xhr.addEventListener('error', e => {
      log(e)
      cb()
    })
    xhr.send()
  },


  /**
   * Query and validate a query selector,
   *
   * @param  {string} selector - DOM selector.
   * @return {object} Selected DOM element | error message object.
   */
  __validateAndGetQuerySelector (selector) {
    try {
      var el = document.querySelector(selector)
      if (!el) {
        return { error: 'No element was found matching the selector' }
      }
      return el
    } catch (e) {  // Capture exception if it's not a valid selector.
      return { error: 'no valid selector' }
    }
  },


  /*================================
  =            playback            =
  ================================*/

  /**
   * Pause gif
   * @public
   */
  pause () {
    log('pause')
    this.__paused = true
  },

  /**
   * Play gif
   * @public
   */
  play () {
    log('play')
    this.__paused = false
  },

  /**
   * Toggle playback. play if paused and pause if played.
   * @public
   */

  togglePlayback () {

    if (this.paused()) { this.play() }
    else { this.pause() }

  },

  /**
   * Return if the playback is paused.
   * @public
   * @return {boolean}
   */
  paused () {
    return this.__paused
  },


  /**
   * Go to next frame
   * @public
   */
  nextFrame () {
    this.__draw()

    /* update next frame time */
    while ((Date.now() - this.__startTime) >= this.__nextFrameTime) {

      this.__nextFrameTime += this.__delayTimes[this.__frameIdx++]
      if ((this.__infinity || this.__loopCnt) && this.__frameCnt <= this.__frameIdx) {
        /* go back to the first */
        this.__frameIdx = 0
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
  __clearCanvas () {
    this.__ctx.clearRect(0, 0, this.__width, this.__height)
    this.__texture.needsUpdate = true
  },

  /**
   * draw
   * @private
   */
  __draw () {
    if(this.__frameIdx != 0){
      const lastFrame = this.__frames[this.__frameIdx -1 ]
      // Disposal method indicates if you should clear or not the background.
      // This flag is represented in binary and is a packed field which can also represent transparency.
      // http://matthewflickinger.com/lab/whatsinagif/animation_and_transparency.asp
      if(lastFrame.disposalMethod == 8 || lastFrame.disposalMethod == 9){
        this.__clearCanvas();
      }
    } else {
      this.__clearCanvas();
    }
    const actualFrame = this.__frames[this.__frameIdx]
    if(typeof actualFrame !== 'undefined') {
      this.__ctx.drawImage(actualFrame, 0, 0, this.__width, this.__height)
      this.__texture.needsUpdate = true
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
  __ready ({ src, times, cnt, frames }) {
    log('__ready')
    this.__textureSrc = src
    this.__delayTimes = times
    cnt ? this.__loopCnt = cnt : this.__infinity = true
    this.__frames = frames
    this.__frameCnt = times.length
    this.__startTime = Date.now()
    this.__width = THREE.Math.floorPowerOfTwo(frames[0].width)
    this.__height = THREE.Math.floorPowerOfTwo(frames[0].height)
    this.__cnv.width = this.__width
    this.__cnv.height = this.__height
    this.__draw()
    if (this.__autoplay) {
      this.play()
    }
    else {
      this.pause()
    }
  },

  /*=============================
  =            reset            =
  =============================*/
  /**
   * @private
   */
  __reset () {
    this.pause()
    this.__clearCanvas()
    this.__startTime = 0
    this.__nextFrameTime = 0
    this.__frameIdx = 0
    this.__frameCnt = 0
    this.__delayTimes = null
    this.__infinity = false
    this.__loopCnt = 0
    this.__frames = null
    this.__textureSrc = null
  },
})
