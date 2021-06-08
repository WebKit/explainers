# Media Session Coordinator Explainer

## Definitions

“Synchronized playback”
The ability of two or more clients to interact with the media controls and have those interactions reflected in the playback state of all clients simultaneously.

## Introduction

A newly relevant feature in web media playback is the ability to experience the same content together with other users of different devices and User Agents. Every website or content provider currently must create a mechanism for synchronizing playback state across all participants in a group session. This explainer proposes the addition of a new API, `coordinator`, to the existing Media Session API that facilitates the synchronization of playback state within a User Agent.

### Goals

* Make it easier for media web site authors to support a synchronized playback experience.
* Allow User Agents to provide synchronization primitives to web sites.
* Lower the cost of entry for adding synchronized playback to existing sites.
* Allow more users to participate in synchronized playback on their favorite media sites.

### Non-goals

* Frame-accurate synchronization between two devices which are in close proximity, such as would be required for a “wall of videos”.
* Specifying the mechanism of synchronization between clients.

## Scenario

Alice and Bob are both watching audio/visual content provided by example.com. Alice is participating through a native playback application, and invites Bob to watch the content together in an application-specific mechanism.  Bob is participating on example.com in their chosen User Agent. example.com has adopted the Media Session Coordinator API, and uses an `'coordinatorstatechange'` event to be informed of that invitation. Once the coordinator state is `'waiting'`, the site activates the coordinator by calling its `join()` function.

```
function checkForCoordinatorState() {
    if (mediaSession.coordinator.state == "waiting")
        mediaSession.coordinator.join();
}
window.mediaSession.coordinator.addEventListener('coordinatorstatechange', checkForCoordinatorState);
checkForCoordinatorState();
```

The example.com site can offer UI that allows Bob to leave synchronized playback by calling the coordinator’s `leave()` function.

```
controls.leaveSession.addEventListener('click', event => {
    if (mediaSession.coordinator.state == "joined")
        mediaSession.coordinator.leave();
});
```

When Alice begins synchronized playback, the coordinator produces a `"play"` Media Session action, to be handled by example.com. When Alice pauses synchronized playback, the coordinator produces a `"pause"` action. When Alice explicitly seeks to a time within the media timeline, the coordinator produces a `"seekto"` action.

```
mediaSession.addActionHandler("play", details => {
    video.play();
});
mediaSession.addActionHandler("pause", details => {
    video.pause();
});
mediaSession.addActionHandler("seekto", details => {
    video.currentTime = details.seekTime;
});
```

When Bob, through the example.com site loaded in their User Agent, begins synchronized playback, instead of calling the media element's `play()` method directly, the site will indicate to the coordinator that it intends to begin playback by calling that coordinator's `play()` method. When Alice indicates they are ready to begin playback, the coordinator will produce a `"play"` action, similar to when Alice initiates playback. The site does the same for when Bob pauses playback, by calling the coordinator's `pause()` method. When Bob interacts with page controls to seek within the media timeline, the page calls the coordinator's `seekTo(time)` method.

```
function isCoordinating() {
    return window.mediaSession
        && window.mediaSession.coordinator
        && window.mediaSession.coordinator.state === "joined";
}

controls.playButton.addEventListener("click", event => {
    if (isCoordinating())
        mediaSession.coordinator.play();
    else
        video.play();
});

controls.pauseButton.addEventListener("click", event => {
    if (isCoordinating())
        mediaSession.coordinator.pause();
    else
        video.pause();
});

controls.timelineSlider.addEventListener("change", event => {
    if (isCoordinating())
        mediaSession.coordinator.seekTo(event.target.value);
    else
        video.currentTime = event.target.value;
});
```

If example.com provides a “playlist” feature, where playback can move between distinct media playback items, the transition between one item and another can be signaled through the coordinator as well. When Alice selects another item in the playlist, the coordinator produces a `"settrack"` action, with a MediaSessionActionDetails object containing a `trackIdentifier` attribute. 

```
mediaSession.addActionHandler("settrack", details => {
    video.src = getURLForTrackIdentifier(details.trackIdentifier);
});
```

When Bob selects another item in the playlist, the site will indicate its intent to select a new item by calling the coordinator’s `setTrack(identifier)` method.  When Alice indicates they are ready to switch to the new item, the coordinator produces a `"settrack"` action, just as when Alice selects the item directly.

