# Cryptographic Message Syntax (CMS) API Explainer

Authors: [Jon Choukroun](https://github.com/jonchoukroun), Michael Hashe, Simon Gornall, [Marcos Cáceres](http://github.com/marcoscaceres/).

This explainer presents a straw-person proposal for a Web API that expose Cryptographic Message Syntax (CMS) functionality to JavaScript. Due to the complexity, and ambiguities in the CMS RFC, this API aim is to reduce the need of third-party JavaScript libraries to perform CMS operations (particularly as they relate to email). As such, the proposed APIs provide what we believe to be the bare minimum API surface to sign, encrypt, decrypt, and verify S/MIME messages, in addition to some utility methods for ease-of-use by developers. How user agents implement CMS encoding and the underlying cryptographic operations (including remote key usage) is beyond the scope of this draft.

## Table of contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Cryptographic Message Syntax (CMS) API Explainer](#cryptographic-message-syntax-cms-api-explainer)
  - [Table of contents](#table-of-contents)
  - [Extensions to the Crypto interface](#extensions-to-the-crypto-interface)
  - [The `CMSEnvelopedData` interface](#the-cmsenvelopeddata-interface)
  - [Encrypting](#encrypting)
  - [Decrypting](#decrypting)
  - [Signing](#signing)
  - [Verifying](#verifying)
  - [Common CMS Types](#common-cms-types)
    - [Content Type](#content-type)
    - [Key Handles](#key-handles)
  - [CMS Utilities](#cms-utilities)
    - [Parsing S/MIME](#parsing-smime)
  - [Examples](#examples)
    - [Processing a received message that was signed-encrypted-signed](#processing-a-received-message-that-was-signed-encrypted-signed)
    - [Signing, encrypting, and signing a message](#signing-encrypting-and-signing-a-message)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Extensions to the Crypto interface

As the API closely mirrors the existing Web Crypto “subtle” functionality, we propose extending the `Crypto` interface to add a `cms` attribute which would expose the needed “CMS” functionality.

```WebIDL
// Extend the Crypto interface to include the cms property
partial interface Crypto {
    [SameObject]
    readonly attribute CMSCrypto cms;
};

[Exposed=(Window, Worker), SecureContext]
interface CMSCrypto {
    // Methods defined below as partial interfaces
};
```

## The `CMSEnvelopedData` interface

```WebIDL
interface CMSEnvelopedData {
    readonly attribute CMSContentType contentType;
    readonly attribute ContentEncryptionAlgorithm contentEncryptionAlgorithm;
    readonly attribute ArrayBuffer encryptedContent;
    readonly attribute FrozenArray<RecipientInfo> recipientInfos;
};
```

## Encrypting

The `encrypt()` method would allow the web application to encrypt content with the public key(s) of one or more recipients. The API requires an algorithm specifier for both content encryption (symmetric) and key encryption (asymmetric), which must both be supported by the underlying CMS implementation. Recipient key identifiers must be valid.

```WebIDL
partial interface CMSCrypto {
    Promise<CMSEnvelopedData> encrypt(
      ContentEncryptionAlgorithm contentEncryptionAlgorithm,
      KeyEncryptionAlgorithm keyEncryptionAlgorithm,
      sequence<CryptoKeys> recipientKeys,
      ArrayBuffer data
    );
};
```

- `contentEncryptionAlgorithm`: The algorithm used to encrypt the content. This parameter specifies the content encryption algorithm identifier, which determines how the data (content) will be symmetrically encrypted.
- `keyEncryptionAlgorithm`: The algorithm used to encrypt the symmetric keys. This specifies the key encryption algorithm identifier, which is used to encrypt the symmetric key(s) that were used to encrypt the content. Each recipient's public key is used in conjunction with this algorithm to encrypt the symmetric key, ensuring that only the intended recipients can decrypt the content.
- recipientKeys: An array of `CryptoKey` objects that point to recipients' public keys, which will be used to assymetrically encrypt the generated symmetric key(s). Each `CryptoKey` in the array corresponds to a specific recipient, allowing for the encrypted content to be securely shared with multiple recipients. How the underlying implementation matches a key handle to public key material is a user-agent implementation detail, and out of scope for this draft.
- `data`: The cleartext data to encrypt. This parameter is the actual data (in the form of an `ArrayBuffer`) to be encrypted. The data is symmetrically encrypted using the specified content encryption algorithm, and the result is included in the CMS Enveloped Data structure that the method returns.

The CMS implementation will follow the [content-encryption](https://datatracker.ietf.org/doc/html/rfc5652#section-6.3) and [key-encryption](https://datatracker.ietf.org/doc/html/rfc5652#section-6.4) processes, then wrap the outputs into an enveloped-data as a `CMSEnvelopedData` instance. The encrypted content should be in MIME canonical format.

The CMS spec defines other encryption syntaxes, which are beyond the scope of this document.

## Decrypting

The `decrypt()` method provides a way for web applications to decrypt content that has been encrypted using the Cryptographic Message Syntax (CMS) Enveloped-Data content type. This method allows for the decryption of data using a handle to the user's private key, facilitating secure communication and data exchange in web applications.

```WebIDL
partial interface CMSCrypto {
    Promise<ArrayBuffer> decrypt(CryptoKey privateKey, CMSEnvelopedData data);
};
```

Web applications can pass in a parsed CMS enveloped-data type, and a `CryptoKey` object of the user’s private decryption key, to get back the decrypted cleartext as an array of bytes. The message contents or specific S/MIME parts should be parsed using the `parseSMIME()`. Then the output can be passed into this API for decryption.

To successfully decrypt the data, the CMS implementation must get the encrypted content-encryption key from the matching `RecipientInfo` entry. After decrypting this symmetric key using the user’s private asymmetric `CryptoKey` object, the implementation can then decrypt the encrypted content. This cleartext byte array can be converted to a string, then further parsed into a CMS data object if necessary.

## Signing

The `.sign()` method in the `CMSCrypto` interface simplifies the creation of a digital signature for given data. This single API call performs hashing of the data using a specified digest algorithm, followed by signing that hash with a specified signature algorithm. The process culminates in the generation of a CMS signed-data object, which encapsulates the signature, signer information, and the original content.

A successful response will resolve to a CMS signed-data object (`CMSSignedData`), which contains the signature, signer data (including certificates), and the content that was signed.

```WebIDL
partial interface CMSCrypto {
    Promise<CMSSignedData> sign(DigestAlgorithm digestAlgorithm,
                                SignatureAlgorithm signAlgorithm,
                                CryptoKey signingKey,
                                ArrayBuffer data);
};

interface CMSSignedData {
  readonly attribute CMSContentType contentType;
  readonly attribute ArrayBuffer content;
  // Should include all SignerInfo.digestAlgorithms
  readonly attribute FrozenArray<DigestAlgorithm> digestAlgorithms;
  readonly attribute FrozenArray<X509Certificate>;
  // One for each signer
  readonly attribute FrozenArray<SignerInfo> signerInfos;
}

interface SignerInfo {
  // Must reference a certificate in the CMSSignedDataType.certificates list
  // See [Signer Info Type (RFC 5652)](https://datatracker.ietf.org/doc/html/rfc5652#section-5.3) for more details
  readonly attrbiute SignatureIdentifier signerId;
  readonly attrbiute DigestAlgorithm digestAlgorithm;
  readonly attrbiute SignatureAlgorithm signatureAlgorithm;
  readonly attrbiute ArrayBuffer signature;
}
```

## Verifying

The `.verify()` method is designed to validate the integrity and authenticity of a CMS signed-data object. By analyzing the signed content and the signer's certificate contained within, the method validates the signature and that the content has not been altered. This verification process is crucial for establishing trust in the data received.

```WebIDL
enum VerificationStatus {"pass", "permerror", "neutral", "none"};

partial interface CMSCrypto {
  Promise<VerificationStatus> verify(CMSSignedData signedData);
};

```

## Common CMS Types

### Content Type

Identifies the CMS type of a given object. This can be an OID or other implementation, TBD.

### Key Handles

We are making a parallel proposal to extend the [Proposed "remote" `CryptoKey` interface](https://github.com/WebKit/explainers/tree/main/remote-cryptokeys), to support remote key use. This will allow CMS operations to use a pointer to a key that is securely stored on the user’s device, for example in Keychain. The expectation is that the CMS implementation would use the underlying cryptographic operations called by Web Crypto, using the remote `CryptoKey` handle.

## CMS Utilities

### Parsing S/MIME

This API allows the web application to pass in one or more S/MIME parts and get back an array of CMS data objects. The array can contain any CMS data type . The data objects can be passed into CMS APIs to verify, decrypt, and so on.

```
partial interface CMSCrypto {
  Promise<sequence<CMSData>> parseSMIME(sequence<ArrayBuffer> parts);
};

typedef (CMSEnvelopedData or CMSSignedData) CMSData;
```

## Examples

### Processing a received message that was signed-encrypted-signed

```JS
const { generateKey } = window.crypto.subtle;
const { cms } = window.crypto;
  /**
   * Processes a received message that was signed-encrypted-signed.
   * Assumes message is already converted to an ArrayBuffer.
   * @async
   * @returns {Promise<ArrayBuffer[]>} Processed message parts
   */
async function processMessage() {
  const msg = readMessageIntoBuffer();
  const cmsData = await cms.parseSMIME([msg]);

  const processedData = cmsData.map(async (part) => {
    let content;

    try {
      switch (part.contentType) {
        case ENVELOPED_DATA_TYPE:
          const clearText = await processEncryptedData(part);

          // Assuming there's a nested signature
          const innerSig = await cms.parseSMIME([clearText]);
          // Throws
          await cms.verify(innerSig[0]); // Assuming verify() and first part only
          content = innerSig[0].content;
          break;

        case SIGNED_DATA_TYPE:
          // Throws
          await cms.verify(part);
          content = part.content;
          break;

        default:
          throw new Error("Unsupported content type");
      }
    } catch (error) {
      console.error(
        "Verification failed or unsupported content type:",
        error
      );
      throw error; // Rethrow or handle as needed
    }

    return content;
  });

  return Promise.all(processedData);
};

async function processEncryptedData(envelopedData: CMSEnvelopedData) {
  // Get a pointer to the remote decryption key
  const decryptKey = await window.crypto.subtle.generateKey(
    {
      name: "remote",
      action: "fetch",
      userIdentifier: "alice@icloud.com",
    },
    false,
    ["decrypt"]
  );
  const dataBuf = await cms.decrypt(decryptKey, envelopedData);
  return dataBuf;
}
```

### Signing, encrypting, and signing a message

```JS
const { generateKey } = window.crypto.subtle;
const { cms } = window.crypto;

async function composeSESMessage() {
  // Message content, assembled into MIME parts and read into an ArrayBuffer
  const msgParts = assembleMimeParts();
  const msgBuf = convertToBuffer(msgParts);

  // Recipients
  const recipients = ["alice@example.com", "bob@example.com"];

  // Sign contents (only 1 signer)
  const [innerSignature] = await handleSigning(msgBuf);

  // Wrap contents and signature into multipart/signed MIME part
  const signedMsg = createSignedMime(msgParts, innerSignature);
  const signedMsgBuf = convertToBuffer(signedMsg);

  // Encrypt contents + inner signaure
  const { encryptedContent } = await handleEncryption(signedMsgBuf, recipients);

  // Create encrypted MIME part
  const encryptedMsg = createEncryptedMime(encryptedContent);
  const encryptedMsgBuf = convertToBuffer(encryptedMsg);

  // Sign encrypted contents
  const [outerSignature] = await handleSigning(encryptedMsgBuf);

  // Wrap encrypted content and outer signature in MIME part
  return createSignedMime(encryptedMsg, outerSignature);
}

async function handleSigning(data: ArrayBuffer) {
  // Get a pointer to the remote signing key
  const signerKey = await window.crypto.subtle.generateKey(
    {
      name: "remote",
      action: "fetch",
      userIdentifier: "alice@icloud.com",
    },
    false,
    ["sign"]
  );

  // Define required algorithms
  const digestAlgo = "SHA-256";
  const signAlgo = {
    name: "RSA-PSS",
    saltLength: someNumber,
  };

  // Sign and return signatures as array
  const signedData = await cms.signData(digestAlgo, signAlgo, signerKey, data);
  return signedData.signerInfos.map((s) => s.signature);
}

// Assumes a remote key handle accessor based on recipient email addresses
async function handleEncryption(data, recipients) {
  // Get recipient key handles, can use remote key interface
  const recipientKeys = recipients
    .map(fetchRecipientKey)
    .map(async (recipientEmail) => {
      return await window.crypto.subtle.generateKey(
        {
          name: "remote",
          action: "fetch",
          userIdentifier: recipientEmail,
        },
        // False is required, even for public keys
        false,
        ["encrypt"]
      );
    });

  // Define required algorithms
  const contentAlgo = {
    name: "AES-CTR",
    counter: Uint8Array,
    length: someNumber,
  };
  const keyAlgo = {
    name: "ECDSA",
    hash: { name: someString }, // eg: SHA-384
  };

  // Encrypt
  const envelopedData = await cms.encrypt(
    contentAlgo,
    keyAlgo,
    recipientKeys,
    data
  );

  // Confirm recipientInfos length matches recipient count
  if (envelopedData.recipientInfos.length !== recipients.length) {
    // error handling
  }

  return envelopedData.encryptedContent;
}
```
