$(document).on('click', '#save_api_key', function(event) {
    var api_key = $('#api_key').val()
    chrome.storage.sync.set({api_key: api_key});
    
    $('#save_api_key').text('Saved !');
    
    setTimeout(function() {
        $('#save_api_key').text('Save');
      }, 2000)
})

chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
    chrome.storage.sync.get('api_key', function (res) {
        console.log('api_key =', res.api_key)
        $('#api_key').val(res.api_key);
    });
});