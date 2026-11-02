### Examples

<aside class="example" title="A form that asks whether the person is 18 or over">

```html
<form method="post" action="/enter">
  <agecheck name="age" groups="18+" required>Share that I'm 18 or older</agecheck>
  <button>Enter</button>
</form>
```

The person cannot submit the form until the check passes. When the form submits, the form data has one entry named `age` with the value `18+`.

</aside>

<aside class="example" title="An element with no groups attribute">

```html
<form method="post" action="/enter">
  <agecheck name="age" required>Share that I'm 18 or older</agecheck>
  <button>Enter</button>
</form>
```

With no `groups` attribute, the element asks for `18+`. This form behaves the same as the one above. A `groups` attribute with no group token the browser knows does the same.

</aside>

<aside class="example" title="A form with a message and another way to share age">

```html
<form method="post" action="/enter">
  <agecheck id="check" name="age" groups="18+" required>Share that I'm 18 or older</agecheck>
  <a href="/other-ways">Share my age some other way</a>
  <span id="message" role="status"></span>
  <button>Enter</button>
</form>

<script>
  const check = document.getElementById("check");
  const message = document.getElementById("message");

  check.addEventListener("change", () => {
    message.textContent ="Thanks. You can go in now.";
  });

  check.addEventListener("error", () => {
    message.textContent ="We couldn't use your age this time. You can try again, or share your age some other way.";
  });
</script>
```

The message region starts empty, so screen readers already watch the region when the text changes. The page never moves focus on its own. The link sits right after the element, so the next Tab reaches the link.

</aside>

<aside class="example" title="A site that tells teens from adults">

```html
<form method="post" action="/join">
  <agecheck id="check" name="group" groups="13-17 18+" required>Share my age group</agecheck>
  <a href="/other-ways">Share my age some other way</a>
  <button>Join</button>
</form>

<script>
  const check = document.getElementById("check");
  check.addEventListener("change", () => {
    if (parseInt(check.group, 10) >= 18) showAdultOptions();
    else showTeenOptions();
  });
</script>
```

The site needs every member to be at least 13, and offers teens and adults different things. A person aged 13 to 17 shares `13-17`. A person aged 18 or over shares `18+`. A person under 13 shares nothing, and the site gets an `error`.

Every group token begins with its lowest age, so `parseInt` gives the lowest age. The form data holds one entry, for example `group=13-17`.

</aside>

<aside class="example" title="A site that asks for the least">

```html
<agecheck name="age" groups="13+ 16-17 18+" required>Share my age group</agecheck>
```

The site lists a wide group next to narrow ones. The browser picks the group that tells the site least, as [[[#choosing-a-group]]] describes. So a person aged 16 or 17 shares `13+`, and the site does not learn that the person is under 18. A site that wants to tell the narrow groups apart lists only the narrow groups, and learns more.

</aside>

<aside class="example" title="A site with two elements">

```html
<form method="post" action="/join">
  <agecheck name="over13" groups="13+" required>Share that I'm 13 or older</agecheck>
  <agecheck name="over18" groups="18+">Also share that I'm 18 or older</agecheck>
  <a href="/other-ways">Share my age some other way</a>
  <button>Join</button>
</form>
```

The site needs every member to be at least 13. The site also offers more to members who are 18 or over. Each element asks its own question, and the browser asks the person about each one separately. The person can share one answer and not the other.

Only the first element is `required`, so the person can join without the second answer. The form data holds an entry for each check that passed, for example `over13=13+` and `over18=18+`.

Only one check runs at a time in a document. If the person starts the second element while the first check runs, the second element fires `error`.

</aside>

<aside class="note" title="Advice for sites">

Browsers do not enforce this advice.

- Use `method="post"` on the form, so the answer stays out of URLs.
- Name only the groups the site needs. Naming groups that do not overlap tells the site the person's exact age range.
- A token the browser does not know is dropped, and a list with no token the browser knows asks for `18+`. Read `group` in the `change` handler, and do not assume the group is the one you listed first.
- Use `parseInt(element.group, 10)` to get the lowest age in the group. Do not compare the whole string.
- With `required`, offer another way to share age on the same page. Use a link, because a submit button in the same form does not work until the check passes.
- Treat `error` as "not now". Offer to try again or another way.
- Never treat `error` as "too young".
- Show the message in a live region, so screen readers announce the message when the text changes.
- Put any new options right after the element or its label, so the next Tab reaches them.
- To offer a different path for younger visitors, put an ordinary "I'm under 18" link next to the element. The person follows the link only by choice.
- Remember a successful check in the site's own session rather than asking again.

</aside>