```
controls.nextButton.addEventListener("click", event => {
    if (isCoordinating())
        mediaSession.coordinator.setTrack(getNextTrackItem())
    else
        video.src = getURLForTrackIdentifier(getNextTrackItem())
});
```

```
// We should add a section here about changes to mediaSession.readyState
```

## Detailed design discussion

### Polyfilling

Sites or libraries are encouraged to polyfill the coordinator API, especially if those sites or libraries have pre-existing synchronization features. Those synchronization features can be exposed through the coordinator object, and can be called by clients regardless of the underlying synchronization technology or implementation.

### Synchronization

User Agent provided coordinator objects can facilitate synchronization through an implementation-specific mechanism.  Library provided coordinator objects can similarly facilitate synchronization through their own implementation-specific mechanism.

The [Multi-Device Timing Community Group](https://www.w3.org/community/webtiming/) is defining low-level timing synchronization primitives as part of the [Timing Object](http://webtiming.github.io/timingobject/) specification. When this specification is implemented by User Agents, libraries and sites be able to use the synchronization primitives it defines as a source of synchronization for coordinator polyfills.

### Playlists

HTML and other web media specifications do not currently provide any mechanism for declaring playlists of distinct media items. The coordinator API defines a playlist as a list of MediaMetadata objects, and exposes this list to Media Session as a new attribute called `playlist`. This allows the site to expose to the User Agents details about upcoming items in the playlist. In turn, the User Agent can then display to the user exactly what item will be played when providing UI which will switch to the next item in a playlist, which in turn will produce a `"nexttrack"` or `"previoustrack"` action. Additionally, when sites produce a playlist of items, the User Agent can expose that list in UI provided to the user, which allows users to jump directly to a specific item in that playlist, which will produce a `"settrack"` action.

### Media Session Additions

The additional APIs added to Media Session are essential to the Coordinator and the features it exposes; but those new APIs are useful even in non-coordination use cases. Exposing an explicit `readyState` property on `mediaSession` allows sites to, for example, signal to the User Agent that media data for the current time does not yet exist, and in response the UA could display a "spinner" UI rather than a play button to indicate to the user that playback is not currently possible, but may be in the future. The `playlist` property is similarly useful outside of coordinated playback, as sites which support moving to the next item in a queue can provide detailed metadata about the upcoming item, and in response UAs can expose that information to the user, and indicate exactly what item will begin playing when, for example, the user activates the "next track" button.

### Producing MediaSessionActions from script

In order to successfully polyfill the coordinator object, action handlers registered by the page must be able to be called from the page itself. In theory, this could be done by polyfilling `setActionHandler(action, callback)` directly, however this ability can more easily be provided directly by the User Agent itself by extending the MediaSession API. This has other benefits, including making MediaSession more easily testable by scripts running within the page.

## Stakeholder Signals

There have been no stakeholder signals yet, aside from WebKit’s enthusiastic support.

## Proposed JavaScript API

```
interface MediaSessionCoordinator {
    Promise<undefined> join();
    undefined leave();

    readonly attribute MediaSessionCoordinatorState state;
    attribute EventHandler oncoordinatorstatechange;

    readonly attribute DOMString? identifier;

    Promise<undefined> seekTo(unrestricted double time);
    Promise<undefined> play();
    Promise<undefined> pause();
    Promise<undefined> setTrack(DOMString trackIdentifier);
};

partial enum MediaSessionActions {
    "`settrack"`
};

partial interface MediaMetadata {
    attribute DOMString trackIdentifier;
};

partial interface MediaSession {
    readonly attribute MediaSessionCoordinator coordinator;
    attribute MediaSessionReadyState readyState;
    attribute FrozenArray<MediaMetadata> playlist;
};

enum MediaSessionReadyState {
    "havenothing",
    "havemetadata",
    "havecurrentdata",
    "havefuturedata",
    "haveenoughdata"
};

enum MediaSessionCoordinatorState {
    "closed",
    "waiting",
    "joined"
};
```

## Acknowledgements

The Media Session API itself, through its rich set of ActionHandlers, provides a foundation to issuing synchronization commands, and allowed synchronization functionality to be added to pages with minimal adoption requirements.
