# Subtitle Style Menu Explainer

The purpose of this document is to explain a new web API intended to allow websites to comply with new [FCC accessibility regulations](https://www.fcc.gov/document/fcc-acts-improve-accessibility-closed-captioning-settings), specifically in regards to making caption display settings "readily accessible".

## Authors

* [Jer Noble](https://github.com/jernoble)
* [Dana Estra](https://github.com/danae404)

## Background

The FCC has [previously](https://www.federalregister.gov/documents/2016/02/04/2016-00929/accessibility-of-user-interfaces-and-video-programming-guides-and-menus) required devices and applications to support closed captioning, and those devices and applications must also support user-specificed styling of caption display. The new [regulations](https://www.fcc.gov/document/fcc-acts-improve-accessibility-closed-captioning-settings) build upon those requirements and adds requirements and five factors to evaluate compliance with those requrements: "proximity, discoverability, previewability,
consistency and persistence" [^§I.2]. The order requires manufacturers of covered devices to "expose closed caption display
settings via an application programming interface (API) that an over-the-top app provider can use upon
launch of their app on the device" [^§III.B.1.28].

This explainer proposes a new Web API which fulfills the requirements in this regulation, by allowing a web app to trigger a platform-provided subtitle settings menu. The subtitle settings menu will meet the "previewability, consistency, and persistence" factors from the regulations above, without comprimising users' privacy. The remaining factors of "proximity and discoverability" will be the responsibility of the web app itself.

## Use Cases

The primary use case is to enable a web application which is covered by the regulation in question, uses the browser to render subtitles, to access the platform subtitle settings submenu. The web app may have custom playback controls, including custom controls to choose between available subtitle or closed caption options. To meet the "proximity and discoverability" requirements, the web app can add a "Settings..." menu item in their caption selection menu that, when selected, will call into this new web API.

## Concepts

The following concepts are used in the FCC regulation:

"Proximity"
* The FCC regulation requires [^§III.B.1.24] that apps “will place ... the closed caption display settings ... in one area of the
settings ... that is accessed via a means reasonably comparable to a button, key, or icon.”
* Web apps may choose to meet this requirement by adding a button or menu item to their custom playback controls which calls into this new Web API

"Discoverability"
* The FCC regulation requires [^§III.B.1.26] usability testing to be performed in order to ensure the caption display settings are discoverable.

"Previewability"
* The FCC regulation requires [^§III.B.1.27] that users "are able to preview the appearance of closed captions on
programming on their screen while changing the closed captioning display settings".
* The responsibility for meeting this factor falls upon the UA, which will show placeholder captions while the caption display settings menu is visible, and will adjust the styling of that placeholder as the user chooses settings.

"Consistency and Persistence"
* The FCC regulation requires [^§III.B.1.28] that devices provide access to caption display settings via an API accessible to applications, and that covered distributors will use "the operating system-level closed caption settings of the [apparatus] upon launch of the app on the device".
* The proposed web API is intended to be the mechanism by which both devices will provide access to caption display settings.
* Support for distributors applying "operating system-level closed caption settings" is out of scope of this proposal, however the web platform already includes support for applying those settings via TextTracks, when UAs which apply OS settings to TextTrack rendering.

## Usage

### HTMLMediaElement.showCaptionSettings()

```idl
dictionary CaptionDisplaySettingsOptions {
	attribute Node? anchorNode;
	attribute CSSOMString? positionArea;
};

partial interface HTMLMediaElement {
	Promise<undefined> showCaptionDisplaySettings(optional CaptionDisplaySettingsOptions options);
};
```

### Present menu 

`showCaptionSettings()`, when called, will place a caption display settings menu on the screen. If applicable, it will position the menu in such a way that it is adjacent to the `options.anchorNode` provided, at the area indicated by `options.positionArea`, which are both defined in [CSS Anchor Position](https://drafts.csswg.org/css-anchor-position/). The returned promise will resolve once the user has made an affirmative caption display settings choice, or has otherwise closed the display settings menu.

The menu must provide the following behaviors:
- The menu will provide a list of selectable "styles", matching the list provided by the operating system.
- The currently selected menu item will match the operating system's currently selected "style".
- Any active cues from any `TextTrack`s will have their rendering surpressed. 
- A synthenic "cue" will be provided as if it were an active cue from a displaying `TextTrack`.
- Selecting a "style" will update the rendering of the synthetic cue, allowing that style to be "previewed".
- Once the user has made an affirmative style selection choice, the menu will close, and the returned `Promise` will resolve.

Example:

```js
	this.subtitleSettingsMenu.addEventListener('click', async event => {
		let options = {
			anchorNode: this.subtitleSettingsMenu,
			positionArea: "center right",
		};
		await this.video.showCaptionSettings(options);
		this.hideSubtitleMenu();
	});
```

### Menu dismissal

The resulting UI will be provided by the system, and will follow system conventions for dismissal. No explicit API to dismiss a previously presented menu will be provided. 

### User Activation

A naive implementation of a context menu can both be modal and can steal focus. Therefore, this API will require a non-consuming user activation.

## Alternative Considered Usage

One alternative briefly considered was to expose the users' list of preferred caption styles, their attributes, and all settings directly to web apps through a expansive set of APIs. However, this would dramatically increase the ability of sites to [passively fingerprint](https://www.w3.org/TR/fingerprinting-guidance/#passive) users, and was dismissed as an unacceptable privacy risk.

## References

[^§I.2]: [FCC 24-79, §I.2] https://docs.fcc.gov/public/attachments/FCC-24-79A1.pdf
[^§III.B.1.28]: [FCC 24-79, §III.B.1.28] https://docs.fcc.gov/public/attachments/FCC-24-79A1.pdf
[^§III.B.1.24]: [FCC 24-79, §III.B.1.24] https://docs.fcc.gov/public/attachments/FCC-24-79A1.pdf
[^§III.B.1.26]: [FCC 24-79, §III.B.1.26] https://docs.fcc.gov/public/attachments/FCC-24-79A1.pdf
[^§III.B.1.27]: [FCC 24-79, §III.B.1.27] https://docs.fcc.gov/public/attachments/FCC-24-79A1.pdf
