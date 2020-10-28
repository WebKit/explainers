# Centralized Consent API

## Authors:

- [Kate Cheney](https://github.com/kcheney1)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Definitions](#definitions)
- [Introduction](#introduction)
  - [Goals](#goals)
- [JavaScript API](#javascript-api)
  - [Requirements](#requirements)
- [Scenario](#scenario)
- [Detailed design discussion](#detailed-design-discussion)
  - [Offering an opt-in preference](#offering-an-opt-in-preference)
  - [Default value](#default-value)
  - [Make per-site and global preferences indistinguishable](#make-per-site-and-global-preferences-indistinguishable)
  - [Limiting consent information to two bits](#limiting-consent-information-to-two-bits)
  - [Legal effects](#legal-effects)
- [Stakeholder Signals](#stakeholder-signals)
- [Acknowledgements](#acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Definitions

**Consent banner:** Prompt or banner on a site informing a user what data is
being collected on them and how it is being used, and providing options to
manage data selling/sharing preferences.

## Introduction

The Centralized Consent API aims to reduce the need for a website to display
consent banners while still complying with consumer privacy legislation.
The browser will store the user's global data selling/sharing preference, and
optionally per-site preferences. The browser will offer 2 bits of per-site storage
if no preference is set. With the Centralized Consent API, a site only needs to
display a consent banner if the user preference has not been set, resulting in
fewer banners. Additionally, the per-site storage will be more persistent than
cookies, decreasing the frequency of new banners after website data is cleared.

### Goals

* Lessen the frequency of consent banners on sites to improve user experience.
  Frequent banners obstruct web content and disrupt user flow.
* Provide users more practical control over the use of their personal data.
  Requiring a user to opt-in/out of personal data selling/sharing on a per-site
  basis, often via a multi-step process, does not always provide the user with
  practical autonomy over their data.

## JavaScript API

* `document.dataConsentPreference():` Returns a promise with the user's
  personal data selling/sharing preference. Rejects the promise if the user's
  preference is unknown.
* `document.setDataConsentInformation():` Sets up to two bits of consent
  information if a user has not set a preference. The bits will be cleared on a
  rolling 90 day basis without user interaction. Every subsequent user
  interaction resets the 90 day count.
* `document.dataConsentInformation():` Returns two bits of consent
  information. Rejects the promise if no bits have been set.

### Requirements
* The domain calling these methods must be in a first party context. If the
  context is not first party, the promise is rejected.
* The domain calling these methods must have user interaction as first party.
  If no user interaction has been recorded, the promise is rejected.

## Scenario
A site wants to know whether it should display a consent banner for a specific
user. The script may look like this:

```
document.dataConsentPreference()
    .then(function (hasGivenConsent) {
        // No need to display a consent banner.
        if (!hasGivenConsent)
            // User has NOT given consent to personal data selling/sharing.
        else
            // User has given consent to personal data selling/sharing.
}, function () {
    // Unknown preference. Did we store past consent information about this user? 
    document.dataConsentInformation()
        .then (function (twoBits)) { // Receive two bits of previously stored per-site info.
            // Display banner or set cookie preferences based on these bits. 
    }, function () {
        // No bits found. Display consent banner.
    });
});
```

If the user does not have a preference set, a site may want to record their consent
preferences:

```
// Truncated to 2 bits.
document.setDataConsentInformation(1);
```
## Detailed design discussion

### Offering an opt-in preference

Having a global opt-in preference will make site experiences smoother for users
who want a personalized web experience that is only possible through personal
data sharing. Offering an explicit opt-in preference also increases the likelihood that a site will query the
`document.dataConsentPreference()` API. However, a global opt-in preference
increases the privacy risk of the feature via scenarios like a single site convincing a
user to opt-in globally.

### Default value

The default value will be 'No Preference' to abide by some consumer privacy legislation
which specifies that the user must indicate their privacy preference [affirmatively](https://oag.ca.gov/sites/all/files/agweb/pdfs/privacy/ccpa-fsor-appendix-e.pdf).
The user agent will determine how they will prompt a user to set this value.
Having a default value of 'No Preference' will also avoid adding more disincentive for
sites to adopt.

### Make per-site and global preferences indistinguishable

The Centralized Consent API was designed to make it impossible to determine whether the
result of `document.dataConsentPreference()` is returning a global or per-site value to avoid
adding a global fingerprinting bit. It will be up to the user agent to determine how to store and prompt
for global and per-site preferences.

### Limiting consent information to two bits

Two bits of information provides one bit for each current legislation requiring consent
banners (CCPA and GDPR). It also could be used to hold bits of information regarding
which types of cookies a user has opted into, outlined [here](https://gdprprivacypolicy.org/cookies-policy/).
However, there is no way to enforce that the two bits be used for consent information,
and it provides additional fingerprinting entropy.

### Legal effects

Currently, the Centralized Consent API is structured so that a site must query for a
user's data selling/sharing consent preference. In some jurisdictions, a
user's preference could act as a user-enabled global privacy control, and could make a site legally obligated to abide by that preference (see CCPA [regulations](https://www.oag.ca.gov/sites/all/files/agweb/pdfs/privacy/oal-sub-final-text-of-regs.pdf), section 999.315).


## Stakeholder Signals
[Global Privacy Control](https://globalprivacycontrol.github.io/gpc-spec/) (GPC) is a proposal to
  standardize 'Do Not Sell'. This work has some overlap with our purpose, but differs in
  a few crucial ways.
  * GPC actively pushes the Sec-GPC value to all sites via HTTP header, and is relying on legal enforcement under CCPA/GDPR to drive adoption. By contrast, the Centralized Consent API will rely on a site's incentive to create a better user experience and have more persistent storage for consent data. It may use legal enforcement if applicable once a site obtains a user's preference.
  * The Centralized Consent API avoids adding a global fingerprinting bit by making per-site and global preferences indistinguishable, and mitigates fingerprinting risks further by only revealing a user's preference in a first-party context with user interaction.


## Acknowledgements

Many thanks for valuable feedback and advice from other members of the WebKit team, including Tess, Brent, John and Simon.
