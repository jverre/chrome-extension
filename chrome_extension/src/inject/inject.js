// Add monkey patch to catch requests
var s = document.createElement('script');
s.src = chrome.extension.getURL("src/inject/interceptRequest.js");
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);

document.addEventListener("extension:company:add", function (e) {
  var callback_id = (new Date()).getTime();
  chrome.runtime.sendMessage({
    type: "extension:company:add",
    data: e.detail.company,
    callback_id: callback_id
  })
});

// Handle callbacks from background script
var callbacks = {};
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  callbacks[request.callback_id](request)
  
  return true
})

// Create observer object used to check company is fetched
var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type == "attributes" && mutation.attributeName == "aria-expanded") {
      var parent = $(mutation.target).closest('.search-results__result-container')[0];
      var button = $(parent).find('.extension-individual-button');
      $(button).removeClass('no-company');
    }
  });
});
var extension_button_int = null
var all_users = [];

function get_user_data(fullname) {
  var raw_data = $('code:contains(metadata)')[0];
  var parsed_data = JSON.parse(raw_data.innerText)['elements'];
  
  var user_data = parsed_data.filter(x => {
    return x.fullName === fullname
  })[0]
  
  var formated_user_data = {
    firstName: user_data['firstName'],
    lastName: user_data['lastName'],
    name: user_data['fullName'],
    company: user_data['currentPositions'][0]['companyName'],
    company_id: user_data['currentPositions'][0]['companyUrn'].split(':').slice(-1)[0],
    position: user_data['currentPositions'][0]['title']
  }
  
  return formated_user_data
}

function get_user_info(person) {
  $person = $(person)
  var name = $person.find('.result-lockup__name a:first').text().trim()
  var company = $person.find('.result-lockup__highlight-keyword a[href^="/sales/"] span:first').text().trim()
  var company_id = $person.find('.result-lockup__highlight-keyword a[href^="/sales/"]').attr('href').split('/')[3]
  var title = $person.find('.result-lockup__highlight-keyword span:first').text().trim()
  let checked = false;
  
  var button = $person.find('.extension-individual-button');
  if (button.length > 0) {
    checked = button.get()[0].classList.value.includes('added')
  }
  
  var res = {
    name,
    company,
    company_id,
    title,
    checked
  }
  
  return res
}

async function add_user(person) {
  var callback_id = (new Date()).getTime();
  var {name, company, company_id, title, checked} = get_user_info(person)
  var {firstName, lastName} = get_user_data(name);
  
  if (checked && name !== "") {
    var user_data = {
      name,
      firstName,
      lastName,
      company,
      company_id,
      title
    }
    
    chrome.runtime.sendMessage({
      type: "extension:users:add",
      data: user_data,
      callback_id: callback_id
    })
    
    callbacks[callback_id] = function(rsp){
      if(rsp.type == 'users:number'){
        $('.extension-button').html(`<b>Send ${rsp.response.value} to CRM</b>`)
      }
    }
  }
}

async function remove_user(person) {
  var {name, company} = get_user_info(person)
  var callback_id = (new Date()).getTime();
  chrome.runtime.sendMessage({
    type: "extension:users:remove",
    data: {name, company},
    callback_id: callback_id
  });
  
  callbacks[callback_id] = function(rsp){
    if(rsp.type == 'users:number'){
      $('.extension-button').html(`<b>Send ${rsp.response.value} to CRM</b>`)
    }
  }
}

function reset_user() {
  all_users = []
  
  $('.search-results__result-item').map(function(){
    var button = $(this).find('.extension-individual-button')
    
    if (button.length > 0) {
      $(button.get(0)).removeClass('added').addClass('no-company').html('Export')
    }
  })
}

async function start_check(){
  var paths = [
    "https://www.linkedin.com/sales/search/people"
  ];

  var url_supported = false;

  for(var path of paths){
    if(window.location.href.indexOf(path) == 0){
      url_supported = true;
    }
  }

  if(!url_supported){
    all_users = [];
    return;
  }
  
  if(!$('.extension-button').length){
    var $button = $('<div/>').addClass('extension-button-wrapper').html('<div class="extension-button"><b>Send 0 to CRM</b></div><div class="extension-button-delete">x</div>');
    
    // Format delete element
    var $button_delete_elem = $($button.find('.extension-button-delete')[0])
    $button_delete_elem.on('click', async function(){
      chrome.storage.local.clear();
      reset_user();
      $('.extension-button').html(`<b>Send 0 to CRM</b>`);
    })
    
    // Format send element
    var $button_elem = $($button.find('.extension-button')[0])
    $button_elem.on('click', async function(){
      var callback_id = (new Date()).getTime();
      callbacks[callback_id] = function(rsp){
        if(rsp.type == 'users:sent'){
          $button_elem.removeClass('loading')

          rsp = rsp.response
          if(rsp.status.code == 200){
            $button_elem.addClass('valid').text('Sent')
            reset_user();
            chrome.storage.local.clear();
          }else{
            console.log('Error sending events')
            $button_elem.addClass('error').text('✕ ' + rsp.status.message)
          }
        }
      }
      
      $button_elem.addClass('valid').text('Sending ..');
      
      setTimeout(function() {
        $button_elem.removeClass('valid');
        $button_elem.html('<b>Send 0 to CRM</b>');
      }, 2000)
      
      chrome.runtime.sendMessage({
        type: "extension:users:send",
        all_users,
        callback_id: callback_id});
    })
    
    var attempt = 0;

    if(extension_button_int){
      clearInterval(extension_button_int)
    }
    
    extension_button_int = setInterval(function(){
      attempt += 1;
      
      if($('.ember-view').length){
        clearInterval(extension_button_int);
        $('.ember-view')[0].prepend($button[0]);
        return;
      }
      
      if(attempt > 50){
        clearInterval(extension_button_int);
      }
    }, 1000);
  }
}

start_check();

function individual_finder_tick(){
  $('.search-results__result-item:not(.extension-init):not(:has(.deferred-area--pending))').each(function(){
    var company_elem = $(this).find('.result-lockup__position-company')[0];
    observer.observe(company_elem, {attributes: true});
    
    $(this).addClass('extension-init')
    var actions = $(this).find('.result-lockup__common-actions')
    
    if(actions.length){
      var $button = $('<div/>').addClass('extension-individual-button no-company').html('Export');
      
      var {name, company} = get_user_info(this)
      user = all_users.filter(x => x.name === name && x.company === company)
      if (user.length > 0) {
        $button.addClass('added').html('Added')
      }
      
      if ($(company_elem).find('a')[0].href.includes('company?keywords')) {
        $button.removeClass('no-company').addClass('not-available')
      }
      
      $button.on('click', function(event) {
        var button = event.target
        var parent = $(button).parent().parent().parent().get()[0]
        
        if (button.classList.value.includes('no-company') || button.classList.value.includes('not-available')) {
          console.log('extension extension: Need to hover over company name')
        } else if (button.classList.value.includes('added')) {
          $(button).removeClass('added').html('Export')
          remove_user(parent)
        } else {
          $(button).addClass('added').html('Added')
          add_user(parent)
        }
      })
      
      actions.append($button)
    }
  })
}

var last_url = window.location.href;

setInterval(function(){
  if(last_url != window.location.href){
    if(extension_button_int){
      clearInterval(extension_button_int)
    }

    setTimeout(function(){
      start_check();
    }, 300);
  }

  last_url = window.location.href;

  individual_finder_tick()
}, 1000);