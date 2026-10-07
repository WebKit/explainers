# Projected Video Explainer

## Authors

* Phinehas Fuachie

## Participate

* https://github.com/WebKit/explainers

## Status

Implemented in WebKit behind the `SpatialVideoRenderingEnabled` preference, off by default. The
names used here are the ones we would propose; WebKit currently prefixes them with `x-webkit-`.

## tl;dr

Some video files are not meant to be shown flat. Their frames are the input to a projection: the
image is mapped onto a three-dimensional shape and viewed from the inside, which is how 360°,
180°, and wide-field-of-view video work. Files in formats like Apple Projected Media Profile
(APMP) declare which projection to use, and a browser that ignores that declaration paints a
warped frame.

We propose that the browser read the declaration and present the video projected, that its
built-in controls let the user look around, and that a `projection` content attribute on `<video>`
let a page choose the projection itself when the file does not declare one or declares the wrong
one. We also propose three attributes for framing the opening view, and an event for following
where the user looks.

## Introduction

`<video>` assumes its frames are rectilinear: a flat image to be scaled and cropped into a box.
Projected video formats such as APMP define a mechanism to map that rectilinear video frame onto a
three-dimensional shape.

Common projections include full equirectangular, or 360 equirectangular, which maps the frame onto
a sphere; half equirectangular, which maps it onto a semi-spherical shape; fisheye, which maps it
onto a spherical cap; parametric, in which the mapping depends on metadata read from the media; and
equiangular cubemap, which packs six cube faces into a 3×2 grid.

Many projected files carry no such signaling — they were transcoded, or stripped, or produced by a
tool that writes none. For those a page can supply the projection itself, if it knows it out of
band.

Today a page that wants to present such a file correctly has to build a renderer: create a WebGL
context, generate the geometry, upload each frame as a texture, and implement drag-to-look. The
file cannot simply be dropped into a `<video>` element, the built-in controls cannot be used, and
every page reimplements the same renderer. The browser already knows, from the file, what the
correct presentation is.

## Use cases

* A news site publishes a 360° video and wants readers to look around it without shipping a 3D
  renderer.
* A real estate or travel site embeds 360° walkthroughs and wants them to work in a plain `<video>`
  element with the built-in controls.
* A camera vendor plays back samples straight from the device, where the file's own metadata is the
  only description of its projection.
* A site hosts user-uploaded video and wants each file presented correctly without inspecting it.
* A site that already ships its own renderer wants the browser to leave the video alone.
* A travel site wants each clip to open pointing at its subject rather than wherever the camera
  happened to face.
* A page offers a shareable link that reopens the video at the same moment *and* the same direction.
* A page draws a compass, minimap, or hotspot overlay that has to track where the user is looking.

## Proposed solution

### The default presentation follows the file

When a video's container declares a projection, the browser presents it as that projection. The
page does not need to opt in: the declaration is in the file, so acting on it presents the video as
its author intended.

Nothing in the media element's model changes. `videoWidth` and `videoHeight` remain the coded frame
size, the element lays out as a replaced element of that intrinsic size, and playback, seeking,
tracks, and captions are unaffected. Only the presentation of the frames within the element's box
changes.

### The `projection` attribute

A content attribute on `<video>` lets a page name the projection when the file does not declare
one, or override what it declares.

```
partial interface HTMLVideoElement {
    attribute DOMString projection;
};
```

```html
<!-- Presented as the container declares. -->
<video src="tour.mov" controls></video>

<!-- Presented as a full sphere even though the file declares nothing. -->
<video src="untagged-360.mp4" projection="equirectangular" controls></video>

<!-- Presented flat; the page draws its own sphere. -->
<video src="tour.mov" projection="rectilinear"></video>
```

The attribute is limited to only known values:

| Keyword | Meaning |
| --- | --- |
| `auto` | Use the projection the container declares; rectilinear if it declares none. |
| `rectilinear` | Present the frames flat. |
| `equirectangular` | Map the frame onto a sphere. |
| `half-equirectangular` | Map the frame onto a semi-spherical shape. |
| `fisheye` | Map the frame onto a spherical cap. |
| `parametric` | Map the frame as the media's own metadata describes. |
| `equiangular-cubemap` | Six cube faces packed into a 3×2 grid. |

`auto` is both the missing value default and the invalid value default, so an absent, empty, or
unrecognized attribute all mean the same thing. A keyword added by a later revision therefore falls
back to the file's own declaration in older browsers, rather than overriding it.

`rectilinear` is what a browser without this feature does, and what an untagged file gets. It is a
keyword because a page that draws its own sphere needs a way to ask for it on a file that *is*
tagged.

### The camera

A projected video is viewed from a camera at the centre of the geometry. The user drags to look
around and narrows or widens the field of view. Pitch and field of view are bounded, so the view
cannot invert or degenerate, and values outside those bounds are clamped.

