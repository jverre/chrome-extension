chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
  var api_key = await chrome.storage.sync.get('api_key');
  console.log(request);
  
  if (request.type == "extension:users:add") {
    var user = request.data;
    
    var user_obj = await chrome.storage.local.get('users');
    users = user_obj ? user_obj.users || {} : {};
    users[user.name] = user;
    
    await chrome.storage.local.set({'users': users});
    chrome.tabs.sendMessage(sender.tab.id, {
        type: "users:number",
        response: {'value': Object.keys(users).length},
        callback_id: request.callback_id
    })
    
  } else if (request.type == "extension:users:remove") {
    var user = request.data;
    var user_obj = await chrome.storage.local.get('users');
    var users = user_obj.users;
    users[user.name] = undefined;
    await chrome.storage.local.set({'users': users});
    
    chrome.tabs.sendMessage(sender.tab.id, {
      type: "users:number",
      response: {'value': Object.keys(users).length > 1 ? Object.keys(users).length - 1 : 0},
      callback_id: request.callback_id
    })
  
  } else if (request.type == "extension:users:send"){
    // Format data
    var user_obj = await chrome.storage.local.get('users');
    var all_users = Object.values(user_obj.users);
    var companies_obj = await chrome.storage.local.get('companies');
    var companies = companies_obj.companies;
    
    // const url = `https://api.hubapi.com/contacts/v1/contact/batch/?hapikey=${api_key.api_key}`
    // //const res = await fetch(url, {method: 'PUT', body: all_users});
    // console.log(res)
    
    // Create companies
    var company_mappings = {}
    
    await Promise.all(all_users.map( async (x) => {
      // Get company
      var company_id = x['company_id'];
      var company = companies[company_id] || {"domain": null, "company_id": null};
      var domain = company.website;
      
      // Create company using just the domain
      var company_url = `https://api.hubapi.com/companies/v2/companies?hapikey=${api_key.api_key}`
      var headers = new Headers();
      headers.append('Content-Type', 'application/json');
      var body = {
        "properties": [
          {
            "name": "domain",
            "value": company.website
          },
          {
            "name": "company_id",
            "value": company.company_id
          }
        ]
      }
      
      const res_company = await fetch(company_url, {headers: headers, method: 'POST', body: JSON.stringify(body)});
      //const hubspot_company_id = res.body.companyId;
      
      //
      var user_url = `https://api.hubapi.com/crm/v3/objects/contacts/?hapikey=${api_key.api_key}`
      var user_body = {
        "properties": {
            "firstname": x.firstName,
            "lastname": x.lastName,
            "company": x.company,
            "jobtitle": x.title,
            "website": company.website
          }
      }
      
      const res_user = await fetch(user_url, {headers: headers, method: 'POST', body: JSON.stringify(user_body)});
      console.log(res_user.body)
    }))
    
    console.log(`company_mappings = ${company_mappings}`);
    
    chrome.tabs.sendMessage(sender.tab.id, { 
        type: "users:sent",
        response: {'status': {'code': 200}},
        callback_id: request.callback_id
    })
    
    // console.log('all_users =', all_users)
    // var api_key = await chrome.storage.sync.get('api_key');
    
    // // Check for existing companies
    // var query = all_users.map( x => `company_id:"${x['company_id']}"`).join(' or ')
    // var url = 'https://api.close.com/api/v1/lead/?query=' + encodeURIComponent(query)
    
    // var headers = new Headers();
    // headers.append('Authorization', 'Basic ' + btoa(api_key.api_key + ':'));
    // var response = await fetch(url, {headers: headers})
    // var res = JSON.parse(await response.text()).data
    
    // Update existing leads
    // await Promise.all(res.map( async (crm_user) => {
    //   var lead_id = crm_user.id
      
    //   // Fetch users for company_id
    //   var user = all_users.filter( user => user.company_id === crm_user.custom.company_id)
    //   all_users = all_users.filter( user => user.company_id !== crm_user.custom.company_id)
      
    //   // Update contacts
    //   var contacts = user.reduce( (res, x) => {
    //     if (crm_user.contacts.map(x => x.name).includes(x.name)) {
    //       console.log(`user = ${x.name} already exists`)
    //     } else {
    //       res.push({
    //         display_name: x.name,
    //         name: x.name,
    //         title: x.title
    //       })
    //     }
        
    //     return res
    //   }, crm_user.contacts)
      
  //     // Push contacts
  //     var url = `https://api.close.com/api/v1/lead/${lead_id}`
  //     var headers = new Headers();
  //     headers.append('Authorization', 'Basic ' + btoa(api_key.api_key + ':'));
  //     headers.append('Content-Type', 'application/json')
  //     body = JSON.stringify({contacts})
      
  //     await fetch(url, {method: 'PUT', headers: headers, body: body});
  //   }))
    
  //   // Create Leads
  //   var create_leads = all_users.reduce( (res, user) => {
  //     var company_id = user.company_id;
      
  //     var contacts = res.company_id  ? res.company_id.contacts : [];
  //     contacts.push({
  //       name: user.name,
  //       title: user.title
  //     })
        
  //     res[company_id] = {
  //       status_id: 'stat_xPVfuehiAimJKelVrZVrAkKPG1ys0xFIRYypLEboMtf',
  //       contacts: contacts,
  //       name: user.company,
  //       'custom.lcf_ZDAiuVNGM4zlvfhJ3F0DrT9BEXw921TWVLEElvutlN7': company_id
  //     }
      
  //     return res
  //   }, {})
    
  //   await Object.values(create_leads).map( async (x) => {
  //     var url = `https://api.close.com/api/v1/lead/`
  //     var headers = new Headers();
  //     headers.append('Authorization', 'Basic ' + btoa(api_key.api_key + ':'));
  //     headers.append('Content-Type', 'application/json')
  //     body = JSON.stringify(x)
    
  //     await fetch(url, {method: 'POST', headers: headers, body: body});
  //   })
    
  //   // Pass the fact that they have been updated
  //   chrome.tabs.sendMessage(sender.tab.id, { 
  //     type: "users:sent",
  //     response: {'status': {'code': 200}},
  //     callback_id: request.callback_id
  //   })
  } else if (request.type == "extension:company:add") {
    company = request.data;
    console.log(request)
    company_obj = await chrome.storage.local.get('companies');
    coompanies = company_obj ? company_obj.companies || {} : {};
    coompanies[company.company_id] = company;
    await chrome.storage.local.set({'companies': coompanies});
  }
});