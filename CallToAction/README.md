
# Media Session Call-to-Action Button Explainer
Author: Dana Estra

## Background

A highly requested feature from web developers is a way to let the viewer interact
with an ad playing in Picture-in-Picture. The media session action handler
`"skipad"` lets the user skip an ad, but there is no way for the site to offer the
user a way to act on the ad the same way inline video ad experiences often offer a
"Learn More" or "Download App" button. This document proposes a new web API that
lets user agents display an action button in the Picture-in-Picture window
during playback of an advertisement.


## `MediaSessionAction`

A new `"call-to-action"` value is added to the existing `MediaSessionAction` enum:

```webidl
enum MediaSessionAction {
    "play",
    "pause",
    // ...
    "skipad",
    "call-to-action",
    // ...
};
```

Example usage:

```js
navigator.mediaSession.setActionHandler("call-to-action", () => {
    window.open("https://example-advertiser.com", "_blank");
});
```

## Declaring the label

The button's label would not be an arbitrary, site-supplied string. The site would
instead pick from a fixed set of labels. The list shown below is speculative and
not final:

```webidl
enum CallToActionLabel {
    "Visit Website",
    "Download",
    "Learn More",
};
```

There are several ideas for how the website should tell the browser which label to
display:

- **As a `MediaMetadata` property** — declaring `callToActionLabel` alongside
  `title`/`artist`/`artwork`.
- **As an optional parameter on `setActionHandler()`** — bundling the label with
  the handler that responds to it.

### Idea 1: A `MediaMetadata` property

One option is a new `MediaMetadata` property, `callToActionLabel`, whose value is
drawn from `CallToActionLabel`, with a default value of `"Learn More"`:

```webidl
partial interface MediaMetadata {
    attribute CallToActionLabel callToActionLabel;
};

partial dictionary MediaMetadataInit {
    CallToActionLabel callToActionLabel = "Learn More";
};
```

Example usage:

```js
navigator.mediaSession.metadata = new MediaMetadata({
    callToActionLabel: "Visit Website",
});
```

### Idea 2: An optional parameter on `setActionHandler()`

An alternative idea for how the website can declare the button label is through an
optional dictionary parameter on `MediaSession.setActionHandler()` :

```webidl
dictionary MediaSessionActionHandlerOptions {
    CallToActionLabel label;
};

partial interface MediaSession {
    undefined setActionHandler(MediaSessionAction action, MediaSessionActionHandler? handler, optional MediaSessionActionHandlerOptions options = {});
};
```

Example usage:

```js
navigator.mediaSession.setActionHandler("call-to-action", () => {
    window.open("https://example-advertiser.com", "_blank");
}, { label: "Visit Website" });
```

