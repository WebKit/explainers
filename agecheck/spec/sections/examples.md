### Examples

<div class="example" title="A form that asks whether the person is at least 18">

```html
<form method="post" action="/enter">
  <agecheck name="age" age="18" required>Share that I'm 18 or older</agecheck>
  <button>Enter</button>
</form>
```

The person cannot submit the form until the check passes. When the form submits, the form data has one entry named `age` with the value `18`.

</div>

<div class="example" title="An element with no age attribute">

```html
<form method="post" action="/enter">
  <agecheck name="age" required>Share that I'm 18 or older</agecheck>
  <button>Enter</button>
</form>
```

With no `age` attribute, the element asks about 18. This form behaves the same as the one above.

</div>

<div class="example" title="A form with a message and another way to share age">

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
    message.textContent ="Thanks. You can go in now.";
  });

  check.addEventListener("error", () => {
    message.textContent ="We couldn't use your age this time. You can try again, or share your age some other way.";
  });
</script>
```

The message region starts empty, so screen readers already watch the region when the text changes. The page never moves focus on its own. The link sits right after the element, so the next Tab reaches the link.

</div>

<div class="example" title="A site that asks about two ages">

```html
<form method="post" action="/join">
  <agecheck name="over13" age="13" required>Share that I'm 13 or older</agecheck>
  <agecheck name="over18" age="18">Also share that I'm 18 or older</agecheck>
  <a href="/other-ways">Share my age some other way</a>
  <button>Join</button>
</form>
```

The site needs every member to be at least 13. The site also offers more to members who are at least 18. Each element asks its own question, and the browser asks the person about each age separately. The person can share one answer and not the other.

Only the first element is `required`, so the person can join without the second answer. The form data holds an entry for each check that passed, for example `over13=13` and `over18=18`.

Only one check runs at a time in a document. If the person starts the second element while the first check runs, the second element fires `error`.

</div>

<aside class="note" title="Advice for sites">

Browsers do not enforce this advice.

- Use `method="post"` on the form, so the answer stays out of URLs.
- With `required`, offer another way to share age on the same page. Use a link, because a submit button in the same form does not work until the check passes.
- Treat `error` as "not now". Offer to try again or another way.
- Never treat `error` as "too young".
- Show the message in a live region, so screen readers announce the message when the text changes.
- Put any new options right after the element or its label, so the next Tab reaches them.
- To offer a different path for younger visitors, put an ordinary "I'm under 18" link next to the element. The person follows the link only by choice.
- Remember a successful check in the site's own session rather than asking again.

</aside>
