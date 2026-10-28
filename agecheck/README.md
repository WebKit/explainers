# The `<agecheck>` element

## Authors

- Marcos Cáceres (Apple)

## Participate

- [WebKit explainers issue tracker](https://github.com/WebKit/explainers/issues)

## Status

A strawperson proposal, meant to start discussion. Nothing is implemented in a shipping browser.

## Introduction

Sites that check age today use either a simple link/button, or send people to third-party services or ask them to upload an ID. Uploading IDs leaks personal data and collects far more than the site needs. Sites need a way to learn "at least this age" and nothing else, without needing a third-party age service, in regular and private browsing alike.

`<agecheck>` is a form element that lets a site ask one question: whether the person is at least 13, 16, or 18. The answer is declared, not verified. The browser takes the answer from an age the person or a parent already gave the platform. Where the platform offers no age API, the browser takes the answer from an age the person enters in the browser. The browser asks the person before sharing it, and gives the site only yes or no.

## Goals

- A site learns whether a person meets each age it names. The site gets no birthdate, no name, and no ID, and the answer does not say how the age was set. A site that asks again and again can learn a little more; see "[Ages](#ages)".
- A site can't use the answer to track people across sites, except by matching the day the answer changes; see "[Ages](#ages)".
- A user finds it as easy to use as today's "I'm over 18" button.
- A site adds one element. The site doesn't need an age-check service.
- The person doesn't need a government ID.
- It works only on secure pages and only in the top-level page, in regular and private browsing alike.
- Users using a screen reader or a keyboard can use the `<agecheck>` element and the browser's prompt.
- The element works without JavaScript.

## Non-goals

- Not an identity system. Sites that need a name or a birthdate should use the [Digital Credentials API](https://www.w3.org/TR/digital-credentials/).
- Not a way to sign in. Sites still use passkeys or passwords to recognize people who come back.

## The proposal

A new HTML element, `<agecheck>`. When the person clicks it, the browser asks the platform for the person's age, or uses an age it stores itself. The platform may ask whether to share the age with the browser, as it does for any app, usually only the first time. Then the browser shows its own prompt, naming the site and the age. If the person can share, the browser asks whether to. If they can't, the browser says so.

If the person agrees, the page learns that the person is at least the age the site named. Otherwise the page gets the same error as for any failure, so the browser never tells it why. The element works inside a form, like an input element.

To the server, the answer is an honor system, like today's "I'm over 18" button. Anyone can send the same form value, so it proves nothing to a regulator that requires verification.

## Why an element

The user clicks the element, the browser shows its own prompt, and the page gets only the result or an error. It works in a plain form with no script, and the browser knows what the control is, so it can give it the right role and accessible name. Only the user's own action on it or its label opens the prompt. Script can't, even with `click()`.

By default, the element looks and lays out like a `<button>`, so a site that doesn't style it still shows a control people recognize. Authors can restyle it or hide it behind a label, as they do other form controls. A site could label the element misleadingly, as with any button. So the browser's prompt, not the element's look, protects people. For example, the prompt should ignore input for a short time (see "Privacy and security"). During this time, the prompt shows that the prompt is not ready yet, so people using assistive technology do not have to guess why their input does nothing.

## Embedded content

In this first version, embedded third party content, such as a video player, can only get the answer from the top-level page, by its own means, such as `postMessage`, so it must trust that page. A third party can run the check only as a top-level page of its own, such as a popup, where the prompt names the third party.

## Where the age comes from

The browser doesn't ask the site or a third party. When the platform has an age API, the browser uses an age the person or a parent already gave the platform, such as Apple's Declared Age Range or Google's Play Age Signals. Both give apps an age that the person declared, that a parent set, or that the platform verified. How the platform sets the age is up to the platform.

What the browser does:

- If the platform offers an age API, the browser uses only that, so a stored age can't get around a parent's setting. The rule holds when this browser can't call the API, or when the API has no age for the person. In those cases the check fails.
- If the platform offers no age API, the browser offers to store an age the person enters, the way the browser stores payment instruments for autofill.
- A browser should not store a birth date. A browser should keep only the age group (under 13, 13 to 15, 16 to 17, or 18 and over) and the date the person entered it.
- A browser should ask the person to enter an age again after, for example, one year. A browser should not ask the person again if the stored age is the 18 and over age group.
- A browser that stores its own age lets the person change that age.
- Private browsing works the same way as regular browsing and still uses the platform API. A private window can use an age that regular browsing stored. The browser forgets any age that a private window stored once the private browsing session ends.
- The answer never carries a platform identifier.
- The browser never tells the platform which site asked.
- The browser could have a setting to turn the feature off, and a control that clears every remembered age choice at once. The browser should not list which sites have asked; see "People in danger" under "Open risks".

For children, the platform's parental controls decide whether the browser gets an age at all. On Apple platforms a parent can choose to always share, never share, or have the child asked each time. If a parent's setting or the platform blocks sharing, the browser shows its "your age can't be shared" prompt, the same for children and adults.

## Ages

A site picks one age per check: 13, 16, or 18. Every platform age API we know of supports those ages, though some regions use their own (see "Jurisdiction"). They also match the default groups of Google's Play Age Signals (0 to 12, 13 to 15, 16 to 17, and 18 and over), so a browser on Android needs no special setup.

A site can ask about more than one age, with one check for each age, for example a movie site with films rated 13, 16, and 18.

A site that asks again and again can see the day the answer changes. That day is the anniversary of when the age was set, not the birthday. Where the browser keeps a copy or stores the age itself, a higher answer appears on the anniversary of when the browser got it. If the person updates the age early, the change may hint at a birthday. The cost is that someone who has just had a birthday may fail until that anniversary, unless they or a parent update the age. A lower range from the platform applies at once, so a site can see yes become no. The site can't tell why, and a drop doesn't point to a birthday.

So by asking several ages, a site learns the highest age the person agrees to share. The site can guess the person is younger than the next age, but it can't be sure, because it can't tell a refusal from a person who is too young. A native app using Declared Age Range learns the person's age range with a single request. Sites that already share data about a person can also pool what they each learned. The answer carries little that links a person across sites, except the day it changes. That day is the same on every site, so sites that pool can match it. A site that checks every day sees the exact day, which narrows the person to one day of the year. Apart from a correction, only people under 18, who still have an age to reach, have such a day.

## Jurisdiction

The platform, not the browser, knows which rules apply to the person's location. Declared Age Range uses the person's location and account settings. The platform answers with an age range. The browser says yes only if the bottom of the range is at least the age the site asked about. Declared Age Range gives someone under 13 an age range with no bottom. An age range with no bottom counts as below every age. The browser never answers about a different age than the age the site asked about.

When the platform returns no age range, the browser treats the missing age range as not sharing instead of having no age set.

Some regions replace the ages the site asked about with their own ages. An age range can then start below and end above the age the site asked about. For example, a site asks about age 16. The platform gives an age range of 14 to 17. The browser cannot tell whether the person is at least 16 and fails the check. In those regions, some people who meet the age fail the check.

## Using the element

```html
<form method="post" action="/enter">
  <agecheck name="age" age="18" required>Share that I'm 18 or older</agecheck>
  <button>Enter</button>
</form>
```

- `age`: the age this check asks about. The allowed values are 13, 16, and 18.
- `meetsAge`: true after a successful check.
- `name`, `required`, `disabled`, `form`: The browser treats these the same as for an input.
- Events: The browser fires `change` on success. The browser fires `error` on any failure after the check starts. A failure includes when the person closes the prompt. A click that does not start a check fires no event. `change` bubbles and `error` does not, so a failed check never looks like a script error to the page. The page cannot tell "declined" from "didn't pass".

**Advice for sites.** This section is advice that the browser does not enforce.

- Sites should use `method="post"` on the form. This choice keeps the answer out of URLs.
- With `required`, a site should offer another way to show age on the same page. Use a link. A submit button in the same form would not work until the check passes.
- Sites should treat `error` as "not now". Sites should offer to try again or offer another way.
- Sites should show that message in a live region, a part of the page that screen readers announce when it changes, so screen reader users hear the message.
- Sites should put any new options right after the element or the element's label. The next Tab reaches the options.
- Sites should never treat `error` as "too young".
- A site that needs a different path for younger visitors can offer an ordinary "I'm under 18" link next to the element. The person clicks the link only if the person chooses.

This code example shows a site following the advice. People who use a screen reader or only the keyboard can use the page this way.

```html
<form method="post" action="/enter">
  <agecheck id="check" name="age" age="18" required>Share that I'm 18 or older</agecheck>
  <a href="/other-ways">Share my age some other way</a>
  <span id="message" role="status"></span>
  <button>Enter</button>
</form>

<script>
  const check = document.getElementById("check");
  const message = document.getElementById("message");

  check.addEventListener("change", () => {
    message.textContent = "Thanks. You can go in now.";
  });

  check.addEventListener("error", () => {
    message.textContent = "We couldn't use your age this time. You can try again, or share your age some other way.";
  });
</script>
```

The live region starts empty, so screen readers are already watching the live region when the text changes. The example page never moves focus on its own. The message says what happened.

## Older browsers and repeat checks

A site can check for `HTMLAgeCheckElement` in `window` and show its old fallback if it's missing. The interface is also missing on a page that isn't a secure context, so the check fails there too. In a browser that doesn't know the element, the text inside it shows as plain text. A site can't learn in advance whether the person has an age set.

The first time a site uses the element, the browser shows its own prompt. If the person agrees, the browser remembers that choice for that site and that age, and later checks on the same site skip the browser's prompt. A site that asks about a different age gets a new prompt. A site should still remember a successful check in its own session rather than asking again. A private window starts with no remembered choices and never reads the choices from regular browsing. The browser forgets the choices made in a private window when the private browsing session ends. People can clear all of these choices at once in the browser's site settings. The browser also clears these choices whenever it clears the site's data.

## Processing model

The element starts from a click or tap on it or its label, a key press, or an assistive technology's press action. Which keys depends on its role, which is an open question. The browser requires a trusted event. A trusted event is one the browser creates from the person's own input, not from script. The event must aim at the element or its label. So `click()` and events that script dispatches do nothing, even inside the person's click on something else. HTML lets each platform decide what a click on a label does. This proposal sets a new rule. A click on the element's label starts a check only if that click is a trusted event.

When the person starts the element, the browser takes a snapshot of `age` and uses it for the steps below, so the person answers the question they saw:

1. If the element is disabled, if `meetsAge` is already true, or if a check from this element is already running, stop without firing an event.
2. If the element isn't in a top-level document, for example inside an iframe or an embedded object, fire `error` and stop.
3. If `age` isn't 13, 16, or 18, fire `error` and stop. For this step and step 2, the browser also writes the reason to the developer console, which scripts can't read.
4. On every check, the browser asks the platform for the person's age range. The browser lets the platform show a prompt if the platform chooses. The browser passes the ages 13, 16, and 18 to the platform.
   - Some platforms have an anniversary rule. For these platforms, the browser keeps no copy, so the platform's own rules apply every time. These rules include a parent's choice to ask the child each time.
   - A platform might lack an anniversary rule. For this platform, the browser keeps one copy of the answer for a user-agent specific time period (e.g., one year). The browser uses that copy for every site. If the platform reports a higher range, the browser keeps using the copy, so a higher answer appears only on an anniversary. If the platform reports a lower range, the browser uses the lower range and replaces the copy at once. A parent's correction then applies at once.
   - The platform might stop sharing. The browser drops its copy, so a parent's change applies at once.
   - For an age the browser stores itself, the rules in "Where the age comes from" apply.
   - If the person declines in the platform's prompt, the browser fires `error`. The browser then stops.
   - For any other result, the browser goes to the next step. A failure counts as another result.
5. The browser shows its own prompt, naming the site (for example, the origin). The browser skips the prompt only if the person already agreed to share this age with this site and the platform still says the person is at least that age.
   - If the browser stores the age itself and has no age yet, the prompt lets the person select the age group the person is in. The browser continues the steps with that declared age range.
   - The prompt says the age can't be shared when any of these is true:
      - the platform refused, failed for any reason, or has no age for the person;
      - the person does not select an age group;
      - the range shows the person isn't at least the age, or can't say either way.
   - If the platform says the person turned sharing off, the prompt says where the person can change sharing. The prompt adds an example like the system settings.
   - When the platform has no age for the person, the prompt adds that no age is set. The prompt tells the person where to set an age.
   - If the platform fails because of a network problem, the prompt tells the person to try again later.
   - Otherwise, the prompt asks whether to share that the person is at least the age.
   - In every case above where the prompt says the age can't be shared, when the person closes the prompt, the browser fires `error` and stops.
   - If the person cancels the prompt, the browser fires `error` and stops.
   - The prompt is modal. The person cannot use the page until the person answers the prompt.
6. If the element is no longer in the document, if the document is no longer fully active, if `age` no longer matches the snapshot, if the element is now disabled, or if the form reset since the check started, fire `error`, write the reason to the developer console, and stop. Otherwise set `meetsAge` to true and fire `change`.

Once steps 1 to 3 pass, every failure that depends on the person's choice or age reaches the page only after the person has spent time on a prompt. The browser adds no timing difference of its own, but how long the person takes can still differ (see "Human timing" under "Open risks"). The browser never asks someone to share an age they don't meet.

With `required`, the element counts as missing a value until `meetsAge` is true.

When the form submits, if `name` is set and `meetsAge` is true, add one entry named `name`. Its value is the age it checked, such as `18`. If `meetsAge` is false, add nothing, the same as an unticked checkbox.

When the form resets, or when `age` changes to a different value, clear `meetsAge`. The browser never restores `meetsAge` after navigation. When a page comes back from the back/forward cache, the browser clears `meetsAge` before the `pageshow` event, so the page can update. The browser never copies `meetsAge` when the element is cloned. When the person answers the prompt after a reset, the browser drops the answer and fires `error`.

The steps after the browser's prompt appears run in parallel, so scripts on the page keep running while the person decides.

## Automated testing

Like the Digital Credentials API's WebDriver module, a WebDriver extension, available only in automation sessions, could set a test age and drive the prompt, so sites and browsers can test the element automatically.

To do: define that extension. It needs a command to set the test age, and a way to agree to or cancel the browser's prompt.

## Web IDL

```webidl
[Exposed=Window, SecureContext]
interface HTMLAgeCheckElement : HTMLElement {
  [HTMLConstructor] constructor();

  [CEReactions] attribute unsigned long age;
  readonly attribute boolean meetsAge;

  readonly attribute HTMLFormElement? form;
  [CEReactions] attribute DOMString name;
  [CEReactions] attribute boolean disabled;
  [CEReactions] attribute boolean required;
  readonly attribute NodeList labels;
  readonly attribute boolean willValidate;
  readonly attribute ValidityState validity;
  readonly attribute DOMString validationMessage;
  boolean checkValidity();
  boolean reportValidity();
  undefined setCustomValidity(DOMString error);
};
```

## Accessibility and internationalization

The browser gives the element its role, keyboard handling, and focus return. The element's name comes from its visible text or its label, so voice control users can say what they see. When the prompt closes, focus returns to the element if it can take focus, and otherwise to where it was before.

The prompt belongs to the browser or platform, not the page, but its accessibility is in scope. It should follow WCAG 2.2, and where it isn't web content, it should follow WCAG 2.2 as [WCAG2ICT](https://www.w3.org/TR/wcag2ict-22/) describes, the W3C guidance on applying WCAG to software that isn't a web page. Its content is exposed to assistive technology with the right names, roles, and values. It doesn't rely on a single sense or way of interacting, and it gives people enough time.

The prompts use the language of the browser's or the platform's own interface. They must show site names in any script, including right-to-left scripts, without letting a name pretend to be another site.

## Privacy and security

- The site learns the answer for one age per check.
- Every failure looks the same to the site, whether the person is too young, has no age set, or declined.
- The browser's prompt should ignore input for a short time after it appears, for example as long as the system's double-click time, and while a window from the page or from another app covers it. A window that the person's assistive technology draws, such as an on-screen keyboard or a magnifier, doesn't count as covering the prompt. A page can't use a fast second click to answer a prompt the person hasn't seen yet. A key that the person was already holding when the prompt appeared must not answer the prompt either. For example, the prompt can have no default button.

## Open questions

- Will sites and regulators accept a declared answer? No platform age API makes proofs today. If platforms later sign ages they have confirmed, could the element return a proof that says how the age was confirmed, and reveals nothing else?
- If sites or laws need a proof, could the element offer a step up? A page that gives the element a `nonce` would opt in. The browser would then ask the platform for a token that the issuer can't tie to the site, bound to that nonce, and return it with the answer, along with how the age was set, such as declared by the person or checked by ID. A page with no `nonce` would get today's behavior. Privacy Pass ([RFC 9576](https://www.rfc-editor.org/rfc/rfc9576.html), [RFC 9577](https://www.rfc-editor.org/rfc/rfc9577.html), [RFC 9578](https://www.rfc-editor.org/rfc/rfc9578.html)) has a field for a site's per-request nonce, and its tokens hide the site from the issuer. None of the token types in those RFCs carries an age, and the working group draft that adds public metadata to tokens is still in progress. Would a site that demands the token shut out people whose browsers or platforms can't get one, and what would stop that?
- Platform age APIs may limit how their answers are used. Google's Play Age Signals terms say "the information returned by the API can be used only by the requesting app", and forbid use for analytics. California's [Digital Age Assurance Act](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB1043) tells a developer who receives a signal not to "Share the signal with a third party for a purpose not required by this title." Can platforms allow browsers to pass a yes or no on to websites, and on what terms?
- In some regions, Declared Age Range shares the age with apps automatically, and the person can't decline. The browser still asks before telling a website. What if a law requires websites to get it automatically too?
- Does a platform always give a range to a verified adult? The Google pages we read don't say whether it does.
- Should a later version let iframes use the element? If so, how does it stop one company's iframe, embedded on many sites, from becoming the kind of third party this proposal aims to avoid?
- Should one check ask about several ages at once, as Declared Age Range lets apps do? A movie site could then ask once, but the person's group would be revealed in a single prompt.
- Should assistive technology see the element as a checkbox or a button? A checkbox (`aria-checked`, then `aria-readonly` after success) can say the check succeeded, and matches how the form submits it. But people may not expect a checkbox to open a prompt. Also, ARIA 1.2 deprecates `aria-haspopup` on checkbox, so a checkbox can't warn that it opens a prompt. A button with `aria-haspopup="dialog"` sets that expectation, but none of its states can say the check succeeded: `aria-pressed` makes it a toggle and `aria-expanded` a disclosure. Either way, step 1 stops a press after a successful check without firing an event. The page then cannot answer a screen reader user who presses again. Should that press fire an event? We'd like advice from accessibility experts.
- [Nick Doty's Age Range API](https://github.com/npdoty/age-range) requires a site to publish a declaration at a well-known address, and the browser checks it before returning a range. Should sites that use this element do the same? For example, a site could publish which ages it asks about and what it does with the answer.
- `meetsAge` and the `error` event are placeholder names. On other elements, `error` usually means something failed to load. `meetsAge` must say the check passed without claiming anyone verified the age. What should they be called?
- The element leaves out 21 because the default age groups of some platform age APIs, such as Google's Play Age Signals, end at 18 and over, so a check for 21 might not work everywhere. Sites that must check for 21 can't use the `<agecheck>` element today. Should the set grow when every platform can answer 21?
- Asking the platform on every check works when the platform shows its own prompt the first time and then answers quietly, as a prototype showed on one platform. It also needs the platform to keep honoring a parent's choice to have the child asked each time. Do other platforms behave this way?
- How does a person or a parent update an age early, for example after a birthday? On Apple platforms, people can update it in Settings, under Personal Information, then Age Range for Apps. What do other platforms offer?
- When age sharing is off, can the browser tell whether the person or a parent turned it off? The prompt should point to settings only when the person can change them.
- On some managed devices and accounts, such as ones a school or employer runs, the person can't set an age at all. Declared Age Range has an `invalidAccount` error, "the current Apple Account isn't eligible for age range sharing", but its documentation doesn't say which accounts that covers. Because a platform API exists, the browser won't let the person enter an age instead, so only the site's own fallback helps. Should the browser offer its stored age in this case?
- If the person already allowed an age for a site, the site already got a yes for that age. A later failure can't mean "too young" for the same person. The failure could show that a parent lowered the age, that sharing was turned off, or that someone else is using the profile. Does that matter?
- Should `error` be an `ErrorEvent` that carries an `AbortError` when the page removes the element during a check? A plain event can't carry one. A richer event could also tell the page which failure happened, so it would have to carry an error only where that reveals nothing about the person.
- On a shared device, the browser cannot tell who is holding the device. Should the browser, or the platform, ask the person to confirm with Touch ID, Face ID, or a similar tool from the platform before the platform shares an age? A first version does not need this extra step. This extra step could be an option for shared devices. The open risk called "Shared devices" covers the rest.
- Should the browser remember a refusal, so a page can't open the prompt again after every click? Then a later check would fail at once with no prompt, and the quick failure would show the site that the person refused.
- Should the browser move the day a higher answer appears by a different few days for each site? Then sites that pool couldn't match the day. The cost is that a person who just reached an age waits longer. On a platform with an anniversary rule, the browser would also have to keep a copy, which step 4 says it does not.
- Should a site be able to turn the element off for its own page, for example with a [Permissions Policy](https://www.w3.org/TR/permissions-policy/)? Then a script the site loads couldn't use the element. A site that doesn't use the element would lose nothing.
- A platform can require an app to have permission before it can call the platform's age API. A browser without that permission would fail every check on that platform. Is failing every check the right outcome, or should such a browser offer a stored age, which could get around a parent's setting?

## Stakeholder feedback

No public positions yet.

## Related approaches

The `<agecheck>` element doesn't replace these. Several solve different problems, and they can work alongside it.

**Mozilla's content labelling** ([whatwg/html#11722](https://github.com/whatwg/html/issues/11722)). Sites label adult pages, and the browser blocks them for people whose platform restricts adult content. The site learns nothing. It blocks whole pages, while the `<agecheck>` element lets a site check before showing something specific.

**Mozilla's `Prefer: safe` header** ([whatwg/fetch#1891](https://github.com/whatwg/fetch/issues/1891)). The browser tells every site the person prefers safe content, without the site asking. The `<agecheck>` element answers only a site that asks, after the person agrees.

**An Age Range API**, [proposed by Nick Doty](https://github.com/npdoty/age-range) (Center for Democracy & Technology). A page calls `navigator.ageRange()` and, once the person gives permission, gets an age range such as 13 to 17. The site must also publish a declaration at a well-known address, which the browser checks first. The `<agecheck>` element answers one age per check, only the person's own action starts it, and the element needs no declaration file.

**The Digital Credentials API**, with or without passkeys. It can carry a cryptographic proof, but it needs a digital ID, which many people don't have. It doesn't guarantee that only the age is revealed, and it lets a site ask for more than age. Presenting an ID is also heavy for a simple age check. The `<agecheck>` element uses the age the platform already has, or an age the person enters in the browser, and asks only about age.

**A JavaScript method** could open the same prompt. But it would still need a user action to start it, and wouldn't work in a form without script. For a canvas, the [HTML-in-Canvas proposal](https://github.com/WICG/html-in-canvas) would let the element itself be drawn inside the canvas, if a click on a drawn element counts as the person's own click.

## Open risks

- **Proof for regulators.** Sites may need to show a regulator that they checked age, and a declared answer can't show that.
- **People left out.** Some people have no account, no supported device, or no age set. Sites may fall back to ID uploads, and nothing here can stop them. Adults whose account is still set up as a child's, for example one a carer manages, are treated as children until whoever manages the account changes it.
- **Old buttons.** A site can keep today's "I'm 18" button next to the element, and then the element protects no one. Nothing here makes a site remove the button, so the element helps children only on sites that do. Those same sites shut out people who can't or won't answer.
- **Ages the browser stores.** Where the platform has no age API, the browser keeps an age the person enters, and the person can change it. A child can enter 18 and over, and the element then protects that child no more than today's "I'm 18" button does.
- **Shared devices.** A minor can use an adult's unlocked device, or control it remotely. Child accounts on the platform are the main defense. On a shared computer or browser profile, a stored age applies to whoever is using it. Anyone looking at the screen can also tell from the browser's prompt whether the person passed.
- **A third party as the top-level page.** A company can run the check as the top-level page, in a popup or after a redirect, and pass the answer back, as "Embedded content" describes. Nothing stops this.
- **Tricked approvals.** A page can push someone to approve without thinking. A page can make a label for the element cover the whole page, so a click meant for something else opens the prompt. The page can open the prompt again after every refusal. After the person agrees for a site and age, a click on that label starts a new check that runs with no prompt. See "Why an element".
- **Pushy platforms.** A platform could use the feature to push people into creating or signing in to its own account before it shares an age.
- **An age on every device.** To pass the check on sites that rely on the element, people must declare an age on every device they use. Over time, declaring an age could become a condition for using parts of the web.
- **Friction and refusal.** People may find the prompt annoying and refuse it. We have no research yet on how many.
- **Scripts on the page.** Like any form field, the answer is visible to every script the site chooses to run, including analytics. A script can also add its own `<agecheck>` element and read the result of a check that a click on it starts. The prompt names the site, not the script, so the person can't tell who asked. After the person agrees for a site and age, a click on that script's element or label starts a new check that runs with no prompt.
- **Trusting the platform.** A platform age API may contact its vendor's servers. Declared Age Range, for example, can fail with a network error. Because the browser never names the site, the platform can't report which sites a person visits. Where the browser asks the platform on every check, the platform can learn how often and when checks happen.
- **Human timing.** A prompt that only informs takes a different time than one that asks, and a platform that has the person set up an age first takes longer still. So how long the person took, or the page noticing focus leave for the system settings, may hint that no age is set.
- **A failed try.** A site sees that the person started a check and did not pass. The site can't tell why, but it can treat a failed try as a hint that a child tried, and block or flag that person. The advice says sites should never treat `error` as "too young", and nothing here makes them follow it.
- **People in danger.** For some people, an adult age on their device is risky. If sharing is turned off, for example because the person declined the platform's prompt or turned off a browser setting, a site must see it as an ordinary refusal. The browser's record of which sites asked about age is also sensitive, so it should be cleared with the site's data and kept out of view.

## User research

None of our own yet.
