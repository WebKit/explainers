# Per-edge viewport-fit

## Authors

- [Aditya Keerthi](https://github.com/pxlcoder)
- [Tim Horton](https://github.com/hortont424)

## Participate

- https://github.com/WebKit/explainers/issues

## Status

Being implemented in WebKit, for iOS, behind the `PerEdgeViewportFitEnabled` preference, which is off by default.

## Table of contents

- [tl;dr](#tldr)
- [Introduction](#introduction)
- [Use cases](#use-cases)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [Proposal](#proposal)
  - [Syntax](#syntax)
  - [Layout](#layout)
  - [Safe area insets](#safe-area-insets)
  - [Changing the viewport](#changing-the-viewport)
  - [Example](#example)
- [Progressive enhancement](#progressive-enhancement)
- [Considered alternatives](#considered-alternatives)
- [Privacy and security considerations](#privacy-and-security-considerations)
- [Open questions](#open-questions)
- [Implementation in WebKit](#implementation-in-webkit)
- [References](#references)

## tl;dr

`viewport-fit=cover` lets a page extend underneath the parts of the display that may be obscured, such as the status bar, the sensor housing and the home indicator, but only at all four edges of the viewport at once. We propose four keys for the viewport `<meta>` element, `viewport-fit-top`, `viewport-fit-right`, `viewport-fit-bottom` and `viewport-fit-left`, that each set `viewport-fit` for one edge. A page can then cover the unsafe area at the edges it was designed for, and leave it to the browser to keep the page clear of the unsafe area at the others.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit-top=cover">
```

## Introduction

Many devices have displays that web content can't entirely use. The corners of the display may be rounded, a sensor housing may cut into it, and the system may draw its own UI, such as a status bar or a home indicator, on top of the page. The part of the display that is clear of all of these is the *safe area*.

By default, browsers keep pages within the safe area. With the `viewport-fit` key of the [viewport `<meta>` element](https://drafts.csswg.org/css-viewport/#viewport-meta), a page can instead ask to fill the whole display. As defined in [CSS Round Display](https://drafts.csswg.org/css-round-display/#viewport-fit-property), `viewport-fit` has three values:

- `auto`, the default, doesn't affect the initial layout viewport.
- `contain` sets the initial layout viewport to the largest rectangle inscribed in the display.
- `cover` sets the initial layout viewport to the rectangle circumscribing the display.

A page that covers the display then uses the [safe area insets](https://drafts.csswg.org/css-env-1/#safe-area-insets), `env(safe-area-inset-top)`, `env(safe-area-inset-right)`, `env(safe-area-inset-bottom)` and `env(safe-area-inset-left)`, to keep its text and controls within the safe area, while its backgrounds extend underneath the unsafe area:

```css
header {
    padding-top: env(safe-area-inset-top);
    background: navy;
}
```

However, `viewport-fit` applies to every edge of the viewport at once. A page that only wants its header to run underneath the status bar has to cover the unsafe area at all four edges, and take over the job of keeping its content clear of it at the three edges it didn't want to cover:

- Every element that touches those edges has to account for the safe area insets, including fixed and sticky elements, full-bleed sections and dialogs, as well as content the page may not control, such as cookie banners, chat widgets and ads from third parties.
- The page has to recreate what the browser did at those edges, such as letting the end of the document scroll clear of the home indicator.
- When the device rotates to landscape, the sensor housing moves to the left or right edge of the viewport, so a page that was only designed to cover the top also has to handle the sides.

In practice, many pages either don't use `cover`, or use it and leave content underneath the unsafe area at the edges their authors didn't consider.

## Use cases

- A page with a colored header or a hero image wants it to run underneath the status bar and sensor housing at the top of the display, while the rest of the page, including its bottom toolbar and its cookie banner, stays clear of the home indicator.
- A web app with a tab bar fixed to the bottom of the viewport wants the tab bar's background to reach the bottom of the display, behind the home indicator, without having to keep the rest of the page clear of the status bar, or of the sensor housing in landscape.
- A page with full-bleed images, maps or carousels wants them to reach the left and right edges of the display in landscape, while its text stays within the safe area at the top and bottom.
- A page designed to cover the whole display embeds content it can't adapt near one edge, and wants the browser to keep the page within the safe area at that edge only.
- A site moving to `viewport-fit=cover` wants to adopt it one edge at a time, rather than auditing every edge of every page at once.

## Goals

- Let a page choose, for each edge of the viewport, whether it extends underneath the unsafe area.
- Use the same values as `viewport-fit`, with the same meaning at each edge as `viewport-fit` has at every edge.
- Leave pages that don't use the new keys, including pages that use `viewport-fit`, unaffected.
- Expose no information to the page that it can't already get with `viewport-fit=cover`.

## Non-goals

- Changing the meaning of `viewport-fit`, or of the safe area insets at an edge that covers the unsafe area.
- Letting pages control browser UI, such as whether toolbars are shown.
- Fitting pages to non-rectangular displays, which CSS Round Display addresses with other features.

## Proposal

### Syntax

We propose four keys for the viewport `<meta>` element:

- `viewport-fit-top`
- `viewport-fit-right`
- `viewport-fit-bottom`
- `viewport-fit-left`

Each accepts the same values as `viewport-fit`, `auto`, `contain` and `cover`, and is parsed the same way, so keys and values are ASCII case-insensitive.

The *viewport-fit of an edge* is the value of that edge's key, if the page specifies a valid value for it, and the value of `viewport-fit` otherwise. A browser ignores an invalid value for an edge, so the edge keeps following `viewport-fit`, rather than reverting to `auto` as an invalid value for `viewport-fit` does.

| `content` | Top | Right | Bottom | Left |
| --------- | --- | ----- | ------ | ---- |
| `viewport-fit=cover` | `cover` | `cover` | `cover` | `cover` |
| `viewport-fit-top=cover` | `cover` | `auto` | `auto` | `auto` |
| `viewport-fit-bottom=cover` | `auto` | `auto` | `cover` | `auto` |
| `viewport-fit-left=cover, viewport-fit-right=cover` | `auto` | `cover` | `auto` | `cover` |
| `viewport-fit=cover, viewport-fit-bottom=contain` | `cover` | `cover` | `contain` | `cover` |
| `viewport-fit=cover, viewport-fit-top=auto` | `auto` | `cover` | `cover` | `cover` |
| `viewport-fit=cover, viewport-fit-bottom=sideways` | `cover` | `cover` | `cover` | `cover` |

As with `viewport-fit`, only the viewport `<meta>` element of the top-level document has an effect.

### Layout

The browser sets the initial layout viewport and the visual viewport edge by edge, according to each edge's viewport-fit:

- At an edge that is `contain`, the edge of the viewport is the corresponding edge of the largest rectangle inscribed in the display.
- At an edge that is `cover`, the edge of the viewport is the corresponding edge of the rectangle circumscribing the display.
- At an edge that is `auto`, the edge of the viewport is unaffected, as it is with `viewport-fit=auto`.

In other words, each edge behaves the way it does today when `viewport-fit` has the same value for the whole viewport. When every edge has the same viewport-fit, the result is the same as `viewport-fit` having that value, so a page that doesn't use the new keys lays out exactly as it does today.

### Safe area insets

The safe area insets are insets from the edges of the viewport, so they follow from where each edge of the viewport is:

- At an edge that is `cover`, the safe area inset is the distance from that edge of the viewport to the safe area, as it is today with `viewport-fit=cover`.
- At any other edge, the edge of the viewport is already within the safe area, so the safe area inset is 0.

As a result, a page can pad its content with the safe area inset at every edge, and its content stays clear of the unsafe area whichever edges cover it.

### Changing the viewport

A page can change the new keys at any time, by changing the `content` attribute of its viewport `<meta>` element, as it can with any other key. The browser then updates the viewport and the safe area insets, as it does when `viewport-fit` changes.

### Example

A web app with a tab bar fixed to the bottom of the viewport covers the unsafe area at the bottom edge only:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit-bottom=cover">
<style>
nav.tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding-bottom: env(safe-area-inset-bottom);
    background: white;
}
</style>
```

The tab bar's background reaches the bottom of the display, behind the home indicator, and its padding keeps its buttons above the home indicator. The browser keeps the rest of the page clear of the status bar at the top, and of the sensor housing at the left or right in landscape, where the safe area insets are 0.

## Progressive enhancement

Browsers ignore keys in the viewport `<meta>` element that they don't recognize. In a browser that doesn't support the new keys:

- A page that only covers some edges, such as one using `viewport-fit-top=cover`, stays within the safe area at every edge, as it would without the key. It loses the extension underneath the unsafe area, but none of its content is obscured.
- A page that covers every edge but some, such as one using `viewport-fit=cover, viewport-fit-bottom=contain`, covers every edge. If it pads its content with the safe area inset at the edges it keeps within the safe area, too, it works in both kinds of browsers, since the safe area inset is 0 at those edges in a browser that supports the new keys.

## Considered alternatives

### Covering every edge and padding with the safe area insets

Pages can already cover the unsafe area at every edge, and pad their content with the safe area insets at the edges they don't want to cover. As described in the [introduction](#introduction), this forces the page to take responsibility for every edge in order to extend underneath one, and to recreate what the browser already does to keep a page within the safe area.

### Multiple values for viewport-fit

`viewport-fit` could accept up to four values, one for each edge, like the `margin` shorthand in CSS, such as `viewport-fit=cover contain contain contain`. However, the syntax of the viewport `<meta>` element uses whitespace to separate keys from one another, so existing browsers read this as `viewport-fit=cover` followed by a key named `contain`, covering every edge. Using a different separator within the value would be new to the viewport `<meta>` element. Separate keys keep to its existing pattern of one value for each key, and let a page specify the edges independently.

### Values that name edges

`viewport-fit` could accept new values that name the edges to cover, such as `viewport-fit=cover-top`. Covering any combination of edges this way needs either fifteen values or a list of values, which has the problem described above.

### Logical edges

The keys could name logical edges, such as `viewport-fit-block-start`, rather than physical ones. However, the unsafe area comes from the physical display and from how the device is held, not from the page's writing mode: the status bar is at the top of a page written vertically, or right to left, too. Logical keys would make the edge that covers the unsafe area depend on the writing mode, and wouldn't line up with the safe area insets, which are physical.

### A CSS property

The viewport-fit of each edge could be set in CSS, such as with a property on the root element. However, CSS Round Display originally defined `viewport-fit` as a [descriptor of the `@viewport` rule](https://www.w3.org/TR/css-round-display-1/#viewport-fit-descriptor), which browsers no longer support, and pages set it in the viewport `<meta>` element today. Keeping the new keys next to `viewport-fit` lets pages set the viewport-fit of the whole viewport and of each edge in one place, which the browser knows about before it lays out the page.

## Privacy and security considerations

The proposal doesn't expose any new information. A page can already read the safe area insets at every edge with `viewport-fit=cover`, and with the new keys, it reads them at the same edges or at fewer of them.

The proposal doesn't let a page draw anywhere it can't already draw with `viewport-fit=cover`.

## Open questions

- **The meaning of `auto` at an edge.** We propose that `auto` at an edge means the browser's default for that edge, as `viewport-fit=auto` does for the whole viewport, so that a page can return one edge to the default while the others cover the unsafe area. An edge without a key already follows `viewport-fit`.

## References

- [CSS Round Display Module Level 1, `viewport-fit`](https://drafts.csswg.org/css-round-display/#viewport-fit-property)
- [CSS Viewport Module Level 1, the viewport `<meta>` element](https://drafts.csswg.org/css-viewport/#viewport-meta)
- [CSS Environment Variables Module Level 1, safe area insets](https://drafts.csswg.org/css-env-1/#safe-area-insets)
- [Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/), the WebKit blog post that introduced `viewport-fit` and the safe area insets
