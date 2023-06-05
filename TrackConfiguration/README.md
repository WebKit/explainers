# TrackConfiguration Explainer

## Authors:

* [Jer Noble](https://github.com/jernoble)

## Participate

* https://github.com/WebKit/explainers

## tl;dr

We propose adding a `configuration` property on the `VideoTrack` and `AudioTrack` interfaces to allow authors to read media file properties as determined by the User Agent.

## Introduction

There are a number of web APIs which ingest specific data about video and audio codecs and formats. [MediaCapabilites](https://w3c.github.io/media-capabilities/), for one example, lets a page query whether a given `VideoConfiguration` or `AudioConfiguration` are supported. [WebCodecs](https://w3c.github.io/webcodecs/), for another, allows a page to construct a `VideoFrame` with a particular `VideoColorSpace`. [WebAudio](https://webaudio.github.io/web-audio-api/), for a third, allows a page to create an `AudioContext` with a specific sample rate, and attach a media element via `MediaElementSourceNode`.  However, the mechanism by which a page is supposed to determine the properties of a particular piece of media exist only outside the web platform.

## Use cases

A page would like to implement something akin to YouTube’s “Stats for Nerds” panel. It may not have the ability to know the media’s configuration out-of-band. 

A page allows users to upload content from their own device, but the page would like to do on-device pre-flighting that the media’s codecs were supported by the upload service.

A page would like to create an `AudioContext` whose `sampleRate` matches the sample rate of a particular piece of audio content.

A page would like to validate that its encoder and muxer generates media whose `VideoColorSpace` is correctly parsed by the browser.

## Proposed changes to existing technologies

### HTML Media

The `HTMLMediaElement`’s `VideoTrack` and `AudioTrack` objects would vend a new attribute `VideoTrackConfiguration` and `AudioTrackConfiguration`. 

```
interface VideoTrackConfiguration {
    readonly attribute DOMString codec;
    readonly attribute unsigned long long bitrate;
    readonly attribute double framerate;
    readonly attribute unsigned long width;
    readonly attribute unsigned long height;
    readonly attribute VideoColorSpace colorSpace;
};

interface AudioTrackConfiguration {
    readonly attribute DOMString codec;
    readonly attribute unsigned long long bitrate;
    readonly attribute unsigned long sampleRate;
    readonly attribute unsigned long numberOfChannels;
};

partial interface VideoTrack {
    readonly attribute VideoTrackConfiguration configuration
};

partial interface AudioTrack {
    readonly attribute AudioTrackConfiguration configuration
};
```

`VideoTrackConfiguration`’s `colorSpace` object, in particular, is borrowed from [WebCodecs](https://w3c.github.io/webcodecs/#videocolorspace). 

The `VideoTrackList` and `AudioTrackList` objects would have a new event handler `onconfigurationchange`, which would fire a `TrackEvent` event referencing the `VideoTrack` or `AudioTrack` whose configuration has changed.

```
partial interface VideoTrackList {
    attribute EventHandler onconfigurationchange;
};

partial interface AudioTrackList {
    attribute EventHandler onconfigurationchange;
};
```

The attributes exposed through `VideoTrackConfiguration` and `AudioTrackConfiguration` should be filled with values as understood by the browser. For example, if in the absence of explicit color space information the browser assumes BT.709, it should return `“bt709“` in the configuration’s `colorSpace.primaries` rather than `null`.

## Privacy considerations

Due to the risk of leaking information across security origins, the `VideoTrackConfiguration` and `AudioTrackConfiguration` objects for media elements whose media data is [CORS cross-origin](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-cross-origin) should be empty.


