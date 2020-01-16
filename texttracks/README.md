# TextTrackCue enhancements for programmatic subtitle and caption presentation

## Authors:

- Eric Carlson (@eric-carlson)
- Theresa O'Connor (@hober)

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
- [Considered alternatives](#considered-alternatives)
  - [Abstract Data Model](#abstract-data-model)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [Acknowledgements](#acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

Native UA rendering of out-of-band subtitles and captions is currently
only possible with WebVTT. If a site can't or won't make its subtitles
available in-band, and can't or won't publish its subtitles and captions
in WebVTT, the site must render its subtitles and captions itself.

If a site implements its own subtitle and caption rendering, it incurs
many costs:

1. the engineering cost of maintaining bespoke text track display code;
2. the inability of bespoke text track display code to respect system
   conventions or user preferences re: display of captions and
   subtitles;
3. the inability of bespoke code to hook into platform features like
   picture-in-picture and some forms of media fullscreen;
4. relatedly, the need (due to regulatory requirements) to duplicate
   those system user settings re: how captions and subtitles get
   displayed;
5. the bandwidth cost of delivering all this custom javascript;
6. the performance cost of executing all this custom javascript.

Given how costly this is, why do people ever go down this path?
Unfortunately, delivering text tracks in WebVTT can sometimes be too
costly.

1. There are storage and (potentially lossy) conversion costs if you
   have a large existing corpus of subtitle and caption data in other
   formats.
2. It can also be awkward and error-prone to generate webvtt on the fly
   for live captioning or similar cases (e.g. the dynamic generation of
   text tracks using a TTS engine)

### Goals

Users can be frustrated when subtitles and captions don't respect their
display preferences or their platform's conventions, and when they don't
appear in picture-in-picture.

Users find having to set their subtitle and captioning preferences in
multiple places (system-wide and per-site) to be cumbersome and
redundant.

Our goal is to make it so that subtitles and captions can appear *where*
users want them to (e.g. in PiP), and can appear *as* users want them to
(i.e. respecting their preferences and their platform's conventions).

### Non-goals

1. It's not a goal to add native processing of out-of-band text track
   formats other than WebVTT to the web platform.
2. Exposing the values of user preferences to web content is
   unacceptable for fingerprinting reasons; therefore, it's a non-goal
   to expose such values to sites.

## Overview of proposed web platform changes

We propose *refactoring the web platform's text track APIs* to *decouple
the delivery format* of out-of-band text tracks from the browser's
native ability to display subtitles and captions. This should

1. reduce the engineering cost of website code development and
   maintenance;
2. reduce the bandwidth cost of delivering all this custom javascript;
3. allow websites to (re)gain the ability to respect system conventions
   or user preferences re: display of captions and subtitles;
4. websites no longer need to to duplicate user settings re: how
   captions and subtitles get displayed;
5. let websites (re)gain the ability to hook into platform features like
   picture-in-picture and media fullscreen;
6. see performance benefits from reducing the amount of bespoke
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

1. Add a [DocumentFragment][] `cueNode` attribute to [TextTrackCue][].
2. Expose a constructor for [TextTrackCue][] which takes
   [startTime][], [endTime][], and `cueNode` arguments.
3. Define authoring and processing requirements for [cue fragments][]
   (which see).
4. Add `cue` and `cuebackground` [global attributes][].
5. Move [getCueAsHTML()][] from [VTTCue][] up to [TextTrackCue][] and
   define it in terms of `cueNode`.
6. Move integration of ::[cue][] and ::[cue-region][] with the
   platform's text track model from [WebVTT][] to [HTML][].

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
represented in a limited subset of HTML and styled with CSS with
::[cue][] and ::[cue-region][].

The [br][], [div][], [img][], [p][], `rb`, [rt][], `rtc`, [ruby][], and
[span][] elements are allowed, as are [text nodes][].

The **`cue`** and **`cuebackground`** attributes must each appear once.
The `cue` attribute identifies the element containing the cue text, and
the `cuebackground` identifies the cue's background. The `cue` attribute
must appear on an element which is a descendent of the element on which
the `cuebackground` element appears.

Here's a simple example:

```<p cuebackground><span cue>This is a simple cue.</span></p>```

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

## Stakeholder Feedback / Opposition

* Apple / Safari / WebKit: prototyped as an experimental feature named "Generic Text Track Cue API". The prototype is available in Safari Technology Preview.
* Firefox / Gecko: Jean-Yves Avenard (@jyavenard) and Nils liked the idea, but we still need to run it by someone who works on captioning in Gecko.
* Google / Chrome / Blink: Mixed signals. Chris Cunningham (@chcunningham) and Joey Parrish (@joeyparrish) have both expressed interest / support, and Mounir Lamouri (@mounirlamouri) has expressed opposition.
* Developers of several JS video libraries (e.g. Gary Katsevman (@gkatsev) of @videojs, Joey Parrish (google/shaka-player), Pierre-Anthony Lemieux of sandflow/imscJS, and someone from the Netflix frontend team whose name escapes me) have expressed support of the general approach, as feedback on our presentations at FOMS and TPAC in 2019.

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
