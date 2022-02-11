# The `<model>` element

## Authors:

- [Antoine Quint](https://github.com/graouts)
- [Dean Jackson](https://github.com/grorg)
- [Theresa O'Connor](https://github.com/hober)

## Participate
- https://github.com/WebKit/explainers

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [tl;dr](#tldr)
- [Introduction](#introduction)
- [The HTMLModelElement](#the-htmlmodelelement)
  - [Fallback content](#fallback-content)
- [DOM API](#dom-api)
  - [Controlling the camera](#controlling-the-camera)
  - [Controlling animations](#controlling-animations)
  - [Controlling audio](#controlling-audio)
- [DOM Events](#dom-events)
- [Playback and accessibility considerations](#playback-and-accessibility-considerations)
- [Privacy considerations](#privacy-considerations)
- [Security considerations](#security-considerations)
- [Detailed design discussion](#detailed-design-discussion)
  - [Why add a new element?](#why-add-a-new-element)
  - [Rendering](#rendering)
- [Considered alternatives](#considered-alternatives)
- [Additional reading](#additional-reading)
- [Acknowledgements](#acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## tl;dr

We propose adding a `<model>` element to HTML that displays 3D content using
a renderer built-in to the browser.

## Introduction

HTML allows the display of many media types through elements such as `<img>`,
`<picture>`, or `<video>`, but it does not provide a native manner to directly
consume 3D content. Embedding such content within a page is comparatively
cumbersome and relies on scripting the `<canvas>` element. We believe it is
time to put 3D models on equal footing with other, already supported, media
types.

There is a variety of prior art here: For example,
[three.js](https://threejs.org/) and [Babylon JS](https://babylonjs.com/)
are WebGL frameworks that can process many different formats. Then there is
the [model-viewer](https://modelviewer.dev) project which shows models
inline in a web page, and also allows users on some devices to see the 3D
object in augmented reality. And iOS Safari has the ability to navigate
directly to an augmented reality view with its
[AR Quick Look feature](https://webkit.org/blog/8421/viewing-augmented-reality-assets-in-safari-for-ios/).

However, there are cases where these current options cannot render content.
This might be due to security restrictions or to the limitations of `<canvas>`
(see below for [more details on motivation](#detailed-design-discussion)).

The HTML `<model>` element aims to allow a website to embed interactive 3D models as
conveniently as any other visual media. Models are expected to be created by 3D authoring
tools or generated dynamically, but served as a standalone resource by the server.

Additionally, besides the simple display of a 3D model, the `<model>` element should have
support for interactivity and animations while presented within the page, and also support
more immersive experiences, such as augmented reality.

This proposal does *not* aim to define a mechanism that allows the creation of a 3D scene
within a browser using declarative primitives or a programmatic API.

## The HTMLModelElement

The `<model>` element is a new
[replaced](https://drafts.csswg.org/css-display/#replaced-element) HTML
element similar to `<video>` in that it is replaced visually by the content
of an external resource referenced via a `<source>` element. Like other
HTML elements, it can be styled using CSS.

The resource is resolved by selecting the first, most appropriate `<source>`
element with supported `type` and `media` attributes, allowing different versions of the same
resource in different formats to be specified. See the HTML specification for
the definition of
[type](https://html.spec.whatwg.org/multipage/embedded-content.html#attr-source-type) and
[media](https://html.spec.whatwg.org/multipage/embedded-content.html#attr-source-media).

This is an example showing how a
[USDZ](https://graphics.pixar.com/usd/docs/Usdz-File-Format-Specification.html)
file may be shown in an area measuring 400px by 300px, with a fallback
to a [glTF](https://www.khronos.org/gltf/) binary
file.

```html
<model style="width: 400px; height: 300px">
    <source src="assets/example.usdz" type="model/vnd.usdz+zip">
    <source src="assets/example.glb" type="model/gltf-binary">
</model>
```

Browsers may support direct manipulation of the `<model>` element while presented in the page. A browser
may allow the model to be rotated or zoomed within the element's bounds without affecting the scrolling
position or zoom level of the page. To opt into this behavior, the author may use the `interactive`
HTML attribute.

The previous example can be augmented to allow interaction provided by the browser:

```html
<model style="width: 400px; height: 300px" interactive>
    <source src="assets/example.usdz" type="model/vnd.usdz+zip">
    <source src="assets/example.glb" type="model/gltf-binary">
</model>
```

It is also possible that browsers support an animated presentation of the model, by running
animations defined in the source data. Such animations are not enabled by default, but can
be triggered on load by using the `autoplay` HTML attribute.

The original example can be augmented to allow for such animations:

```html
<model style="width: 400px; height: 300px" autoplay>
    <source src="assets/example.usdz" type="model/vnd.usdz+zip">
    <source src="assets/example.glb" type="model/gltf-binary">
</model>
```

The `interactive` and `autoplay` attributes are not mutually exclusive and may be combined. A browser can
run a default animation that is suspended while the user interacts with the model and that is
automatically resumed after a period of inactivity.

As such, the original example can be augmented to allow for both animations and interactivity:

```html
<model style="width: 400px; height: 300px" autoplay interactive>
    <source src="assets/example.usdz" type="model/vnd.usdz+zip">
    <source src="assets/example.glb" type="model/gltf-binary">
</model>
```

Like the `<video>`, the `<model>` element has an optional `poster` attribute that references
an image to be shown while the content is being loaded, or if the content fails to load.

Here is [an example](example.html) of the `<model>` element. On a browser that has implemented
the element, it should appear as in the image below.

![Ha-Ha iMessage tap-back bubble](assets/haha.png)

### Fallback content

In the case where `<model>` can not display any of its `<source>` children, it
will fall-back to showing its last non-`<source>` child that is a replaced
element. In the example below, this would mean the contents of the `<picture>`
element would be displayed.

```html
<model>
    <source src="fake.typ1" type="imaginary/type-1">
    <source src="fake.typ2" type="imaginary/type-2">
    <picture>
        <source src="animated-version.mp4" type="video/mp4">
        <source src="animated-version.webp" type="image/webp">
        <img src="animated-version.gif"/>
    </picture>
</model>
```


## DOM API

Each `<model>` element is represented in the DOM as `HTMLModelElement` instances.

The following properties allow easy access to information otherwise represented by HTML
attributes and elements:

* `currentSrc`: read-only string returning the URL to the loaded resource. To change the loaded
resource, the author should use existing DOM APIs to add, remove or modify `<source>` children
elements to the `<model>` element.
* `autoplay`: read-write boolean indicating whether the model will automatically start playback.
Setting this property to `false` removes the `autoplay` HTML attribute if present, while setting it to `true`
adds the `autoplay` HTML attribute if absent.
* `interactive`: read-write boolean indicating whether the model can be interacted with. Setting this
property to `false` removes the `interactive` HTML attribute if present, while setting it to `true`
adds the `interactive` HTML attribute if absent. An interactive model will provide some default
behaviour that allows the user to transform the virtual camera around the model, such as by clicking
and dragging.
* `loading`: behaves in the same manner as the
[`img` attribute of the same name](https://html.spec.whatwg.org/multipage/embedded-content.html#attr-img-loading).

Similar to other elements with sub-resources, the `HTMLModelElement` will provide
APIs to observe the loading and decoding of data.

While HTML supports the notion of taking an element fullscreen, browsers may want to offer yet more
immersive experiences that require going beyond the page itself, one example would be to present the
model in augmented reality to allow the user to visualize it at real scale in the user's immediate
surroundings. To support this, new DOM APIs may be added or the existing HTML Fullscreen API extended
via more [FullscreenOptions](https://fullscreen.spec.whatwg.org/#dictdef-fullscreenoptions) properties.

### Controlling the camera

Using the `interactive` property, the author allows a built-in behavior such that dragging over a
`<model>` element will result in modifying the camera. We also propose to allow authors direct control
of the camera via DOM APIs. An initial proposition would be to add an `HTMLModelElementCamera`:

```idl
dictionary HTMLModelElementCamera {
    double pitch;
    double yaw;
    double scale;
};
```

Then the camera can be set and read back:

```idl
interface HTMLModelElement : HTMLElement {
    Promise<HTMLModelElementCamera> getCamera();
    Promise<undefined> setCamera(HTMLModelElementCamera camera);
}
```

Note the use of promises since it is likely that the model is rendered out-of-process and any communication
with that process would need to be asynchronous. This applies to other promise-based APIs discussed in this
document.

### Controlling animations

Formats supported by `<model>` may support animations built into the resource itself, such as the USDZ
file format. We propose allowing page authors to control such animations.

This is a wide topic with likely dependencies on the file format support for animations itself. Another
important topic would be whether the Web Animations specification could be leveraged to expose and control
animations for the resource. At the moment, this document intentionally doesn't describe how animations
within a `<model>` element relate to the [default document timeline](https://www.w3.org/TR/web-animations-1/#the-documents-default-timeline).

For experimental purposes, we propose an initial, basic set of DOM APIs based on the assumption that
a single animation is controlled. With this proposal the author could control whether the animation is
playing, looping, query its duration and set its current time, allowing the creation of controls to
toggle playback and scrub through the animation.

```idl
interface HTMLModelElement : HTMLElement {
    Promise<boolean> isPlayingAnimation();
    Promise<undefined> playAnimation();
    Promise<undefined> pauseAnimation();

    Promise<boolean> isLoopingAnimation();
    Promise<undefined> setIsLoopingAnimation(boolean looping);

    Promise<double> animationDuration();
    Promise<double> animationCurrentTime();
    Promise<undefined> setAnimationCurrentTime(double currentTime);
}
```

### Controlling audio

Another feature that may be supported by the resource file format is audio. Much like animations,
this is a wide topic with potentially multiple audio clips being built into the resource, and our
initial proposal involves simply controlling whether built-in audio is muted:

```idl
interface HTMLModelElement : HTMLElement {
    Promise<boolean> hasAudio();
    Promise<boolean> isMuted();
    Promise<undefined> setIsMuted(boolean isMuted);
}
```

Note that the audio state is not related to the animation state, so the embedded audio may be played
while embedded animations are paused and vice versa.

## DOM Events

While the author may prevent any built-in interactive behavior for a `<model>` by ommitting the `interactive`
attribute, it might be desirable for the decision to allow such interactive behavior to be made at runtime.
To that end, when a user initiates a gesture over a `<model>` element, the author may call the `preventDefault()`
method when handling the `pointerdown` event. If this method is not called for the
[`pointerdown`](https://www.w3.org/TR/pointerevents/#the-pointerdown-event) event for the
[primary pointer](https://www.w3.org/TR/pointerevents/#the-primary-pointer) of a gesture, calling
`preventDefault()` for any additional pointer event will have no effect.

The `mousedown` and `touchstart` compatibility events may also be used for this purpose.

## Playback and accessibility considerations

Model resources may contain audio and animations and as such should be
considered like other media and animated content by browsers. This means
that browser behaviors around loading, autoplay, and accessibility should be
honored for the `<model>` element as well, for instance:

- a static poster image may be displayed prior to loading the full `<model>` resource,
- audio may be muted until the user interacts with the `<model>` element,
- playback may be disabled if the user has set a preference to reduce animations.

Like other timed media, the `<model>` element will provide a DOM API for playing, pausing,
muting, etc.

The `<model>` element has an `alt` attribute to provide a textual description of the
content. Also, the 3D content itself might expose some features to the accessibility engine.

## Privacy considerations

Rendered `<model>` data is not exposed to / extractable by the page in this
proposal, so no tainting is required. We do expect this would require
extensions to Fetch (a new destination type), Content Security Policy (a new
policy directive), and likely a few others.

## Security considerations

As always, introducing support for parsing and processing new formats raises the surface area
of attack possibilities in a browser.

However, some existing browsers already process such formats in a non-inline manner
(such as iOS's AR Quick Look and Android's Scene Viewer).

## Detailed design discussion

### Why add a new element?

We believe it is time for files representing 3D geometric data to become a first class
citizen on the web.

Adding a new element to HTML requires significant justification. At first glance, the `<model>` element
does not appear necessary since HTML already provides a mechanism to load arbitrary data and
render it: `<canvas>` and its rendering contexts.

So why add a new element?

Firstly, we believe that content such as this is important enough that it should not require
a third-party library. Like raster images, vector images, audio and video, three-dimensional
geometric data should be a data type that can be directly embedded in HTML content.

Secondly, while we are not proposing a DOM for the data at the moment, we expect to in the
future. It would be of benefit to the web developer to learn a single common API for 3D
geometry rather than learn the API of various third-party libraries. Furthermore, different
file types would then conform to the same API.

Thirdly, there are cases where a JavaScript library cannot render content. This might be due to
security restrictions or to the limitations of `<canvas>`, which is bound to a flat two-dimensional
surface in the web page.

Consider a browser or web-view being displayed in Augmented Reality. The developer wants to
show a 3D model in the page. In order for the model to look accurate, it must be rendered
from the viewpoint of the user—otherwise it is a flat rendering of a three-dimensional
image with incorrect perspective.

A solution to this would be to allow the web page, in particular the WebGL
showing the 3D model, to render from the perspective of the user. This would
involve granting too much private information to the page, possibly including
the camera feed, some scene understanding, and very accurate position data on
the user. It should not be a requirement that every web page has to request
permission to show a 3D model in this manner. The user should not have to
provide access to this sensitive information to have the experience.

Furthermore, there is more information needed to produce a realistic rendering, such as
the ability to cast and receive shadows and reflections from other content in the scene, that
might not be on the same web page.

This means that rendering in Augmented Reality is currently limited to a system
component, different from the in-page component, leading to inconsistent results.

### Rendering

Unfortunately it is impractical to define a pixel accurate rendering approach for the `<model>` element. If such
an attempt was made, it would likely pose too many restrictions on the browser engines, which have to work
on a number of operating systems, hardware, and environments.

Instead we suggest adopting a Physically-Based Rendering approach, probably referencing an existing
shading model such as [MaterialX](https://materialx.org/). Browsers would be free to
implement the system as they wish, with a goal of producing the most accurate rendering possible.
We do not expect pixel-accurate results between browsers.

While this is a clear problem, it also comes with some large advantages.

- Improvements in hardware should see improvements in rendering quality.
- The quality of the rendered content may improve without requiring a change in the source.
- The browser can use the environment to make a more realistic display. For example, reflections or shadows
  cast by other elements in the AR scene (another thing that would be impossible for page content to have access to).

For reference, the Model Viewer project has a [rendering engine fidelity comparison](https://modelviewer.dev/fidelity/).

A future version of this explainer will describe the lighting model and environment in which the
3D content should be rendered. Both items will require community collaboration and some consensus.

## Considered alternatives

1. *Reuse `<embed>` or `<object>` instead of adding a new element*

   It would be possible to reuse one of the generic embedding elements, such as `<embed>` or `<object>`,
   for this purpose. However, we think that 3D content should behave like other media types.

2. *Reuse `<img>`, `<picture>` or `<video>` instead of adding a new element*

   One can consider a 3D rendering to be an image or movie, but we expect there to be differences in
   interactivity.

3. *A simple `src=""` attribute instead of `<source>` children*

   Like `<audio>` and `<video>`, there are several widely-used formats that authors might wish to use,
   and browser support for these formats may vary. Given this, providing multiple `<source>`s seems desirable.

4. *Do not add a new element. Pass enough data to WebGL to render accurately*

    As noted above, this would require any site that wants to use an AR
    experience to request and have the user trust that site enough to allow
    them access to the camera stream as well as other information. A new
    element allows this use case without requiring the user to make that decision.

## Additional reading

For additional insight into the history and how we see the potential evolution
of the `<model>` element going, please see the ["`<model>` Evolution"](HistoryAndEvolution.md)
companion document.

## Acknowledgements

Many thanks for valuable feedback and advice from:

- Sam Sneddon
- Sam Weinig
- Simon Fraser
