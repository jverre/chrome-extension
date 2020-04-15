# chrome-extension
Chrome Extension to export single search results from LinkedIn Sales Navigator to Hubspot

<img src="https://cloud.githubusercontent.com/assets/yourgif.gif" width="200">

## Installation notes
To install this extension manually, download the repository as a zip and extract it.

Once extracted, you need to install it within Chrome. For this navigate to chrome://extensions/ and turn on developer mode. You can then click on `load_unpacked` and load the folder named `chrome_extension`.

## Using the extension
In order to send data to Hubspot, you will need to create an API key by following the instructions at https://developers.hubspot.com/docs/faq/developer-api-keys. Once the key has be created, add it to the extension by clicking the icon in the address bar.

Once the API key has been set up, you can start using the extension. Just navigate to https://www.linkedin.com/sales/search/people and run a search. For each search result, you will have an export button. In order to be able to export a result, you first need to hover over the company name first. The export button will then turn blue and you be able to add the result to the export queue.

Once you are ready, you can export all the results to hubspot by clicking the `Send x to CRM button`
