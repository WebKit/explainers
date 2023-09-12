### Declarative Web Push:
More efficient and privacy-preserving push notifications

By: Brady Eidson
Technical review by: Marcos Caceres and Anne van Kesteren. 

This explainer proposes various changes to existing web standards so that, in the majority of cases, push-initiated notifications can be presented by the platform or user agent without involving a Service Worker.

The primary mechanism to enable this is by making the push message payload a declarative description of the notification to be displayed.

Our proposed model doesn’t require a Service Worker work to get a PushSubscription. Even if a Service Worker is registered, push notification messages bypass it by default.
This makes push notifications from the web more privacy-preserving as sites aren’t given the opportunity to execute any JavaScript until a user explicitly interacts with a notification. It also makes web push notifications more efficient by skipping the CPU and battery cost required to launch a Service Worker and execute its code.

We also propose a more flexible event handling model that developers can opt into to transform a push notification. This new model still depends on Service Workers, but provides the privacy-preserving guarantee that there is always a fallback notification to be shown, so pushes cannot trigger silent background runtime.

This explainer describes what we have implemented internally to prototype or what we plan to implement next.
Implementation experience and feedback from the standards community might change some details.

### What are the drawbacks of current push notifications?

The W3C’s Push API  and related specifications work great for maximizing user engagement, but suffer from notable drawbacks: 

* Requires a Service Worker which has higher web developer complexity, and which cost significant CPU, battery, and potentially network resources to present a notification.
* Because a Service Worker is required, user agents with certain types of privacy features (such as Safari’s Intelligent Tracking Prevention) need to make hard trade-offs between push reliability and effective privacy.
* User agents require a fallback plan for when the web app doesn’t fulfill their promise of displaying a user visible notification. 

### Learning from platform experience

Push notifications that come in to an OS platform are usually displayed by the platform itself, without any app code executing.
It is also fairly standard practice for apps to optionally get a small amount of CPU time to transform an incoming push notification - specially where changes since the last push message matter. Some examples of tasks performed during these allocated time slices include decrypting push data, updating the badge count, or updating based on score from an in-progress game. 
If the app fails to complete a transformation task in their allotted time - due to coding error or other factors outside their control - then the original notification is displayed to a user. This automatic recovery model avoids disrupting the user experience, and ensures that push notifications don’t become a vector for untrusted silent background runtime.

We have deep experience with this flow and it is the base model for our proposed enhancements to Web Push.
Most existing web app that rely on the existing Service Workers driven-model can easily adapt to the more efficient and privacy preserving model; the web application can transform the received notification payload as needed, but the payload itself describes the primary notification. If a web app fails to complete the transformation in its allotted time, or there is a script error, a notification is still always presented to the end user.
When existing web apps simply include the full notification itself in push message JSON and have their service worker display it as-is, adopting the 100% streamlined model is trivial, and they can remove their push-related Service Worker code.

We detail how this model works in the sections below. 

### Goals

* Specify a push + notification model that makes it optional to involve a service worker. 
* Specify a workflow that always results in a notification being presented to an end-user, even in the case of a script error.
* Standardize a JSON representation of a Notification.
* Retain full backwards compatibility with current Push API and associated standards.
* Maximize reuse of push subscription infrastructure from Push API.
* Support defaulting routing of notification actions using URLs instead of relying on the service worker.
* Enable setting application badges through this mechanism. 

###  Plan of action: amendments to existing specifications

The current set of specifications that govern the delivery and presentation of push notifications serve as a solid foundation to build on. They’ve served us well for a number of years, proving their robustness at Web scale.  

To help with the standardization process and re-use existing push-related primitives and algorithms, we need to amend existing specs to support the new model we propose in this document. 

The standards community would need to coordinate on small-to-moderate changes to RFC 8030, Push API, Notifications API, and possibly the Badging API specification. Our goal is to retain full backwards compatibility with the current Push API. Any amendments will live along side it (or integrate directly into the appropriate sections).

The spec changes proposed below are the ones we deemed to be the necessary starting points, but are by no means exhaustive. We are under no illusion that once we begin diving deeper more changes will be required.

### RFC 8030 - Generic Event Delivery Using HTTP Push

RFC 8030 defines the mechanism by which push servers send messages to user agents. “Section 5 - Requesting Push Message Delivery” describes how a server requests that a push service send a push message payload to the user agent.

As far as HTTP is concerned, the push message data is just a blob posted in the HTTP request. But the HTTP request itself is where we can determine if the push message is “legacy” or “new” with an HTTP request header.

