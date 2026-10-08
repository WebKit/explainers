# Animation Custom Effects

## Authors:

- [Antoine Quint](https://github.com/graouts)

## Participate
- https://github.com/WebKit/explainers

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [tl;dr](#tldr)
- [CustomEffect](#customeffect)
- [The `progress` event](#the-progress-event)
- [Processing order of custom effects and `progress` events.](#processing-order-of-custom-effects-and-progress-events)
- [Further Considerations](#further-considerations)
- [Acknowledgements](#acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## tl;dr

We propose extending the Web Animations API to support callback-based animations. This allows Web authors to use the full power of the Web Animations API to replace animation loops previously backed by `requestAnimationFrame`, enabling complex timing, playback control and association with scroll-driven timelines.

## CustomEffect

The new `CustomEffect` interface allows for an animation to be backed entirely by a JavaScript callback. It allows Web authors to use the full power of the Web Animations API to replace animation loops previously backed by `requestAnimationFrame`, allowing for complex timing, playback control and association with scroll-driven timelines. 

```idl
callback CustomEffectCallback = undefined (double progress);

dictionary CustomEffectOptions : EffectTiming {
    Element? target;
};

interface CustomEffect : AnimationEffect {
    constructor(CustomEffectCallback callback, optional (unrestricted double or CustomEffectOptions) options = {});
    Element? target;
};

partial interface Animation {
    constructor(optional CustomEffect customEffect);
}
```

Here's an example of how you could use this new API to start a callback-based animation that lasts 1 second, repeats twice and uses an easing:

```javascript
const timing = { duration: 1000, easing: "ease-in-out", iterations: 2 };
const animation = new Animation;
animation.effect = new CustomEffect(progress => { … }, timing);
animation.play();
```

The provided `progress` argument is the current [iteration progress](https://drafts.csswg.org/web-animations-1/#iteration-progress). For more detailed timing information, the [`getComputedTiming()`](https://drafts.csswg.org/web-animations-1/#dom-animationeffect-getcomputedtiming) method may be used, with its [`currentIteration`](https://drafts.csswg.org/web-animations-1/#dom-computedeffecttiming-currentiteration) member to achieve an accumulation effect.

While it is optional, specifying the custom effect's target allows user agents to optimize when the provided callback is performed. For instance, a series of callback-based animations may be tied to a 2D visualization running inside a `<canvas>` element, and their application would be automatically paused while the `<canvas>` element is not within view.

In order to streamline the creation of callback-based effects, a new `animate()` method is added to the `AnimationTimeline` interface, allowing for the creation of callback-based animations both for monotonic timelines (`document.timeline`) and progress-based timelines:

```idl
dictionary CustomAnimationOptions : EffectTiming {
    DOMString id = "";
    (TimelineRangeOffset or CSSNumericValue or CSSOMKeywordValue or DOMString) rangeStart = "normal";
    (TimelineRangeOffset or CSSNumericValue or CSSOMKeywordValue or DOMString) rangeEnd = "normal";
};

partial interface AnimationTimeline {
    WebAnimation animate(CustomEffectCallback callback, optional (unrestricted double or CustomAnimationOptions) options = {});
};
```

With this new method, a simple callback-based animation not necessarily tied to a given DOM element can be instantiated quickly. For instance, the previous example could be written simply as:

```javascript
document.timeline.animate(progress => { … }, { duration: 1000, easing: "ease-in-out", iterations: 2 });
```

## The `progress` event

While the creation of a completely custom animation can be achieved using the `CustomEffect` interface, authors may wish to extend the effect of existing animations or simply be notified of their progress. Using the [`getAnimations()`](https://drafts.csswg.org/web-animations-1/#dom-animatable-getanimations) API, this includes style-originated animations, such as [CSS Animations](https://drafts.csswg.org/css-animations/) and [CSS Transitions](https://drafts.csswg.org/css-transitions/). To that end, a new [`AnimationPlaybackEvent`](https://drafts.csswg.org/web-animations-1/#animationplaybackevent) `progress` event is added and a new `onprogress` member is added to the [`Animation`](https://drafts.csswg.org/web-animations-1/#animation) interface:

```idl
partial interface Animation {
    attribute EventHandler onprogress;
}
```

This removes the need to register persistent `requestAnimationFrame` callbacks and instead allows authors to directly react to a given animation progressing. For instance, an author could report the current time of animation like so:

``` javascript
target.getAnimations()[0].onprogress = event => {
    // do something with event.currentTime
};
``` 

## Processing order of custom effects and `progress` events.

While it is possible to achieve similar effects by attaching a `CustomEffect` to an animation or registering a `progress` event listener, the Web Animations model will actually handle those two cases differently. The [update animations and send events](https://drafts.csswg.org/web-animations-1/#update-animations-and-send-events) procedure will run a custom effect's callback first while updating the current time of all timelines, and thus all the animations associated that timeline, and dispatch `progress` events in the last phase of that procedure.

As such, in this example, `customEffectCallback` is guaranteed to run prior to `progressEventHandler` when [updating the page's rendering](https://html.spec.whatwg.org/multipage/webappapis.html#update-the-rendering):

```javascript
const customEffectCallback = progress => { };
const progressEventHandler = event => { };
document.timeline.animate(customEffectCallback, 1000).onprogress = progressEventHandler;
```

## Further Considerations

- Should we provide a [`ComputedEffectTiming`](https://drafts.csswg.org/web-animations-1/#dictdef-computedeffecttiming) object to `CustomEffectCallback` directly? I expect the vast majority of cases would simply use its [`progress`](https://drafts.csswg.org/web-animations-1/#dom-computedeffecttiming-progress) member, but it would be more efficient for the cases where the author wants to query more timing information. 
- Are there cases where the `progress` may be `null`?
- Should we extend the options passed to [`Animatable.animate()`](https://drafts.csswg.org/web-animations-1/#dom-animationeffect-getcomputedtiming) to allow custom effects to be applied to a target with a single function call?
- How do custom effects compose in relation to other effect types on the effect stack?
- We may have to re-organize existing interfaces here such that `id`, `rangeStart` and `rangeEnd` are shared across [`KeyframeAnimationOptions`](https://drafts.csswg.org/web-animations-1/#dictdef-keyframeanimationoptions) and `CustomAnimationOptions`, most likely also accounting for [`trigger`](https://drafts.csswg.org/web-animations-2/#dom-keyframeanimationoptions-trigger).

## Acknowledgements

Many thanks for valuable feedback and advice from the people who have contributed to [CSS Working Group issue 6861](https://github.com/w3c/csswg-drafts/issues/6861).
