## Rendering and default style {#rendering}

By default, the [^agecheck^] element looks and lays out like a `button`. A site that does not style the element still shows a control people recognize. Authors can restyle the element as they restyle a `button`.

The browser's prompt protects people, not the element's look. A site can style the element to look like anything, as with any button. So nothing in this section is a security boundary.

### User agent style sheet

Target: [[[HTML#form-controls]]] in the rendering section. Each rule there that names `button` gains [^agecheck^], and no other rule changes. The new rules are:

```css
@namespace "http://www.w3.org/1999/xhtml";

input, button, agecheck, textarea {
  letter-spacing: initial;
  word-spacing: initial;
  line-height: initial;
}

input, select, button, agecheck, textarea {
  text-transform: initial;
  text-indent: initial;
  text-shadow: initial;
  appearance: auto;
}

input:is([type=reset i], [type=button i], [type=submit i]), button, agecheck {
  text-align: center;
}

input, button, agecheck {
  display: inline-block;
}

input:is([type=radio i], [type=checkbox i], [type=reset i], [type=button i],
[type=submit i], [type=color i], [type=search i]), select, button, agecheck {
  box-sizing: border-box;
}

button,
agecheck,
::file-selector-button,
input:is([type=color i], [type=reset i], [type=button i], [type=submit i]) {
  align-content: center;
}
```

HTML leaves the button's font, colors, border, padding and pressed look to each user agent. The user agent is expected to give an [^agecheck^] element the same platform button look the user agent gives a `button` element, in every state. The states include disabled and being pressed.

### Native appearance

Target: [[[HTML#native-appearance-2]]]. The list that starts "The following elements can have a native appearance for the purpose of the CSS 'appearance' property" names `button`. New list item, before `button`:

> <ins>[^agecheck^]</ins>

### Button layout

Target: [[[HTML#button-layout]]]. Current text:

> If the element is a button element, then the 'display' property is expected to act as follows:

New text:

> If the element is a button <ins>or [^agecheck^]</ins> element, then the 'display' property is expected to act as follows:

### The `agecheck` element

Target: a new subsection under [[[HTML#widgets]]], right after [[[HTML#the-button-element-2]]]. New text:

> <ins>The [^agecheck^] element, when it generates a CSS box, is expected to depict a button and to use button layout.</ins>

<aside class="note">

The element looks the same before and after a successful check. A site that wants to show success can style the element from script, after the `change` event.

</aside>