We propose that - even though it hasn’t been standard practice so far - RFC 8030 (or a follow-on spec) suggest push requests include a Content-Type. Most content type values will be ignored, with the payload understood to be a legacy push payload. A specific content type value will flag a message as containing a notification payload.

Later in this document we’ll detail a standard JSON format describing a visible notification payload, so one might think application/json makes sense. It also happens that legacy push message payloads are usually also JSON. And in our experience many legacy push message payloads are already sent with a Content-Type: application/json header.

To eliminate confusion between “legacy push JSON” and “declarative web push JSON”, we propose registering a new application/notification+json type.

Push messages received without that content-type are considered to have “legacy” disposition.
Push messages received with that content-type are considered to have a “notification” disposition, and the meaning of that will be covered later in this document.

### Push API - Push Subscription

The Push API does a great job at describing a Push Subscription. However, as currently specified, it is intrinsically tied to a "Service Worker Registration". For one example:

> “Each push subscription is associated with a service worker registration and a service worker registration has at most one push subscription”

Since a stated goal of this proposal is to work without a service worker, Push Subscription needs to be generalized and not bound to a service worker.  We propose defining a push subscription owner, which can be either a “service worker registration” or security origin bound. 

After that’s established, appropriately replace all references of “service worker registration as owner of a push subscription” with that of “push subscription owner”.

We also expose a navigator.pushManager on window.navigator, so that PushManager instances can be reached without needing a service worker registration.

Push subscriptions are interchangable. An existing push subscription that was made via a ServiceWorkerRegistration whose scope happens to match the security origin of a window object will be visible to that window.navigator.pushManager

Conversely, a new push subscription made via window.navigator.pushManager will be visible to a ServiceWorkerRegistration whose scope matches that security origin. Removing the subscription from one will be reflected in the other.

Push messages sent to that subscription can other have the legacy disposition and require a Service Worker to handle them with a push event, or have the notification disposition to allow for automatic handling, or an optional pass through a pushnotification event handler (described below)

### Push API - subscribe()  and related methods

For push subscriptions to be owned by something other than service worker registrations, and for a PushManager instance to be useful without having a service worker registration, PushManager.subscribe() will require an overhaul:

* The subscribe() algorithm is heavily rooted in service worker registrations.
* We propose forking the algorithm based on whether the global object is a service worker registration or a Window object.
* The window object version will follow the same steps in principle.
* getSubscription() and permissionState() will both need the same changes.

### Push API - Receiving a push message

10.4 Receiving a Push Message will need a significant rewrite:

* Don’t look up the Service Worker registration as the first step. 
* Instead inspect the Content-Type header to establish the payload’s disposition.
    * If the disposition is “legacy”, follow existing legacy web push steps starting at looking up the Service Worker registration
    * If the disposition is “notification” then:
        * Validate its JSON structure (see below)
        * If the JSON does not opt in to event handling through a Service Worker, then the user agent/platform just shows the notification directly.
        * If the JSON does opt in to event handling through a Service Worker:
            * Verify there is a registered service worker.
            * If not, abort these steps and display the notification directly like above.
            * If so:
                * Create or reuse an instance of the Service Worker
                * Fire a new event called pushnotification at it, whose event type includes a proposed Notification object
                * That handler has a small amount of runtime to call showNotification like legacy push event handlers do and then resolve the event. If it fails to do so, the JSON-derived Notification is presented as a fallback


We’re considering various ways that pushnotification events should specify their replacement Notification. Currently, calling showNotification like in the legacy case seems appropriate, but it’s a bit more complicated than it seems on the surface. We’ll share more thoughts once we figure them out.

 In the notification disposition cases, the push message data is parsed as JSON and validated with certain requirements, such as providing a title, a default action, and the optional NotificationsOptions details. If the JSON doesn’t represent a well defined Notification object, it’s dropped on the floor (perhaps with a developer console warning).

To further enable the goal of avoiding the Service Worker when possible, we are also considering stricter requirements on service workers used for push event handling by keeping track of what event handlers are installed simply as a result of evaluating the Service Worker source code. For example, if synchronous evaluation of a Service Worker source doesn’t result in a pushnotification event handler being installed, then we would remember that and never consider firing a pushnotification event to it even if the notification payload JSON opts in.

We believe dynamically adding push event handlers to a Service Worker after initial evaluation is a developer error, and should not hurt platform performance, and making this mistake should result in a developer console warning, and not reduced performance or privacy characteristics for the user.

### Activating a notification

