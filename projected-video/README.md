# Projected Video Explainer

## Authors

* Phinehas Fuachie

## Participate

* https://github.com/WebKit/explainers

## Status

Implemented in WebKit behind the `SpatialVideoRenderingEnabled` preference, which is off by default
on all platforms. Nothing described here is exposed to the web today.

Names in this document are the ones we would propose. WebKit currently spells the content attributes
`x-webkit-projection`, `x-webkit-yaw`, `x-webkit-pitch`, and `x-webkit-fieldofview`, and the events
`webkitcameramoved` and `webkitcameraviewchanged`.

Some implementation limits are worth knowing when reading the rest of this document, since none of
them is a property of the proposal. The renderer draws inside the browser's own media controls, so
it is present only when those controls are, and not in presentations the platform takes over —
picture-in-picture on every platform, and fullscreen on iOS and iPadOS. It also reads frames the
same way page content does, which restricts it to same-origin and CORS-enabled media.

## tl;dr

Video files can declare that their frames are a projection of a sphere rather than a flat image:
360°/180° equirectangular video, and wide-field-of-view lenses such as those described by Apple
Projected Media Profile (APMP). A browser that ignores that declaration paints the raw, warped
frame. We propose that the browser honor the declaration and present such video as a draggable,
zoomable projection in its built-in media controls, that a `projection` content attribute on
`<video>` let a page override that presentation, decline it, or supply one for a file that declares
nothing, and that a page be able to frame the opening shot and follow where the user looks.

## Introduction

`<video>` assumes its frames are rectilinear: a flat image to be scaled into a box. Equirectangular
video stores a full or half sphere in a rectangular frame; parametric formats store a
wide-field-of-view fisheye image. These formats already carry a projection declaration in the
container — APMP defines it for QuickTime and ISO BMFF as a format description extension, which
CoreMedia surfaces as a projection kind of `Equirectangular`, `HalfEquirectangular`,
`ParametricImmersive`, `AppleImmersiveVideo`, or `Rectilinear`.

That extension is the only projection declaration WebKit reads today. Other schemes exist and are
shaped differently, and are not interpreted, so a file declaring its projection only that way is
presented flat unless the page names the projection itself.

Today, a page that wants to present such a file correctly must build a renderer: create a WebGL
context, generate sphere geometry, upload each video frame as a texture, and implement its own
drag-to-look interaction. That means the file cannot simply be dropped into a `<video>` element,
the built-in controls cannot be used, and every page reimplements the same renderer with its own
bugs and its own quality and performance characteristics. Meanwhile the browser already knows,
from the file itself, what the correct presentation is.

Head-mounted displays are handled elsewhere: visionOS presents projected video through the
platform's immersive media player. This document covers the inline case — a projected video in a
page on iPhone, iPad, Mac, or inline on visionOS, presented in a flat viewport that the user pans
around.

## Use cases

A news site publishes a 360° video of an event and wants readers to look around it without the
site shipping a 3D renderer.

A real estate or travel site embeds 360° walkthroughs, and wants them to work in a plain `<video>`
element with the built-in controls, on every platform, including as a fallback where an immersive
player is unavailable.

A camera vendor's support pages play back samples straight from the device, where the file's own
metadata is the only description of its projection.

A page hosts user-uploaded video without knowing in advance whether a given file is projected, and
wants the correct presentation without inspecting each file itself.

A page that already ships its own sphere renderer wants the browser to leave a projected video
alone so the two do not fight.

A travel site wants each 360° clip to open pointing at the thing the clip is about, rather than at
whatever direction the camera operator happened to be facing.

A page wants a shareable link that reopens a video at the moment *and* the direction the user was
looking, so it needs to read the view back out.

A page draws a compass, a minimap, or a hotspot overlay beside the video and needs to keep it in
sync with where the user is looking.

A tour page steps the camera through a sequence of directions as narration plays, and needs to
return the camera to a known view after the user has dragged it.

## Proposed solution

### Default presentation follows the file

When a video's container declares a projection kind, the browser presents the video as that
projection: mapped onto geometry, drawn from a virtual camera at the center, with the user able to
drag and change the field of view to choose what they are looking at. No author opt-in is required.
The declaration is in the file, so acting on it presents the file the way the person who shot it
described it.

Nothing in the media element's model changes. `videoWidth` and `videoHeight` remain the coded
frame size, the element still lays out and composites as a replaced element of that intrinsic
size, and playback, seeking, tracks, and captions are unaffected. Only the presentation of the
frames within the element's box changes.

### The `projection` attribute

A new content attribute on `<video>` lets the page override the file's declaration or decline the
projected presentation entirely.

```
partial interface HTMLVideoElement {
    [CEReactions, Reflect] attribute DOMString projection;
};
```

```html
<!-- Presented as the container declares. -->
<video src="tour.mov" controls></video>

<!-- Presented as a full sphere even though the file says nothing. -->
<video src="untagged-360.mp4" projection="equirectangular" controls></video>

<!-- Presented flat; the page draws its own sphere. -->
<video src="tour.mov" projection="none"></video>
```

The attribute takes one of:

