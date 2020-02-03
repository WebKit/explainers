# Delivering origin-bound one-time codes over SMS

## Authors:

- [Theresa O'Connor](https://github.com/hober)

## Participate

- [Issue tracker](https://github.com/WebKit/explainers/labels/one%20time%20codes)

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Introduction](#introduction)
  - [Deficiencies of the status quo](#deficiencies-of-the-status-quo)
  - [Goals](#goals)
  - [Non-goals](#non-goals)
- [Proposal](#proposal)
- [Alternative approaches](#alternative-approaches)
  - [No special syntax (status quo)](#no-special-syntax-status-quo)
- [Stakeholder Feedback](#stakeholder-feedback)
- [Acknowledgements](#acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

Many websites make use of **one-time codes** for authentication.

SMS is a popular mechanism for delivering such codes to users, but using
SMS to deliver one-time codes can be risky.

This proposal attempts to reduce some of the risks associated with SMS
delivery of one-time codes. It does not attempt to reduce or solve all
of them. For instance, it doesn't solve the SMS delivery hijacking risk,
but it does attempt to reduce the phishing risk.

### Deficiencies of the status quo

Suppose a user receives the message "747723 is your FooBar
authentication code." It's possible, even likely, that *747723* is a
one-time code for use on *https://foobar.com*. But because there is no
standard text format for SMS delivery of one-time codes, systems which
want to make programmatic use of such codes must **rely on heuristics**,
both **to locate the code** in the message and **to associate the code
with a website**. Heuristics are prone to failure and may even be
hazardous.

### Goals

The goals of this proposal are:

1. To eliminate the need to rely on heuristics for extraction of
   one-time codes from SMS. (Ideally, end users shouldn't have to
   manually copy-and-paste one-time codes from SMSes to their browser.)
2. To reliably associate one-time codes intended for use on a specific
   website with that site. (One-time codes sent by a website should
   ideally only be entered on the actual site which sent it.)

### Non-goals

We must not expose the contents of SMS messages to websites.

## Proposal

To address this, we propose a **lightweight text format** that services
may adopt for such messages. It's about as simple as it gets. It begins
with (optional) human-readable text. After the human-readable text both
the code and the origin appear on a single line, with sigils denoting
which is which. This is the last line of the text. Here's an example:

    747723 is your FooBar authentication code.
    
    @foobar.com #747723

In this example, `"747723 is your FooBar authentication code."` is the
human-readable **explanatory text**, `"@foobar.com"` identifies the
**origin** (`https://foobar.com`) for which the code is to be used, and
`"#747723"` identifies the **one-time code** (`747723`). `"@"` and `"#"`
are **sigils** used to identify the text that follows them. Any origin
which is [schemelessly same site][] as `https://foobar.com/` is an
origin on which this code may be used.

[schemelessly same site]: https://html.spec.whatwg.org/multipage/origin.html#schemelessly-same-site

Adoption of this format would improve the reliability of systems which
today heuristically extract one-time codes from SMS, with clear end-user
benefit. It improves reliability of both extracting the code and also
associating that code with an origin.

Adoption of this proposal could improve the number of services on which
a browser can offer assistance with providing SMS one-time codes to
websites (e.g. an AutoFill feature), and could reduce the odds users
would enter one-time codes delivered over SMS on sites other than the
originating one.

## Alternative approaches

### No special syntax (status quo)

We believe the status quo provides insufficient programmability (because
it relies on heuristics) and, in particular, many typical SMS one-time
code message formats in the wild lack reliable origin information.

## Stakeholder Feedback

- Apple / Safari / WebKit: Positive (shipped an earlier version in iOS 12 / Safari 12 for macOS)
- Google / Chrome / Blink: Positive (Sam Goto and Steven Soneff gave a lot of feedback early in this work.)
- Firefox / Gecko : Unknown

## Acknowledgements

Many thanks to
Aaron Parecki,
Eryn Wells,
Jay Mulani,
Paul Knight,
Ricky Mondello,
Sam Goto, and
Steven Soneff
for their valuable insights.