In legacy Web Push, when a notification is activated, the user agent handles it by dispatching a notificationclick event at a Service Worker instance. Usually that event handler verifies a window client exists at an app specified URL to send it a message, or opens a new window client to an app-specified URL.

Navigating the user agent to HTTP URLs is the native language of the web platform, and opening a URL is the most common result of processing a notificationclick event. So our proposed model uses URLs as a declarative means to serve the same purpose. 

Therefore a requirement of the notification payload JSON is to specify a “default action URL”, and NotificationAction will be extended to also have an “action URL”. Any NotificationActions specified in the NotificationOptions JSON will be required to specify an action URL.

We propose extending the JavaScript API for creating a persistent notification - ServiceWorkerRegistration.showNotification() - to allow for optionally specifying action URLs. Both the default action URL, and the NotificationOptions NotificationAction action URLs.

If a persistent notification is activated with an action that has an associated action URL, notificationclick event dispatch can be skipped and the URL is opened directly.

Therefore, persistent notifications created from a notification disposition payload will aways skip the notificationclick handler, and legacy push implementations that create notifications with Service Workers can optionally skip the notificationclick handler.


### Notifications API

Legacy Push API gives the entire push message data to the web application, to be used however it sees fit. As established earlier, our proposal leverages a standardized JSON structure to represent that notification and related data.

The Notifications API needs a few tweaks to reflect all desired new behaviors:

* The concept of “persistent notification” needs to change from “a notification with an associated service worker registration” to a notification with an associated service worker registration or associated push subscription”.
    Or some other language that clarifies automatically created Notifications from a notification push payload also qualify as “persistent”
* Automatically created Notification objects are defined to have the associated push subscription. 
* Replacement Notification objects created during pushnotification event handling also have the associated push subscription. 
* Where the window security origin exactly matches with a service worker scope, both entities are candidates for handling a given push message depending on its details.
* NotificationAction specifiers created in JavaScript need to include an optional action URL.
* Similarly, creating a persistent notification in JavaScript also needs a way to specify an option default action URL, probably in NotificationOptions
* The Notifications spec will cover the JSON expected in a push notification payload.

In our current proof of concept implementation, we implement JSON structure illustrated by the following example:


```
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

The top level “title” member is required, and represents the title that would be passed in to e.g. the Notification constructor.
The “options” member is optional, and represents the NotificationOptions dictionary that would be passed in to e.g. the Notification constructor.

* The "default_action_url" member is required, and represents the url that the user agent should load when the notification is activated.
* Similarly, if any actions are specified within “options”, notice that each of them is required to have a “url” entry. If that specific action is selected, then its URL will be loaded.
* The "mutable" field is optional. Notification payloads are immutable by default (false). An “immutable” notification payload will always be displayed directly by the platform or user agent, even if a service worker registration matches and has a pushnotification event handler.
* A “mutable” notification payload is eligible to be transformed by a pushnotification event handler, if a handler has been preregistered.
* “app_badge” is optional. If specified must be an integer in the unsigned long long range. If specified as a positive number, then the set the app badge steps from the Badging API are taken. Similarly, if the value is 0, the badge is cleared as per set the application badge steps.

The inclusion of badging raises a few as-of-yet unanswered questions that we don’t have strong thoughts about quite yet, such as:

* Do we allow a notification payload whose only member is “app_badge”, skipping the notification but allowing efficient updating of the application badge?
* If "app_badge" is included in a mutable notification payload, how do we include the passed in app_badge value to the pushnotification event? And how do we allow the event handler to transform the resulting app badge? 

These questions do need answers, but we’re not letting them hold up progress in implementing the rest of the proposal.

In this description of the JSON fields, we’ve mentioned some optional and some required fields. We’ve also mentioned some acceptable value ranges for certain fields.

Requiring validation of the the incoming JSON to the extent that it needed to fully describe a Notification that the platform or user agent can handle directly is one of the goals of declarative web push. If the JSON fails to meet those requirements, then it will be ignored, and likely an error message shown to the developer console.

Finally, since concepts and algothrim steps from Notifications API are being borrowed and repurposed to support declarative, automatic handling by the User Agent, as opposed to imperative API calls, we might want to rename the Notifications API to just “Notifications”

### Badging API specification

In the above description of the JSON payload we mention executing steps in the Badging API spec.

The algorithms of the badging specification need to be generalized so, where possible, they are not tied to the API. The solution we come up with as part of this process needs to work with the existing values and model used by the badging specification. As such, we would probably want to generalize and rename the Badging API to just “Badging”. 