### The camera attributes

Three content attributes let a page frame the opening view, all in degrees: `yaw` and `pitch` give
the direction, and `fieldOfView` is the vertical extent.

```
partial interface HTMLVideoElement {
    attribute double yaw;
    attribute double pitch;
    attribute double fieldOfView;

    attribute EventHandler oncameramoved;
};

interface CameraMovedEvent : Event {
    readonly attribute double yaw;
    readonly attribute double pitch;
    readonly attribute double fieldOfView;
};
```

```html
<!-- Open looking 90° to the right, angled slightly down, zoomed in a little. -->
<video src="tour.mov" yaw="90" pitch="-15" fieldOfView="60" controls></video>
```

The browser's controls do not write these attributes, so a page can return to the view it specified
by assigning the same value again.

A `cameramoved` event reports where the user is looking, coalesced to at most once per presented
frame and not fired while the camera is still, so a page can track it without polling.

```js
video.addEventListener("cameramoved", event => {
    compass.style.rotate = `${event.yaw}deg`;
});
```

## Why the browser should do this

The projection is a property of the media, not of the page. The browser reads it from the file; a
page can only get it by parsing the container itself or being told out of band.

Rendering in the browser also means each frame is sampled once, correctly, rather than every site
solving it again. Mipmapping and anisotropic filtering matter here: a sphere textured without them
shimmers badly at the horizon.

## Alternatives considered

### Require the page to opt in

A projection could be presented only when a page asks for it. We think that is the wrong default:
it leaves correct files rendering incorrectly until every page is updated, and the browser is
acting on a declaration in the file rather than a guess. An opt-out is still necessary, hence
`rectilinear`.

The cost is that this changes behaviour on existing content. A page presenting projected video with
its own renderer looks correct today, and cannot opt out of a browser that shipped before
`projection` existed. We think the trade is right, but it is a real regression risk.

### Expose the metadata and let pages render

The browser could expose the container's projection kind, for example on `VideoTrackConfiguration`,
and leave presentation to pages. That is complementary rather than an alternative: it would not
make projected video work in a plain `<video>` element. It also carries a privacy consideration the
presentation path mostly avoids, since metadata read from a cross-origin file and handed to script
is cross-origin information — which is why `VideoTrackConfiguration` is already empty for
cross-origin media.

## Accessibility considerations

Dragging and changing the field of view are currently the only ways to move the camera, which
leaves the feature unusable without a pointer. A keyboard interaction is needed — arrow keys to
turn, something to widen and narrow, something to return to the declared view — along with a way to
expose the camera's direction to assistive technology.

Changing the field of view is also pointer-class-dependent: it is driven by wheel and trackpad, so
a touch-only device can pan but cannot zoom. Pinch is missing, not declined.

A projected presentation moves in response to input in a way a flat video does not. How this
interacts with `prefers-reduced-motion` is unresolved.

## Privacy considerations

The frames go to the screen, never to script, so rendering a projection does not give a page pixels
it could not already obtain.

`cameramoved` does tell a page that the video is projected, and the camera's behaviour narrows it
further — yaw that wraps continuously implies a full sphere, yaw that stops at an edge implies a
bounded one. That is information derived from the media, including cross-origin media, so it is a
real if narrow disclosure. We think it is acceptable: the page supplied the element, the event
reports input directed at it, and a page can already infer a good deal from how the element handles
its own pointer events. Withholding `cameramoved` for cross-origin media would close it, at the
cost of the compass and shareable-view use cases on most real content.

Coalescing per frame rather than per input event, and reporting nothing while the camera is still,
keeps the signal no finer than it needs to be.

## Open questions

**Head-mounted displays.** The interaction model differs — head and hand tracking rather than a
pointer — and a platform may present projected video through its own immersive player instead.

**Naming the camera attributes.** `yaw`, `pitch`, and `fieldOfView` only ever hold what the page
assigned, which suggests `defaultYaw` and friends, after `defaultMuted`. But every `default*` in
HTML has a live counterpart, and here the live camera is reported on `cameramoved` rather than on
the element.

**Two meanings of field of view.** `fieldOfView` is the camera's. Wide-field-of-view and fisheye
content also has a field of view — how much of the world the frame covers — which is a different
angle the container supplies. One of the two needs renaming.

**The keyword vocabulary.** The keywords above are implementation names. The mapping from container
projection kinds to them needs writing down, as does which container declarations a browser is
expected to honor.

**Bounding yaw.** Yaw is unconstrained for every projection, so on a half sphere or fisheye cap the
user can turn away from the content entirely and face the feathered edge of nothing.

**Resetting the camera.** Assigning the same value again is how a page returns to its declared view.
Whether that is the right way to spell it, and whether a new media resource should reset the
camera, are both open.
