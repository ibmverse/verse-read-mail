## Verse Read Mail
This sample demonstrations how to integrate the [Watson Text To Speech](https://www.ibm.com/watson/developercloud/text-to-speech.html) with IBM Verse.

### Demo
![](/demo.gif)

### Steps to complete the integration
1. Set up the Tone Analyzer Node.js starter application
  1. Follow instructions posted [here](https://github.com/watson-developer-cloud/text-to-speech-nodejs). Should push the application to Bluemix (E.g. `https://<application-name>.mybluemix.net`).
1. Extend the starter application to perform text to speech for mails being read in Verse
  1. Clone or copy this project
  1. Replace the `views/demo.jsx` and `views/layout.jsx` with the ones from this project
  1. Replace the `public/css/styles.css` with the one from this project
  1. Copy the `public/images/bg-waston-logo.png` from this project and add it into above nodejs project
  1. Repush the application to Bluemix
1. Use Verse Developer Chrome extension to register the sample
  1. Set up the Verse Developer Chrome extension using these [instructions](https://ibmcnxdev.github.io/verse-developer-chrome-ext/tutorials/tutorial_verse_developer.html)
  1. Replace the `applications.json` with the one from this project
  1. Update the url in line 10 with the bluemix application url (e.g. `https://<application-name>.mybluemix.net`)
  1. Reload the extension and reload Verse (with gatekeep &widget-chrome=1)
1. Run the sample
  1. Select a mail and read it in Verse
  1. Open he overflow menu (select '...') and select the 'Read this mail' action
  1. An iframe will be added in mail body (or a window will open) and the mail reading view will be displayed