| Value | Meaning |
| --- | --- |
| absent, or empty | Use the projection the container declares; flat if it declares none. |
| `none` | Present the frames flat, whatever the container declares. |
| a projection name | Present the video as that projection, whatever the container declares. |

`none` is the flat presentation — the same thing a browser without this feature does, and the same
thing an untagged file gets. It is spelled out as a value because a page that draws its own sphere
needs a way to ask for it on a file that *is* tagged.

The projections implemented today are a full sphere (`equirectangular`, or `360`), a half sphere
(`halfequirectangular`, or `180`), a wide-field-of-view lens (`parametric`, or `wfov`), a fisheye
lens (`fisheye`), and an equi-angular cubemap (`equiangularcubemap`, or `eac`) — six cube faces
packed into a 3×2 grid, which is a common delivery format for 360° video because it distributes
pixels more evenly over the sphere than an equirectangular frame does. There is only one such
packing, so there is no variant for a page to select.

Naming a projection does not require the file to declare one. An untagged file — transcoded,
stripped, or produced by a tool that writes no projection extension — is projected correctly as
soon as the page names it, with no change to the media itself. The same applies to a file whose
declaration is in a scheme the browser does not read: the attribute is how a page states what the
browser could not work out for itself. The cubemap is only reachable this way, since no container
declaration maps to it.

An unrecognized value is treated as absent, so a value added by a later revision degrades to the
file's own declaration rather than to a broken presentation. That is also why `projection` is a
`DOMString` and not a WebIDL enum, which would throw on an unknown value — the shape HTML already
uses for keyword attributes like `loading`.

The attribute is live. Setting, changing, or removing it on a video that is already playing
updates the presentation without interrupting playback. WebKit's implementation fires a
`webkitprojectionchanged` event when the attribute's value changes; a standardized form of this
proposal should settle whether that event is needed at all, given that the page setting the
attribute already knows.

### The camera

A projected video is presented through a camera at the center of the geometry, described by three
values: `yaw` and `pitch`, the direction it points, and `fieldOfView`, how much of the sphere fits
in the element's box.

The user drags to look around, and narrows or widens the field of view to take in less or more of
the sphere. Pitch is clamped short of the poles so the view cannot invert; yaw is unconstrained, so
a full sphere wraps continuously. Field of view is clamped to a range the browser picks, which
keeps the user out of degenerate views and bounds the cost of the projection. Drags are
distinguished from clicks by a small movement threshold, so a tap that does not move still reaches
the video as a click.

Projections that cover less than the whole sphere — a half sphere, or a fisheye cap — have an edge,
and the imagery is faded out approaching it rather than ending abruptly. A full sphere has no edge
and no fade.

Two things a page needs from this camera, and neither is available to a page that is not driving
its own renderer: to frame the shot, and to know where the user has looked. These are different
questions — what the page asked for, and where the camera actually is — and the answer to each is
kept in a different place.

### The camera attributes

Three content attributes, reflected as doubles. Angles are in degrees.

```
partial interface HTMLVideoElement {
    [CEReactions, ReflectSetter] attribute double yaw;
    [CEReactions, ReflectSetter] attribute double pitch;
    [CEReactions, ReflectSetter] attribute double fieldOfView;

    attribute EventHandler oncameramoved;
};
```

```html
<!-- Open looking 90° to the right, angled slightly down, zoomed in a little. -->
<video src="tour.mov" yaw="90" pitch="-15" fieldOfView="60" controls></video>
```

Writing and reading are deliberately asymmetric, because the two questions are:

* **Assigning** sets the content attribute and moves the camera. An absent or unparseable attribute
  means the browser's default: pointing forward, at its default field of view.
* **Reading** gives the live camera — where the user is actually looking, whether it got there from
  the attribute or from a drag. It is clamped, and it lags a write by a frame, so a page that wants
  back the value it asked for should read the content attribute instead.

A `cameramoved` event fires when the live camera changes, coalesced to at most once per presented
frame and not fired at all when the camera is still, so a page can drive a compass or a minimap
without polling and an idle projection costs nothing.

```js
video.addEventListener("cameramoved", () => {
    compass.style.rotate = `${video.yaw}deg`;
});
```

The attributes describe a starting point, not a binding. The user can drag and zoom away from them,
and doing so does not change them. Assigning applies the value even if it is unchanged, which is
what makes "return to the view I specified" expressible: a page can reset the camera by assigning
the same number again.

The camera also outlives changes in how the video is presented. Resizing the element, entering or
leaving fullscreen, and moving between inline and other presentations all leave the camera where the
user put it — only an assignment moves it back. This matters for anything that follows the camera: a
compass beside a video should not silently re-centre because the user went fullscreen, and a page
restoring a shared view should not have that view discarded by a layout change it did not cause.

## Why the browser should do this

The projection is a property of the media, not of the page. The browser learns it from the file. A
page can only get at the same information by parsing the container itself, or by being told out of
band.

Rendering in the browser also means the sampling is done once, properly, rather than each site
getting it right separately. This renderer mipmaps and applies anisotropic filtering; a sphere
textured without them shimmers badly at the horizon, worst on lower-compute devices.

