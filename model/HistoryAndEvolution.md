# `<model>` Evolution

## Authors:

- [Sam Weinig](https://github.com/weinig)

## Table of Contents

- [A short history](#a-short-history)
- [Where can this go?](#where-can-this-go)
  - [Scene Graph](#scene-graph)
  - [Scene Graph & Existing 3D Libraries on the Web](#scene-graph--existing-3d-libraries-on-the-web)
  - [Scene Graph & WebXR](#scene-graph--webxr)

## A short history

The [`<model>` element](https://github.com/WebKit/explainers/tree/main/model)
was  born out of a desire to take the next step and improve the experience of
Safari’s integration with iOS’s [AR Quick Look](https://developer.apple.com/augmented-reality/quick-look/)
feature. AR Quick Look’s existing integration in Safari allows web pages to link
to .usdz files that when loaded, open up a full screen experience that allows
the .usdz model to be viewed with limited interaction (translate, rotate and
scale) either in a virtual environment (a white void) or in AR using the devices
camera. This feature has been used by a variety of different kinds of websites
ranging from [retailers](https://www.bang-olufsen.com/en/us/speakers/beosound-2)
to [museums](https://www.metmuseum.org/blogs/collection-insights/2020/augmented-reality-zemi-arte-del-mar). 

A glaring limitation of the existing feature is that it is not integrated into
the hosting web page at all, but rather web pages must provide a link (usually a
static image of the model) that takes you to the experience. To improve things,
we sought to make an “inline AR Quick Look”, where you could see a live version
of the `<model>` as soon as the page loaded. No need to render out a static 
image of the model (which might use a slightly different renderer than the one
on the device, causing discontinuity) and no need to go to a completely
different experience just to interact (e.g. spin and scale) the model. Better
yet, when transitioning to an AR experience (which we still think makes sense
fullscreen) the same asset can be used for a seamless transition.

By utilizing the browser itself for this AR experience, we also maintain the
ability to have websites include this functionality without having to prompt the
user for access to privacy-gated features like the camera and motion data, which
otherwise a website would have to request to implement an AR experience
themselves, and which many sites would not want to gate this functionality on.

With this basic idea in place, we thought through how to achieve something like
this and we found ourselves quickly thinking about models as just another type
of media for the browser to be able to show. So we took inspiration from the
existing `<img>`, `<picture>` and `<video>`, elements to try to build an element
that was as convenient to use as those, and `<model>` was born.


## Where can this go?

But that’s the history, where do we see `<model>` going? It’s hard to predict 
the future, but here are some of the directions we think would be fruitful to
explore:

### Scene Graph

The initial `<model>` proposal does not try to define any object model for the
`<model>` being shown, but that doesn’t mean it should remain that way. 

One next step would be to define an object model (or scene graph) that all the
supported model asset types (USD, glTF, etc.) could be represented by. This
would likely take the form of new HTML elements to represent the various aspects
of the model, and perhaps utilizing CSS to control aspects of the style. This
would allow a completely dynamic 3D scene to be constructed from HTML and for
direct manipulation of the components by JS for dynamic interactions and
animations beyond what is encodable into the model formats themselves. The
obvious parallel is `<svg>`, which can be loaded as whole document, or built and
inspected element by element (though I am not sure documents are a necessity
for this).

With this in place, `<model>` would be re-defined as an element that loads and
builds a scene graph, perhaps sticking it in the shadow DOM of the `<model>`
element for use by the page. This would mean defining explicit mappings from
supported formats (USD, glTF) to this scene graph for browser compatibility.

With access to 3D construction pieces now (and not just a replaced element in
the 2D page as we have with `<model>`), we will have to define how volumes and
cameras are specified, and how they interact with features like 3D CSS
transforms, which are non-obvious due to 3D CSS transforms’ flattening
behaviors. 

This will be a big undertaking.

### Scene Graph & Existing 3D Libraries on the Web

There is a rich legacy of amazing libraries for creating and rendering 3D scene
graphs on the web [three.js](https://threejs.org/), [Babylon JS](https://babylonjs.com/),
the list goes on and on) using WebGL/WebGPU and one idea would be to try and
work with the authors of these libraries to see if we can come up with an
underlying scene graph that we can share between the browser engine and the
libraries. The goal would be to allow users of these libraries to continue using
the APIs and tools these libraries have built to build 3D scenes, but then have
a way to specify that they want to use the browser’s built-in renderer when
appropriate. 

Importantly, it won’t always be the right choice for a website to want to use
the browsers built-in renderer, as it will come with limitations not present in
WebGL/WebGPU based renderers (both due to limitations we want to impose for
privacy when using the scene graph in AR, think shaders for post processing for
example, but also limitations due to standardization process not supporting all
features of every renderer).

This is all quite speculative, but we are going to try to gauge interest with
library authors to see if something like this makes sense to them.

### Scene Graph & WebXR

Another area to explore would be how `<model>` and the hypothetical scene graph
could interact with WebXR. For instance, allowing the scene graph to be exposed
via a new WebXRLayer type, and composited in concert with other WebXRLayers.
