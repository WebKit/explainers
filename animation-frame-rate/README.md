# Controlling Animation Frame Rate

## Authors:

- [Antoine Quint](https://github.com/graouts)
- [Simon Fraser](https://github.com/smfr)

## Participate
- https://github.com/WebKit/explainers

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [tl;dr](#tldr)
- [Introduction](#introduction)
- [Variable frame rate](#variable-frame-rate)
- [Use cases](#use-cases)
- [General proposal](#general-proposal)
- [Proposed changes to existing technologies](#proposed-changes-to-existing-technologies)
  - [Web Animations](#web-animations)
  - [CSS Animations and CSS Transitions](#css-animations-and-css-transitions)
  - [JavaScript Animations](#javascript-animations)
- [Privacy considerations](#privacy-considerations)
- [Considered alternatives](#considered-alternatives)
- [Acknowledgements](#acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## tl;dr

We propose adding a `frameRate` property on the `Animation` interface to allow authors to run animations at a higher or lower frame rate than the default frame rate the browser uses to [update the page rendering](https://html.spec.whatwg.org/multipage/webappapis.html#update-the-rendering).

## Introduction

Plenty of devices sport displays with refresh rates that are greater than 60Hz; mobile devices exist with 90Hz and 120Hz refresh rates, and desktop screens exist with 144Hz and 240Hz refresh rates.

Starting with the iPad Pro in 2018 and now in 2021 with the iPhone 13 Pro and the 14” and 16” 2021 MacBooks Pro, Apple devices have supported multiple refresh rates under the moniker [ProMotion](https://developer.apple.com/documentation/quartzcore/optimizing_promotion_refresh_rates_for_iphone_13_pro_and_ipad_pro). Using this technology, displays may refresh their display at up to 120Hz, but can also adjust to various refresh rates along the way, instead of using the constant refresh rate of 60Hz.

On Apple's 120Hz devices, accelerated already run at 120Hz thanks to Core Animation's built-in support for the ProMotion technology, whereas the rest of the Web page only updates at 60Hz. This "rest of the Web page" includes script-driven animations using `requestAnimationFrame()` as well as all non-accelerated Web Animations (including CSS Transitions and CSS Animations).

WebKit chose to restrict web content updates to 60Hz for two reasons: first, we measured a significant increase in power usage, and second, we found several examples of web pages that had incorrect behavior when `requestAnimationFrame()` callbacks were fired at a non-60Hz frequency.

However, now that there are more devices with high refresh rate displays, we believe it's judicious to propose advancing the Web platform to take advantage of higher refresh rates and allow authors to choose a suitable refresh rate for different kinds of animations.

## Variable frame rate

Most high refresh-rate displays actually use variable refresh rates; for example, a 120Hz display might be able to update at 120Hz, 60Hz, 30Hz, etc. This frequency adaptation is responsive to content being displayed on screen, for instance it's optimal to refresh the display at 24Hz playing a 24fps video in fullscreen with no visible UI.

But the frame rate variation may be dictated by other factors than just the content. For instance, the system may impose frame rate limits when in low power mode, or when the target frame rate has not been achieved or some period of time.

Generally, it is important to account for the power cost of updating at a high frequency, and driving the display at its maximum frequency is not something that should be encouraged unless it helps fulfilling compelling use cases on the web.

## Use cases

We think that it's important that API enhancements in this area allow authors to communicate the need for both higher and lower-frequency animations. There is generally two categories we see where the authors would want to specify an intent to update at a rate different than the default.

**Higher Frequency**

* WebGL or 2D canvas game or visualization
* High-impact CSS/SVG/DOM animation

**Lower Frequency**

* Animation on a small element (e.g. progress meter)
* Background ambient animation
* Fade animations (opacity, color, some filters) where lower frame rates are less noticeable
* Animated content that uses a `steps()` timing function

Outside of animations that may benefit from a lower frame rates without jeopardizing their overall impact, authors may want to preserve power usage by generally taking a conservative approach towards opting into higher frame rate animations.

## General proposal

We propose that authors are able specify an intent conveying the frame rate at which animations are run. Using the maximum attainable frame rate, advertised on the document's timeline, authors can specify frame rates that can realistically be achieved. Additionally, they may choose from a series of pre-defined relative values such as `auto`, `low`, `high` and `highest`.

## Proposed changes to existing technologies

### Web Animations

Animations created using the [Web Animations API](https://www.w3.org/TR/web-animations-1) can indicate their `frameRate` by providing one of four values from the `AnimationFrameRatePreset` enum, the default value being `auto`, matching the browser's default frame rate used to [update the page rendering](https://html.spec.whatwg.org/multipage/webappapis.html#update-the-rendering). Alternatively, the `frameRate` property may be set to a numeric value.

In order to set frame rates that may best align with the refresh rate of the device's display, the document timeline advertises its `maximumFrameRate`. Setting frame rates that are the result of dividing this value by a whole number is usually the best way to expect the provided frame rate to be met. 

```idl
typedef unsigned long FramesPerSecond;

interface DocumentTimeline {
    readonly attribute FramesPerSecond? maximumFrameRate;
};

enum AnimationFrameRatePreset { "auto", "low", "high", "highest" };

interface Animation {
    attribute (FramesPerSecond or AnimationFrameRatePreset) frameRate;
};
```

### CSS Animations and CSS Transitions

Authors can declare the impact of a CSS Animation or CSS Transition in CSS with the new properties, `animation-frame-rate` and `transition-frame-rate`, with values `auto`, `low`, `high` and `highest` or a specified numeric value.

> **Note:** there may be some nuances here around the timing of transition and animation events; for example, if the end of an animation iteration for a 30fps animation falls close to a 4ms boundary, when is the `animationiteration` events fired?

### JavaScript Animations

Most JavaScript-based animations on the web today use `requestAnimationFrame()`. However, we don't think this is a good extension point for variable-frequency animations.

The [Web Animations 2](https://drafts.csswg.org/web-animations-2) specification introduces the notion of [Custom Effects](https://drafts.csswg.org/web-animations-2/#custom-effects), a powerful way to run script-based animations while leveraging the Web Animations timing model. With the Web Animations extension described above, we believe this is the most appropriate way for web developers to request JavaScript callbacks for animation while communicating animation intent to the user agent.

WebKit is dedicated to push the concept of Custom Effects forward and has revived standardization discussions (https://github.com/w3c/csswg-drafts/issues/6861) about that feature and experimental support (https://trac.webkit.org/changeset/286555/webkit) behind an off-by-default flag is available.

> **Note:** In the context of `OffscreenCanvas` and [`DedicatedWorkerGlobalScope`](https://html.spec.whatwg.org/#dedicatedworkerglobalscope), which lend themselves particularly well to the implementation of high performance canvas-based games or visualization, `requestAnimationFrame()` is currently the sole way to drive an animation. In the future, this proposal will investigate the possibility to expose the Web Animations API to `DedicatedWorkerGlobalScope` with a shared time origin with the main frame's timeline. It is not clear yet if this will prove to be a workable solution.

## Privacy considerations

We don't believe this proposal exposes any new fingerprinting vector as existing Web Platform APIs could already be used to simply identify the device's maximum refresh rate, potentially helping to help identify circumstances under which the animation frame rate is limited due to engaging low-power mode or or responding to thermal pressure.

## Considered alternatives

An earlier internal draft of this proposal discussed only providing intent through the use of keywords, disallowing the use of a numeric value. This was primarily driven by privacy considerations, hoping not to have to expose the maximum device frame rate, but we have since then acknowledged the fact that this information is already readily available to page authors.

Another alternative would have been to propose a solution based on the `requestAnimationFrame()` API. However, we believe this API is not to be developed further for animation purposes and that any new animation-related capabilities should be added through the Web Animations API, barring any strong arguments against that.

## Acknowledgements

Many thanks for valuable feedback and advice from:

- Dean Jackson
- Myles Maxfield
