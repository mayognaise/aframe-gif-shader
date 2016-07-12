# AFrame GIF Shader

A shader to display GIF for [A-Frame](https://aframe.io) VR. Inspired by [@gtk2k](https://github.com/gtk2k)'s [awesome sample](https://github.com/gtk2k/gtk2k.github.io/tree/master/animation_gif). Migrated from [aframe-gif-component](https://github.com/mayognaise/aframe-gif-component)


**[DEMO](https://mayognaise.github.io/aframe-gif-shader/basic/index.html)**

![example](example.gif)


## Properties

- Basic material's properties are supported.
- The property is pretty much same as `flat` shader besides `repeat`. Will update it soon.
- `autoplay` will be useful when [Method](#method) is ready.
- `filter` property will be supported soon.

| Property | Description | Default Value |
| -------- | ----------- | ------------- |
|src|image url. @see [Textures](https://aframe.io/docs/components/material.html#Textures)|null|
|autoplay|play automatecally once it's ready|true|

For refference, please check the following links:
- [Material](https://aframe.io/docs/components/material.html)
- [Textures](https://aframe.io/docs/components/material.html#Textures)
- [Flat Shading Model](https://aframe.io/docs/core/shaders.html#Flat-Shading-Model)


## Method

#### `play()`

Play gif animation

```js
entity.gif.play()
```

#### `pause()`

Pause gif animation

```js
entity.gif.pause()
```

#### `togglePlayback()`

Toggle playback. if the gif is paused, play and pause if it's playing.

```js
entity.gif.togglePlayback()
```

#### `nextFrame()`

Go to next frame. Useful if it's paused.

```js
entity.gif.nextFrame()
```


#### `paused()`

Returns if it is paused.

```js
const paused = entity.gif.paused() // true or false
```



## Events

[Media events](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events) will be supported soon.


## Usage

### Browser Installation

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>My A-Frame Scene</title>
  <script src="https://aframe.io/releases/0.2.0/aframe.min.js"></script>
  <script src="https://rawgit.com/mayognaise/aframe-gif-shader/master/dist/aframe-gif-shader.min.js"></script>
</head>

<body>
  <a-scene>
    <a-entity geometry="primitive:box;" material="shader:gif;src:url(nyancat.gif);color:green;opacity:.8"></a-entity>
  </a-scene>
</body>
```

### NPM Installation

Install via NPM:

```bash
npm i -D aframe-gif-shader
```

Then register and use.

```js
import 'aframe'
import 'aframe-gif-shader'
```



