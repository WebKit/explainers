## Private-Token Permissions Policy and Fetch Integration

### Motivation

PrivacyPass, as developed in the [IETF PrivacyPass Working Group](https://datatracker.ietf.org/wg/privacypass/about/), defines a system through which a client [can obtain a cryptographic token from an issuer](https://datatracker.ietf.org/doc/draft-ietf-privacypass-protocol/) and then provide a modified version of that token to an origin for redemption in such a way that the two tokens are unlinkable. This system requires some level of trust between the pairs of: web site origin and issuer, client and issuer, and client and the end user.

In the context of web page loading and web app operations, PrivacyPass adoption is increasing. In the first-party context, its usage is akin to first-party cookies and it can be controlled with similar mechanisms. However, more care is needed in third-party contexts because these tokens can be used for covert tracking purposes if protections are not properly defined, similar to third-party cookies.

### Overview

This proposal builds on top of the [HTTP Authorization scheme](https://datatracker.ietf.org/doc/draft-ietf-privacypass-auth-scheme/). In that protocol, a client sends a HTTP request to a web site origin, and the web site origin’s HTTP response may contain a `WWW-Authenticate` header with the `PrivateToken` scheme and metadata describing how to produce a valid private token. The metadata includes a challenge message and the chosen token issuer’s public key. The challenge message declares from which issuer the client should receive tokens.

If the client is not able to complete, or chooses not to complete, the token issuance protocol, then it should continue processing the original response as if authorization failed. Otherwise, the client may have cached tokens available, and it may respond using one of those tokens. If the client decides to request new tokens from the issuer, then it follows the [Privacy Pass Issuance Protocol](https://datatracker.ietf.org/doc/html/draft-ietf-privacypass-protocol/) where the client and issuer communicate and create unlinkable tokens.

If the client successfully completes the issuance protocol, or they have cached tokens available, then the client can re-send the initial HTTP request to the web site URL containing an `Authorization` header with the `PrivateToken` scheme and a PrivacyPass token. On receiving the token, the web site origin must verify the tokens validity, as defined in the relevant section of the Issuance Protocol. If the token is valid, then the web site origin trusts that the issuer believes the client passes any required verification checks.

This flow works naturally in the first-party context where first-party cookies are supported. In the third-party context (e.g., within a cross-origin iframe), we need a way to control which iframes are allowed to engage in this process. To that end, this document defines and describes the behavior of a new [Permissions Policy](https://www.w3.org/TR/permissions-policy/) policy-controlled feature identified as “private-token”.

### Permissions Policy Usage

This explainer defines the [Permissions Policy](https://www.w3.org/TR/permissions-policy/) policy-controlled feature identified as `private-token`. The default allowlist is `‘self’`.

When the top-level document’s origin (e.g., ‘self’) or an iframe’s document’s origin is contained in the Permissions Policy allowlist, then HTTP requests from that context may engage in the previously described authorization flow.

### Fetch Integration

A Fetch Request’s credentials mode must be either `same-origin` or `include`.

##### Monkeypatching Fetch

Non-behavioral change:

* Define `AuthenticationMethod` as:
    * enum AuthenticationMethod { “usernameAndPassword” }
* Define `AuthenticationInfo` as a struct with members:
    * `authenticationMethod` an `AuthenticationMethod`
    * `authenticationValue` a string (empty string by default)
* Modify [HTTP-network-or-cache-fetch](https://fetch.spec.whatwg.org/#http-network-or-cache-fetch) by deleting `isAuthenticationFetch` as the second parameter and adding an optional `AuthenticationInfo` `authenticationInfo` (default null) as the second parameter.
* Modify step 8.21.3 by substituting `and isAuthenticationFetch is true` with `and authenticationInfo is not null and authenticationInfo’s authenticationMethod is "usernameAndPassword“`
* Modify step 14.3 by replacing `or isAuthenticationFetch is true` with `or authenticationInfo is not null and authenticationInfo’s authenticationMethod is "usernameAndPassword“`
* Modify step 16.2 by substituting `isAuthenticationFetch` with `authenticationInfo`
* Modify step 17 by substituting `isAuthenticationFetch is true` with `authenticationInfo is not null and authenticationInfo’s authenticationMethod is ”usernameAndPassword“`

Behavioral change:

* Add `privateToken` as a value of `enum AuthenticationMethod`
* Define `PrivateTokenCache` as a map (String → Set)
* Define: To `"validate a PrivateToken challenge"`, given headers:
    * return the result of validating the challenge given headers [draft-ietf-privacypass-auth-scheme, section 2.1]
* Define: To `“Obtain a PrivateToken”`, given a request `request` and `headers` (a set of strings):
    * Let `key` be the result of `“determining the network partition key”` given `request`
    * If `key` is null, then return “”
    * Let `tokenCache` be `PrivateTokenCache`[`key`]
    * return the result of executing token redemption, given `headers` and `tokenCache`
* Modify HTTP-network-or-cache-fetch, insert new step after 8.21.1:
    * If `authenticationInfo` is not null and `authenticationInfo`’s `authenticationMethod` is `“privateToken”`, then:
        * Set `authorizationValue` as `authenticationInfo`’s `authorizationValue`
* Modify step 8.21.2 by prepending the step with `“Otherwise, ”`
* Insert step before 14.3: 
    * If response contains a `WWW-Authenticate` header with a `“PrivateToken”` scheme, then:
        * Let `headers` be the set of all `WWW-Authenticate` headers with a `“PrivateToken”` scheme
        * Let `validated` be the result of `“validating the challenge”` given headers 
        * If `validated` is `true` and `request`’s `headerList` does not contains `“Authorization”`, then:
            * Let `authorizationValue` be the result of `“Obtain a PrivateToken”`, given `request` and `headers`
            * If `authorizationValue` is not the empty string, then:
                * Set `authenticationInfo`’s `authorizationValue` to the value of `authorizationValue`
                * Set `authenticationInfo`’s `authenticationMethod` to `“privateToken”`
* Insert step after 14.3.1:
    * If `authenticationInfo` is null, then:
        * Set `authenticationInfo`’s `authenticationMethod` to `“usernameAndPassword”`


TODO: Permission Policy integration to enable this for cross-origin documents.
