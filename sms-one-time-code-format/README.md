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
- [Goal](#goal)
- [Non-goal](#non-goal)
- [Proposal](#proposal)
- [Alternative approaches](#alternative-approaches)
  - [No special syntax (status quo)](#no-special-syntax-status-quo)
- [Stakeholder Feedback](#stakeholder-feedback)
- [Acknowledgements](#acknowledgements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Introduction

Many websites make use of **one-time codes** for authentication. SMS is
a popular mechanism for delivering such codes to users.

## Deficiencies of the status quo

Suppose a user receives the message "747723 is your FooBar
authentication code." It's possible, even likely, that *747723* is a
one-time code for use on *https://foobar.com*. But because there is no
standard text format for SMS delivery of one-time codes, systems which
want to make programmatic use of such codes must rely on heuristics,
both to locate the code in the message and to associate the code with
the relevant website (origin). Heuristics are prone to failure and may
even be hazardous.

## Goal

End users shouldn't have to manually copy-and-paste one-time codes from
SMSes to their browser.

Sites should be able to trust that the one-time codes they send over SMS
will only be entered on the originating site.

## Non-goal

We must not expose the contents of SMS messages themselves to websites
in order for this feature to work.

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

Eryn Wells,
Ricky Mondello,
Paul Knight,
Jay Mulani,
Sam Goto, and
Steven Soneff
for their valuable insights.
