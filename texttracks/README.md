# TextTrackCue enhancements for programmatic subtitle and caption presentation

## Authors:

- [Eric Carlson](https://github.com/eric-carlson)
- [Theresa O'Connor](https://github.com/hober)
- [Marcos Cáceres‎](https://github.com/marcoscaceres)

## Participate

- [Issue tracker](https://github.com/WebKit/explainers/labels/text%20tracks)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Introduction](#introduction)
  - [Goals](#goals)
  - [Non-goals](#non-goals)
- [Overview of proposed web platform changes](#overview-of-proposed-web-platform-changes)
  - [CSS Pseudo-Elements](#css-pseudo-elements)
  - [HTML](#html)
  - [WebVTT](#webvtt)
  - [Cue Fragments](#cue-fragments)
- [Using the API and styling cues](#using-the-api-and-styling-cues)
- [Considered alternatives](#considered-alternatives)
  - [Abstract Data Model](#abstract-data-model)
- [Stakeholder Signals](#stakeholder-signals)
- [Acknowledgements](#acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

Native UA rendering of out-of-band subtitles and captions is currently
only possible with WebVTT. If a site can't or won't make its subtitles
available in-band, and can't or won't publish its subtitles and captions
in WebVTT, the site must render its subtitles and captions itself.

If a site implements its own subtitle and caption rendering, it incurs
many costs:

1. The engineering cost of maintaining bespoke text track display code.
2. The inability of bespoke text track display code to respect system
   conventions or user preferences re: display of captions and
   subtitles.
3. The inability of bespoke code to hook into platform features like
   picture-in-picture and some forms of media fullscreen;
4. Relatedly, the need (due to regulatory requirements) to duplicate
   those system user settings for how captions and subtitles get
   displayed. This compounds across web sites, as each site provides
   its own set of user settings. 
6. The bandwidth cost of delivering all this custom javascript.
7. The performance cost of executing all this custom javascript.

Given how costly this is, why do people ever go down this path?
Unfortunately, delivering text tracks in WebVTT can sometimes be too
costly or not possible:

1. There are storage and (potentially lossy) conversion costs if one
   has an existing corpus of subtitle and caption data in other
   formats.
2. It can also be awkward and error-prone to generate webvtt on the fly
   for live captioning or similar cases (e.g. the dynamic generation of
   text tracks using a TTS engine).

### Goals

* Allow video publishers to continue storing captions in legacy or
  custom formats, but then allow those to be represented by a
  restricted subset of HTML.
* Give users control the presence and style of captions with
  system accessibility settings.

As exposing user preferences to web content would be an unacceptable
fingerprinting vector, we arrive at a third goal:

* Allow captions to be served in custom formats, but still be rendered
  by the browser engine.

### Non-goals

* It's not a goal to add native processing of out-of-band text track
  formats other than WebVTT to the web platform.
   
## Overview of proposed web platform changes

We propose *refactoring the web platform's text track APIs* to *decouple
the delivery format* of out-of-band text tracks from the browser's
ability to display subtitles and captions. This should:

1. Reduce the engineering cost of website code development and
   maintenance.
2. Reduce the bandwidth cost of delivering all this custom javascript.
3. Allow websites to (re)gain the ability to respect system conventions
   or user preferences when displaying captions and subtitles.
4. Reduce the need for duplicate user settings for how
   captions and subtitles get displayed.
5. Let websites (re)gain the ability to hook into platform features like
   picture-in-picture and media fullscreen.
6. See performance benefits from reducing the amount of bespoke
   javascript involved.
   
This refactoring may also benefit the internals of browser engines,
because in-band text tracks can come in a variety of formats. This
refactoring should allow the code that handles each in-band text track
format to target a common rendering pipeline which would be the very
same rendering pipeline exposed as API to sites for out-of-band text
tracks. So this refactoring defines **a low-level capability** of the
platform, it helps to **explain what browser engines already do**, and
it’s pretty **straightforward to polyfill**. If these points sound
familiar, they should! They’re literally three pillars of the
[Extensible Web Manifesto][].

This will require coordinated updates to several specs:

* [CSS Pseudo-Elements][]
* [HTML][]
* [WebVTT][]

As this proposal matures, we expect it to result in pull requests on
these specs.

### CSS Pseudo-Elements

1. Move the pseudo-elements defined in [WebVTT CSS extensions][] to
   [CSS Pseudo-Elements][], and define them in a host-language agnostic
   manner.

### HTML

1. Expose a constructor for [TextTrackCue][] which takes
   [startTime][], [endTime][], and `cueNode` arguments.
2. Define authoring and processing requirements for [cue fragments][]
   (which see).
3. Add `cue` and `cuebackground` [global attributes][].

### WebVTT

1. Specify that [VTTCue()]() calls its superclass' new constructor,
   generating `cueNode` from `text` as described in the next item.
2. Setting the `text` attribute should update `cueNode` by applying the
   [WebVTT cue text DOM construction rules][] to the result of applying
   the [WebVTT cue text parsing rules][] to the [cue text][].
3. Ensure that the [WebVTT cue text DOM construction rules][] generate a
   [DocumentFragment][] compatible with the authoring and processing
   requirements of [cue fragments][].

### Cue Fragments

A **cue fragment** is a [DocumentFragment][] containing cue text,
represented in a limited subset of HTML and styled with CSS using
::[cue][] and ::[cue-region][].

The `<b>`, `<br>`, `<i>`, `<div>`, `<p>`, `<rb>`, `<rt>`, `<rtc>`,
`<ruby>`, `<span>` elements are allowed, as are [text nodes][].

The **`cue`** and **`cuebackground`** attributes must each appear once.
The attribute can appear on the same element. The `cue` attribute
identifies the element containing the cue text, and the `cuebackground`
identifies the cue's background.

Here are some simple examples:

```HTML
<p cuebackground><span cue>This is a simple cue.</span></p>
<div cuebackground cue>This is a <b>simple</b> cue.</div>
```

## Using the API and styling cues

It is expected that the API will be used as follows:

```js
// Get a reference to a video element.
const videoElement = document.getElementById("someVideoElement");

// Create a new text track.
const textTrack = videoElement.addTextTrack("captions", "English", "en");
textTrack.mode = 'showing';

// Create a new cue fragment.
const cueFragment = document.createDocumentFragment();
const div = document.createElement("div");
div.cuebackground = true;
div.innerHTML = "This is a <span cue class='important'>cue</span>.";
cueFragment.appendChild(div);
const cue = new TextTrackCue(0, 30, cueFragment);

// Now add the cue to the text track.
textTrack.addCue(cue);
```

And then the `::cue` and ::`cuebackground` pseudo-elements can be used
to style the text track cue:

```css
::cue {
  color: white;
  font-size: 1.5em;
  font-weight: bold;
}

::cue.important {
  border: 1px solid red;
}

::cuebackground {
  background-color: black;
  opacity: 0.5;
}
```

## Considered alternatives

### Abstract Data Model

We initially considered defining an abstract data model for the
formatted text track data. The goal was to define an expressive model
that would be easy to generate and manipulate from JavaScript, and that
would be straightforward to target from popular formats, minimally
WebVTT and IMSC1. WebVTT would then be redefined in terms of this data
model.

At TPAC 2019 in Fukuoka, we got a lot of feedback that directly
supplying HTML & CSS would be preferable.

Some disliked the esthetics of having a separate tree of nodes that
looked an awful lot like, but were not, DOM nodes. Authors of popular JS
media libraries made the point that they'll need to keep the code they
use to generate HTML anyway, for use on older browsers that don't
support these API changes. All agreed that authoring HTML and CSS is
something they're comfortable doing in this case.

## Stakeholder Signals

This propsal was intially presented at TPAC 2019 and again at TPAC 2023.

Implementer and community interest will be gathered through pull requests
to the various specification and through coordiantion with the relevant
working groups, namely:

 * W3C Timed Text Working Group
 * Web Media Text Tracks Community Group
 * Web Hypertext Application Technology Working Group
 * CSS Working Group

## Acknowledgements

Pierre-Anthony Lemieux did extensive work on the earlier form of this
proposal, in which he developed an abstract data model—based on
IMSC1—that the API would have ingested. While we chose to go in a
somewhat (though not very) different direction after feedback at TPAC
2019, we are forever indebted to his excellent groundwork.

[CSS Pseudo-Elements]: https://drafts.csswg.org/css-pseudo-4/
[DocumentFragment]: https://dom.spec.whatwg.org/#documentfragment
[Extensible Web Manifesto]: https://github.com/extensibleweb/manifesto
[HTML]: https://html.spec.whatwg.org/multipage/
[TextTrackCue]: https://html.spec.whatwg.org/multipage/media.html#texttrackcue
[VTTCue]: https://w3c.github.io/webvtt/#vttcue
[WebVTT CSS extensions]: https://w3c.github.io/webvtt/#css-extensions
[WebVTT cue text DOM construction rules]: https://w3c.github.io/webvtt/#dom-construction-rules
[WebVTT cue text parsing rules]: https://w3c.github.io/webvtt/#webvtt-cue-text-parsing-rules
[WebVTT]: https://w3c.github.io/webvtt/
[br]: https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-br-element
[cue fragment]: #cue-fragments
[cue fragments]: #cue-fragments
[cue text]: https://w3c.github.io/webvtt/#cue-text
[cue-region]: https://w3c.github.io/webvtt/#css-extensions
[cue]: https://w3c.github.io/webvtt/#css-extensions
[div]: https://html.spec.whatwg.org/multipage/grouping-content.html#the-div-element
[endTime]: https://html.spec.whatwg.org/multipage/media.html#dom-texttrackcue-endtime
[getCueAsHTML()]: https://w3c.github.io/webvtt/#dom-vttcue-getcueashtml
[global attributes]: https://html.spec.whatwg.org/multipage/dom.html#global-attributes
[img]: https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element
[p]: https://html.spec.whatwg.org/multipage/grouping-content.html#the-p-element
[rt]: https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-rt-element
[ruby]: https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-ruby-element
[span]: https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-span-element
[startTime]: https://html.spec.whatwg.org/multipage/media.html#dom-texttrackcue-starttime
[style attributes]: https://html.spec.whatwg.org/multipage/dom.html#the-style-attribute
[style element]: https://html.spec.whatwg.org/multipage/semantics.html#the-style-element
[text nodes]: https://dom.spec.whatwg.org/#interface-text
