# Declarative Web Push
## More efficient and privacy-preserving push notifications

### Authors:
- [Brady Eidson](https://github.com/beidson)
- [Marcos Caceres](https://github.com/marcoscaceres)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Introduction](#introduction)
- [What are the drawbacks of the current Web Push model?](#what-are-the-drawbacks-of-the-current-web-push-model)
- [Learning from platform experience](#learning-from-platform-experience)
- [Our proposal](#our-proposal)
- [Goals](#goals)
- [Plan of action: Amend existing specifications](#plan-of-action-amend-existing-specifications)
- [RFC 8030 - Generic Event Delivery Using HTTP Push](#rfc-8030---generic-event-delivery-using-http-push)
- [Push API - Push Subscription](#push-api---push-subscription)
- [Push API - subscribe()  and related methods](#push-api---subscribe--and-related-methods)
- [Push API - Receiving a push message](#push-api---receiving-a-push-message)
- [Activating a Notification](#activating-a-notification)
- [Notifications API](#notifications-api)
- [Badging API specification](#badging-api-specification)
- [More to come](#more-to-come)
- [Acknowledgements](#acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

Declarative Web Push is a model by which push-initiated notifications can be presented directly by the platform or user agent **without requiring Service Worker JavaScript**.

This explainer describes some motivations for this model and describes various changes or additions to existing web standards to enable this model.

This explainer describes what we propose as a solution for this use case.
Implementation experience and feedback from partners in both the standards community and web developer community might change some details.

## What are the drawbacks of the current Web Push model?

The [W3C’s Push API](https://www.w3.org/TR/push-api/) and related specifications great for asynchronously reaching users and otherwise maximizing user engagement, but suffer from notable drawbacks: 
* Push messages require a Service Worker to process. This results in higher complexity for web developers, and comes at the cost of measureably greater CPU and battery resource usage to present a user visible notification
* Because a Service Worker is required, user agents with certain types of privacy features (such as Safari’s Intelligent Tracking Prevention) need to make hard trade-offs between push reliability and effective privacy
* For user agents that only allow push subscriptions with the `userVisibleOnly` flag set to true, they must come up with an enforcement strategy for Service Worker `push` event handlers that do not fulfill that promise
* Some Service Workers don't perform a meaningful action in response to a `notificationclick` event, which can conflict with expectations and restrictions of the platform

## Learning from platform experience

Push notifications that come in to an OS platform generally contain a payload describing a user visible notification that the platform can display itself, without any app code executing.

It is also fairly standard practice for platforms to grant small pieces of an application limited CPU time to *transform* an incoming push notification. Some examples include decrypting push data with device-local keys, updating the notification based on up-to-the-minute scores from an in-progress sporting event, or calculatng a new unread count for the application badge.

If the app fails to complete a transformation task in their allotted time - due to coding error or other factors outside their control - then the original notification is displayed to the user by the platform. This automatic recovery model avoids disrupting the user experience, and ensures that push notifications don’t become a vector for untrusted silent background runtime.

Also, OS platforms generally always launch the application in response to activation of a notification, giving the user consistent feedback for interacting with a notification.

We have deep experience with this flow and it is the base model for our Declarative Web Push proposal.

We detail how this model works in the sections below. 

## Our proposal

We believe everybody benefits from a model where a push message directly declares a user visible notification that the platform can display. We also believe the existing Web Push standards, as well as the Web Push infrastructure in use on the web, have proven reliable. Any new standards should build on them.

We are **not** proposing that Declarative Web Push replace the existing Web Push model, but rather that it be an optional model for web developers to provide better experiences for all.

## Goals

Declarative Web Push should be easy to use, privacy-preserving, and efficient. Some specific goals:

* Reuse as much existing Push API and Notification API infrastructure as possible
* Enable push subscriptions and notification handling without having a Service Worker installed
* Specify a workflow that always results in a notification being presented to an end-user, even in the case of a script error.
* Existing push subscriptions from the programmatic model automatically work with the declarative model
* Standardize a JSON representation of a persistent notification
* Add “action URLs” to notifications, so something visibly useful happens when activated, even without JavaScript
* Add a new event to optionally transform a notification, but leaving it impossible for a push to be silent
* Include declarative Badging API support

Below follows a concrete proposal. Apple's WebKit team has made an initial, experimental implementation of our proposal that validates our design.

## Plan of action: Amend existing specifications

The current set of specifications that govern the delivery and presentation of push notifications serve as a solid foundation to build on. They’ve served us well for a number of years, proving their robustness at Web scale.  

To help with the standardization process and re-use existing push-related primitives and algorithms, we need to amend existing specs to support the new declarative model we propose in this document. 

We will engage the standards community to coordinate on small-to-moderate changes to [RFC 8030](https://www.rfc-editor.org/rfc/rfc8030), [Push API](https://w3c.github.io/push-api/), [Notifications API](https://notifications.spec.whatwg.org/), and the [Badging API](https://www.w3.org/TR/badging/). Our goal is to retain full backwards compatibility with the current Push API. Any amendments will live along side it (or integrate directly into the appropriate sections).

The spec changes proposed below are the ones we know to be necessary starting points but are by no means exhaustive. We expect the scope will increase once details are being ironed out in the various specs and with more stakeholders involved.

## RFC 8030 - Generic Event Delivery Using HTTP Push

RFC 8030 defines the mechanism by which push servers send messages to user agents. Specifically “Section 5 - Requesting Push Message Delivery” describes how a server requests that a push service send a push message payload to the user agent.

As far as HTTP is concerned, the push message data is just a blob posted in an HTTP request. But headers included in the HTTP request itself is where we can determine if the push message is “legacy” or “declarative”.

We propose that RFC 8030 (or a follow-on spec) suggest push requests include a `Content-Type` header. Most values will be ignored, as most payloads are opaque to the user agent.

Later in this document we’ll detail a standard JSON format declaring a notification payload, so one might think `Content-Type: application/json` makes sense. It so happens that legacy push message payloads are often also JSON. And in our experience many legacy push message payloads are already sent with a `Content-Type: application/json` header.

To eliminate confusion between “legacy web push JSON” and “declarative web push JSON”, we propose registering a new `application/notification+json` type.

Push messages received without that content type are considered to have `legacy` disposition.
Push messages received with that content type are considered to have a `notification` disposition, and the meaning of that will be covered later in this document.

A neat trick here is that many legacy Service Worker `push` event handlers simply transcribe an applicaiton specific JSON description of a `Notification` into their call to `ServiceWorkerRegistration.showNotification`

By switching their JSON format over to the new standard format, their JSON payload becomes backwards compatible with other browsers that don’t have support for Declarative Web Push.
By sending all of their push messages with `Content-Type: application/notification+json`, newer browsers that support Declarative Web Push can handle the notification in the efficient, privacy preserving manner, and older browsers that haven't updated yet will still receive the push message and fire a `push` event to the Service Worker like usual.

## Push API - Push Subscription

The Push API does a great job at describing a [Push Subscription](https://w3c.github.io/push-api/#push-subscription). As currently specified, it is intrinsically tied to a "Service Worker Registration". For one example:

> “Each push subscription is associated with a service worker registration and a service worker registration has at most one push subscription”

Since a stated goal of this proposal is to function without a Service Workers, Push Subscription needs to be generalized and not bound to a Service Worker. We propose defining a push subscription owner, which can be either a “Service Worker registration” or security origin bound. 

After that’s established, appropriately replace all references of “Service Worker registration as owner of a push subscription” with that of “push subscription owner”.

We also expose a `navigator.pushManager` on `window.navigator`, so that `PushManager` instances can be reached without needing a service worker registration.

Push subscriptions within a security origin should be interchangable. An existing push subscription that was made via a `ServiceWorkerRegistration` whose scope happens to match the security origin of a window object will be visible to that `window.navigator.pushManager` instance

Conversely, a new push subscription made via `window.navigator.pushManager` will be visible to a `ServiceWorkerRegistration` whose scope matches that security origin. Removing the subscription from one will be reflected in the other.

Push messages sent to a given push subscription can mix-and-match.
One push messages sent to that push subscription might have the `legacy` disposition and require a Service Worker to handle it with a `push` event.
Another push message sent to that push subscription might have the `notification` disposition allow for automatic handling by the platform.

## Push API - subscribe()  and related methods

For push subscriptions to be owned by something other than Service Worker registrations, and for a `PushManager` instance to be useful without having a Service Worker registration, `[PushManager.subscribe()](https://w3c.github.io/push-api/#subscribe-method)` will require an overhaul:

* The `subscribe()` algorithm is heavily rooted in Service Worker registrations
* We propose forking the algorithm based on whether the global object is a Service Worker registration or a Window object.
* The window object version will follow the same steps in principle as the Service Worker version, just utilizing Window object concepts
* `getSubscription()` and `permissionState()` will both need the same changes.

## Push API - Receiving a push message

[10.4 Receiving a Push Message](https://w3c.github.io/push-api/#receiving-a-push-message) will need a significant rewrite:

* Don’t look up the Service Worker registration as the first step. 
* Instead inspect the Content-Type header to establish the payload’s disposition.
    * If the disposition is `legacy`, follow existing legacy web push steps starting at looking up the Service Worker registration
    * If the disposition is `notification` then:
        * Validate its JSON structure (see below)
        * If the JSON describes *an immutable* notification, then the user agent/platform shows the notification directly.
        * If the JSON describes *a mutable* notification:
            * Verify there is a registered service worker.
            * If not, abort these steps and have the user agent/platform show the notification directly
            * If so:
                * Create or reuse an instance of the Service Worker
                * Fire a new event called `pushnotification` at it, whose event type includes a proposed `Notification` object
                * That handler has a small amount of runtime to call showNotification like legacy push event handlers do and then resolve the event.
                * If it fails to do so in time, have the user agent/platform show the JSON-described notification directly

We’re considering various ways that `pushnotification` events should specify their replacement Notification. Currently, calling `showNotification` like in the legacy case seems appropriate, but it’s a bit more complicated than it seems on the surface. We’ll share more thoughts once we figure them out.

In the `notification` disposition cases, the push message data is parsed as JSON and validated with certain requirements, such as providing a title, a default action, and the optional `NotificationsOptions` details. If the JSON doesn’t represent a well defined Notification object, it’s dropped on the floor (perhaps with a developer console warning).

To further enable the goal of avoiding the Service Worker when possible, we are also considering stricter requirements on service workers used for push event handling by keeping track of what event handlers are installed simply as a result of evaluating the Service Worker source code. For example, if synchronous evaluation of a Service Worker's source code doesn’t result in a `pushnotification` event handler being installed, then we would remember that and treat all `notification` disposition push messages as *immutable*

We believe dynamically adding push event handlers to a Service Worker after initial evaluation is a developer error, and should not hurt platform performance, and making this mistake should result in a developer console warning, and not reduced performance or privacy characteristics for the user.

## Activating a Notification

In legacy Web Push, when a notification is activated, the user agent responds by dispatching a `notificationclick` event at a Service Worker instance. Usually that event handler verifies a window client exists at an app specified URL to send it a message, or opens a new window client to an app-specified URL.

Navigating the user agent to HTTP URLs is the native language of the web platform, and opening a URL is the most common result of processing a `notificationclick` event. So our proposed model uses URLs as a declarative means to serve the same purpose. 

Therefore a requirement of the notification payload JSON is to specify a “action URLs” for all actions, including the default action. `NotificationAction` will be extended to also have an “action URL”. Any `NotificationActions` specified in the `NotificationOptions` JSON will be required to specify an action URL.

We propose extending the JavaScript API for creating a persistent notification - `ServiceWorkerRegistration.showNotification()` - to allow for optionally specifying action URLs. Both the default action URL, and the `NotificationOptions` `NotificationAction` action URLs.

If a persistent notification is activated with an action that has an associated action URL, `notificationclick` event dispatch can be skipped and the URL is instead opened directly.


Therefore, persistent notifications created from a `notification` disposition payload will **always skip** the `notificationclick` handler, and legacy push implementations that create notifications programatically from Service Workers can **optionally skip** the `notificationclick` handler.

We recognize that JavaScript processing the app-defined data attached to a `Notification` object is important for many apps. We're considering ways to support an action opening a URL directly *combined* with that data being exposed to JavaScript in the window browsing context

## Notifications API

The legacy Push API gives the entire push message data to the web application, to be used however it sees fit. As established earlier, our proposal leverages a enforces that push message instead be a standardized JSON structure that declares a notification.

The Notifications API needs a few tweaks to reflect all desired new behaviors:

* The concept of “persistent notification” needs to change from “a notification with an associated service worker registration” to a notification with an associated service worker registration or associated push subscription”.
    Or some other language that clarifies automatically created Notifications from a notification push payload also qualify as “persistent”
* Automatically created `Notification` objects are defined to have the associated push subscription. 
* Replacement notifications created during `pushnotification` event handling also have the associated push subscription. 
* `NotificationAction` specifiers created in JavaScript can include an optional action URL.
* Similarly, creating a persistent notification in JavaScript also needs a way to specify an optional default action URL, probably in `NotificationOptions`
* The Notifications spec will cover the JSON expected in a push notification payload.

Here is an example of the proposed JSON syntax:

```json
{
  "title": "The same as the 'title' in existing Notification JS APIs",
  "options": {
    "body": "most of the 'options' entries are directly from NotificationOptions",
    "lang": "like this malformed 'lang' tag",
    "dir": "LTR",
    "silent": "true",
    "actions": [
      {
        "action": "confirm",
        "title": "Confirm",
        "url": "https://webkit.org/confirm.html"
      },
      {
        "action": "deny",
        "title": "Deny",
        "url": "https://webkit.org/deny.html"
      }
    ],
    "data": {
      "this": "section is freeform",
      "normally": "the data part of a NotificationOptions",
      "dictionary": "is any serializable JavaScript object",
      "but": "when specified in a push notification payload",
      "it": "is standard JSON that will parsed into a JS object as needed"
    }
  },
  "default_action_url": "https://webkit.org/blog",
  "mutable": true,
  "app_badge": 17
}
```

The top level “title” member is required, and represents the title that would be passed in to `showNotification()` or the `Notification` constructor.
The “options” member is optional, and represents the NotificationOptions dictionary that would be passed in to `showNotification()` or the `Notification` constructor.

The "default_action_url" member is required, and represents the url that the user agent should load when the notification is activated.
Similarly, if any actions are specified within “options”, notice that each of them is required to have a “url” entry. If that specific action is selected, then its URL will be loaded.

The "mutable" field is optional. Notification payloads are immutable by default (false). An “immutable” notification payload will always be displayed directly by the platform or user agent, even if a Service Worker registration matches and has a `pushnotification` event handler.
A “mutable” notification payload is eligible to be transformed by a `pushnotification` event handler, if such a handler exists.

“app_badge” is optional. If specified must be an integer in the unsigned long long range. If specified as a positive number, then the [set the app badge steps](https://w3c.github.io/badging/#dfn-set-the-application-badge) from the Badging API are taken. Similarly, if the value is 0, the badge is cleared as per [set the application badge](https://w3c.github.io/badging/#dfn-set-the-application-badge) steps.

If a notification is "mutable" and is processed by a `pushnotification` event handler, the `pushnotification` event has a "proposed app badge" field.
If that event handler makes its own changes to the app badge, then any "app_badge" JSON memeber will be ignored.

The inclusion of "app_badge" raises a question for us: Should we except a push message with `notification` disposition that includes *only* an "app_badge" update?

Our current thinking is "yes if it is immutable, but no if it is mutable". Otherwise a malicious entitity could spam app badge updates that simply keep the app badge clear, abusing the system to get free silent background runtime - Which is one of the primary problems we're trying to solve.

In this description of the JSON fields, we’ve mentioned some optional and some required fields. We’ve also mentioned some acceptable value ranges for certain fields.

Requiring validation of the the incoming JSON to the extent that it needed to fully describe a Notification that the platform or user agent can handle directly is one of the goals of Declarative Web Push. If the JSON fails validation, then it will be ignored, and likely an error message shown to the developer console.

Finally, since concepts and algothrim steps from Notifications API are being borrowed and repurposed to support declarative, automatic handling by the User Agent, as opposed to imperative API calls, we might want to rename the Notifications API to just “Notifications”

## Badging API specification

In the above description of the JSON payload we mention executing steps in the Badging API spec.

The algorithms of the badging specification need to be generalized so, where possible, they are not tied to the API. The solution we come up with as part of this process needs to work with the existing values and model used by the badging specification. As such, we would probably want to generalize and rename the Badging API to just “Badging”. 

## More to come

A variant of this explainer has been posted as an [issue with the Push API](https://github.com/w3c/push-api/issues/360), and discussion with the wider standards bodies began at [TPAC 2023](https://www.w3.org/2023/09/TPAC/)

More fine grained issues will be filed in the various specs mentioned, and engaging with our standards partners will continue.

We plan to update this explainer based on standards discussions and implementation experience.

## Acknowledgements

Many thanks for valuable feedback and advice from other members of the WebKit team, including Marcos, Anne, Jen and Youenn.