## Alternatives considered

### Require the page to opt in

A projection could be presented only when the page asks for it with an attribute. We think this is
the wrong default. It leaves correct files rendering incorrectly until every page is updated,
which is most of the value of the feature; and the signal the browser is acting on is not a guess
but a declaration in the file, so acting on it is honoring the author of the media rather than
overriding the author of the page. An opt-out is still necessary — hence `none`.

The cost of that choice is that it changes behavior on content that already exists. A page
presenting projected video with its own renderer looks correct today, and a browser that starts
projecting by default can break it — and a page cannot opt out of a browser that shipped before
`projection` existed. We think the trade is right, because the population at risk is narrow and
detectable, and because the alternative is a feature that never reaches the content it was built
for. But it is a real regression risk and not a theoretical one.

### Expose the metadata and let pages render

The browser could expose the container's projection kind and field of view, for example on
`VideoTrackConfiguration`, and leave presentation entirely to pages. This is complementary rather
than an alternative: it would help pages that want their own renderer decide what to build, but it
would not make projected video work in a plain `<video>` element, and it does not remove the need
for a default presentation. It also has a privacy consideration the presentation path does not:
metadata read out of a CORS cross-origin file and handed to script is cross-origin information
leakage, which is why `VideoTrackConfiguration` is already specified to be empty for cross-origin
media. Using the metadata only to render, and never revealing it to script, avoids that entirely.

### Two sets of camera attributes

An earlier revision of this proposal gave the two questions separate names: `yaw`, `pitch` and
`fieldOfView` reflecting the attributes, and read-only `cameraYaw`, `cameraPitch` and
`cameraFieldOfView` reporting the live camera. Six names for three quantities.

That shape reads more precisely. A page gets back exactly what it assigned, with no frame of lag
and no silent clamping, and the live camera is a separate thing it can watch without confusing the
two. Those are real advantages and the current design gives them up.

We prefer one name each because the content attribute already answers "what did I ask for" — the
second set buys nothing `getAttribute` does not — and because six names for three values is a cost
every page using the feature pays, to serve a case few pages have.

## Accessibility considerations

Dragging to look and changing the field of view are currently the only ways to move the camera,
which leaves the feature unusable without a pointer. A standardized form of this needs a keyboard
interaction — arrow keys to turn, something to widen and narrow, something to return to the
declared view — and should say how the camera's direction is exposed to assistive technology. This
is an open gap in the implementation, not a settled design.

Changing the field of view is also pointer-class-dependent today: it is driven by wheel and
trackpad, so a touch-only device can pan but cannot zoom at all. Pinch is missing, not declined.

Motion is a consideration: a projected presentation moves in response to input in a way a flat
video does not. How this should interact with `prefers-reduced-motion` is unresolved, as is whether
a page animating the camera through the declared attributes should be damped or ignored under that
preference.

## Privacy considerations

Rendering a projection does not hand the page anything it could not already observe — the frames go
to the screen, never to script — so the presentation path raises no new cross-origin concern. If the
projection metadata is ever exposed to script, it must follow `VideoTrackConfiguration` and be
withheld for CORS cross-origin media.

`cameramoved`, and reading the camera attributes, do report user input at up to once per presented
frame. This is input directed at the page's own element, of a kind the page can already observe
through pointer events, so it is not new information — but it arrives from inside the browser's
own controls, whose pointer events the page does not otherwise see, and it is a fine-grained
behavioral signal. Coalescing per frame rather than per input event, and reporting nothing while the
camera is still, keeps it no more revealing than it needs to be.

## Open questions

**What is the value vocabulary?** The names above are implementation names, not proposed spec
values, and the mapping from container projection kinds to them needs to be written down —
including which container declarations a browser is expected to honor, since more than one scheme
exists and WebKit reads only one of them today.

**How does an author state the content's field of view?** `fieldOfView` is the *camera's* field of
view — the zoom. Wide-field-of-view and fisheye projections also need to know how much of the world
the frame covers, which is a different angle entirely; the container can supply that, but no
attribute can, so a page forcing one of those projections on an untagged file still gets a default.
One of the two needs renaming before this ships, and it is probably the content one.

**Stereoscopic video.** The renderer samples a single texture, so a file carrying a stereo pair
gets one eye's worth of geometry textured with whatever the frame contains. How projection and
stereo interact — including MV-HEVC content — is unaddressed. We plan to look at it; nothing is
designed yet.

**Should yaw be limited for bounded projections?** A half sphere, and more so a fisheye cap, covers
only part of the space, but yaw is unconstrained for every projection. The user can turn away from
the content entirely and be left looking at the feathered edge of nothing. Whether the browser
should clamp yaw to the content's extent, and whether that clamp should be observable, is open.

**What resets the camera, exactly?** The camera survives resizes and presentation changes, and only a
declared attribute assignment moves it. Two edges are unsettled: whether a new media resource on the
same element should reset it, and whether "assigning the same value re-applies it" is the right way
to spell reset, given it makes the attributes' behavior depend on assignment rather than on value.
